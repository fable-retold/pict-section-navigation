const libPictProvider = require('pict-provider');

const libViewHub = require('../views/PictView-Navigation-Hub.js');
const libViewSidebar = require('../views/PictView-Navigation-Sidebar.js');
const libViewPalette = require('../views/PictView-Navigation-Palette.js');
const libViewList = require('../views/PictView-Navigation-List.js');

/** @type {Record<string, any>} */
const _DEFAULT_PROVIDER_CONFIGURATION =
{
	ProviderIdentifier: 'Pict-Navigation',

	AutoInitialize: true,
	AutoInitializeOrdinal: 0,

	// Where the navigation state lives in AppData (graph + transient query/active state).
	StateAddress: 'PictNavigation',

	// The navigation graph (a JSON tree of category/item nodes). May also be supplied
	// later via setNavigationGraph(). See the README for the node shape.
	NavigationGraph: [],

	// Optional host navigation handler: OnNavigate(pNode) is called when an item is
	// activated. When absent, navigate() falls back to setting window.location.hash for
	// hash-style routes.
	OnNavigate: null
};

/**
 * Navigation Provider
 *
 * Owns the navigation graph (a JSON tree of categories and items) and all the
 * search / filter / activate logic the render-type views share. Registers the
 * four render-type views (hub, sidebar, palette, list) so a single addProvider()
 * gives you everything; each view reads this provider by hash.
 */
class PictNavigationProvider extends libPictProvider
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, _DEFAULT_PROVIDER_CONFIGURATION, pOptions);
		super(pFable, tmpOptions, pServiceHash);

		/** @type {any} */
		this.pict;
		/** @type {Record<string, any>} */
		this.options;

		// Optional host navigation handler.
		this.onNavigate = (typeof this.options.OnNavigate === 'function') ? this.options.OnNavigate : null;

		// Initialize state (graph + transient query/active) in AppData.
		const tmpState = this._state();
		tmpState.Graph = this._normalizeNodes(Array.isArray(this.options.NavigationGraph) ? this.options.NavigationGraph : [], '');
		if (typeof tmpState.Query !== 'string') tmpState.Query = '';
		if (typeof tmpState.ShowAdvanced !== 'boolean') tmpState.ShowAdvanced = false;
		if (typeof tmpState.ActiveHash === 'undefined') tmpState.ActiveHash = null;

		// Register the render-type views (idempotent singletons).
		this.pict.addViewSingleton('Navigation-Hub', libViewHub.default_configuration, libViewHub);
		this.pict.addViewSingleton('Navigation-Sidebar', libViewSidebar.default_configuration, libViewSidebar);
		this.pict.addViewSingleton('Navigation-Palette', libViewPalette.default_configuration, libViewPalette);
		this.pict.addViewSingleton('Navigation-List', libViewList.default_configuration, libViewList);

		// A dedicated palette instance for the ⌘K launcher overlay — its own local query
		// (so quick-jumping never disturbs a docked sidebar) rendered into the overlay card.
		this.pict.addViewSingleton('Navigation-Launcher', Object.assign({}, libViewPalette.default_configuration,
			{
				ViewIdentifier: 'Navigation-Launcher',
				NavigationProviderHash: this.options.ProviderIdentifier,
				UseLocalQuery: true,
				ShowFooter: true,
				SearchPlaceholder: 'Jump to anywhere…  (type to search)',
				DefaultDestinationAddress: '#PictNavLauncher-Card',
				Renderables:
				[
					{ RenderableHash: 'Navigation-Palette-Wrap', TemplateHash: 'Navigation-Palette-Container', DestinationAddress: '#PictNavLauncher-Card', RenderType: 'replace' }
				]
			}), libViewPalette);

		// Launcher overlay state.
		this._launcherOpen = false;
		this._hotkeyBound = false;
		this._hotkeyUnbind = null;

		// Optional global item filter — a host gate (e.g. session visibility) applied to
		// EVERY render (lists, sidebar, launcher), on top of any per-call Scope/Filter.
		this._globalFilter = null;

		// Shared CSS for all render types (themeable via --theme-color-* with fallbacks).
		if (this.pict.CSSMap && typeof this.pict.CSSMap.addCSS === 'function')
		{
			this.pict.CSSMap.addCSS('Pict-Navigation-Shared-CSS', PictNavigationProvider.SharedCSS, 500);
		}
	}

	// ── Render-type metadata ───────────────────────────────────────────────────

	/**
	 * The render types this provider can produce, in display order. Each entry is
	 * { Key, Label, Layout, Icon, Blurb }. Layout is 'page' (renders as a home screen)
	 * or 'rail' (a persistent docked sidebar). Hosts build their style chooser from this
	 * rather than hard-coding the list.
	 *
	 * @returns {Array<{Key:string, Label:string, Layout:string, Icon:string, Blurb:string}>}
	 */
	getRenderTypes()
	{
		return PictNavigationProvider.RenderTypes.map((pType) => Object.assign({}, pType));
	}

	/** 'page' (home screen) or 'rail' (persistent docked sidebar) for a render type. */
	getRenderTypeLayout(pRenderType)
	{
		const tmpType = PictNavigationProvider.RenderTypes.find((pType) => pType.Key === pRenderType);
		return tmpType ? tmpType.Layout : 'page';
	}

	/** True when the render type is a persistent docked sidebar rather than a home screen. */
	isRailRenderType(pRenderType)
	{
		return this.getRenderTypeLayout(pRenderType) === 'rail';
	}

	/** The navigation state object in AppData. */
	_state()
	{
		const tmpAddress = this.options.StateAddress || 'PictNavigation';
		if (!this.pict.AppData[tmpAddress] || typeof this.pict.AppData[tmpAddress] !== 'object')
		{
			this.pict.AppData[tmpAddress] = {};
		}
		return this.pict.AppData[tmpAddress];
	}

	// ── Graph ────────────────────────────────────────────────────────────────

	/**
	 * Replace the navigation graph. Accepts an array of category nodes; each node may
	 * carry { Hash, Name, Description, Blurb, Icon, Accent, Route, Keywords, Advanced,
	 * Secondary, Children }. The tree is normalized (every node gets a Hash; Children
	 * defaults to []).
	 *
	 * @param {Array<Object>} pGraph
	 */
	setNavigationGraph(pGraph)
	{
		this._state().Graph = this._normalizeNodes(Array.isArray(pGraph) ? pGraph : [], '');
		return this.getNavigationGraph();
	}

	/** @returns {Array<Object>} the normalized navigation graph. */
	getNavigationGraph()
	{
		return this._state().Graph || [];
	}

	_normalizeNodes(pNodes, pParentHash)
	{
		const tmpResult = [];
		for (let i = 0; i < pNodes.length; i++)
		{
			const tmpNode = Object.assign({}, pNodes[i]);
			if (!tmpNode.Hash)
			{
				tmpNode.Hash = (pParentHash ? (pParentHash + '.') : '') + this.slugify(tmpNode.Name || ('node-' + i));
			}
			tmpNode.Children = this._normalizeNodes(Array.isArray(tmpNode.Children) ? tmpNode.Children : [], tmpNode.Hash);
			tmpNode.IsLeaf = (tmpNode.Children.length === 0);
			tmpResult.push(tmpNode);
		}
		return tmpResult;
	}

	slugify(pName)
	{
		return String(pName == null ? '' : pName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	}

	// ── Query / state ────────────────────────────────────────────────────────

	setQuery(pQuery) { this._state().Query = String(pQuery == null ? '' : pQuery); return this; }
	getQuery() { return this._state().Query || ''; }

	setShowAdvanced(pShow) { this._state().ShowAdvanced = !!pShow; return this; }
	getShowAdvanced() { return !!this._state().ShowAdvanced; }

	/**
	 * Set (or clear with null) a global item-visibility filter applied to every render —
	 * lists, the docked sidebar, and the launcher. A predicate (item, category) => boolean;
	 * items returning false are hidden everywhere. Use for session/role-based gating.
	 */
	setGlobalFilter(pFilter) { this._globalFilter = (typeof pFilter === 'function') ? pFilter : null; return this; }
	getGlobalFilter() { return this._globalFilter; }

	setActive(pHash) { this._state().ActiveHash = pHash || null; return this; }
	getActive() { return this._state().ActiveHash || null; }

	/** Find a node anywhere in the tree by Hash. */
	getNodeByHash(pHash)
	{
		let tmpFound = null;
		const fWalk = (pNodes) =>
		{
			for (let i = 0; i < pNodes.length && !tmpFound; i++)
			{
				if (pNodes[i].Hash === pHash) { tmpFound = pNodes[i]; return; }
				fWalk(pNodes[i].Children || []);
			}
		};
		fWalk(this.getNavigationGraph());
		return tmpFound;
	}

	/** Find a leaf node whose Route matches pRoute (leading '#' ignored on both sides). */
	getNodeByRoute(pRoute)
	{
		if (!pRoute) return null;
		const fNormalize = (pValue) => String(pValue == null ? '' : pValue).replace(/^#/, '');
		const tmpTarget = fNormalize(pRoute);
		if (!tmpTarget) return null;
		let tmpFound = null;
		const fWalk = (pNodes) =>
		{
			for (let i = 0; i < pNodes.length && !tmpFound; i++)
			{
				if (pNodes[i].Route && fNormalize(pNodes[i].Route) === tmpTarget) { tmpFound = pNodes[i]; return; }
				fWalk(pNodes[i].Children || []);
			}
		};
		fWalk(this.getNavigationGraph());
		return tmpFound;
	}

	/** Mark the node matching pRoute active (or clear active if none matches). Returns the node. */
	setActiveByRoute(pRoute)
	{
		const tmpNode = this.getNodeByRoute(pRoute);
		this.setActive(tmpNode ? tmpNode.Hash : null);
		return tmpNode;
	}

	// ── Search / filter ──────────────────────────────────────────────────────

	/** Every whitespace-separated token of the (lowercased) query must appear in the node's text. */
	matchesNode(pNode, pQuery)
	{
		if (!pQuery) return true;
		const tmpHay = ((pNode.Name || '') + ' ' + (pNode.Description || '') + ' ' + (pNode.Keywords || '')).toLowerCase();
		return pQuery.split(/\s+/).filter(Boolean).every((pTok) => tmpHay.indexOf(pTok) >= 0);
	}

	/**
	 * Categories (top-level nodes) with their leaf items filtered by the current — or
	 * supplied — query + showAdvanced. Advanced items are hidden while browsing but an
	 * active query reveals matching ones. Empty categories are dropped. This is the
	 * primary data source for the hub / sidebar / list views.
	 *
	 * Pass `Scope` (an array of category hashes) to pre-filter to a subset of the graph —
	 * the basis for topic / pre-filtered nav pages. Pass `Filter` (a predicate
	 * (item, category) => boolean) to gate individual items (e.g. session-based visibility).
	 *
	 * @param {{Query?: string, ShowAdvanced?: boolean, Scope?: Array<string>, Filter?: Function}} [pOptions]
	 * @returns {Array<Object>} [ { ...category, Items: [filtered children] } ]
	 */
	getFilteredCategories(pOptions)
	{
		const tmpOptions = pOptions || {};
		const tmpQuery = (typeof tmpOptions.Query === 'string' ? tmpOptions.Query : this.getQuery()).trim().toLowerCase();
		const tmpShowAdvanced = (typeof tmpOptions.ShowAdvanced === 'boolean') ? tmpOptions.ShowAdvanced : this.getShowAdvanced();
		const tmpScope = Array.isArray(tmpOptions.Scope) ? tmpOptions.Scope : null;
		const tmpFilter = (typeof tmpOptions.Filter === 'function') ? tmpOptions.Filter : null;
		const tmpGlobalFilter = this._globalFilter;

		const tmpResult = [];
		this.getNavigationGraph().forEach((pCategory) =>
		{
			if (tmpScope && tmpScope.indexOf(pCategory.Hash) < 0) return;
			const tmpItems = (pCategory.Children || []).filter((pItem) =>
				(!tmpGlobalFilter || tmpGlobalFilter(pItem, pCategory)) &&
				(!tmpFilter || tmpFilter(pItem, pCategory)) &&
				(tmpShowAdvanced || !pItem.Advanced || (tmpQuery && this.matchesNode(pItem, tmpQuery))) &&
				this.matchesNode(pItem, tmpQuery));
			if (tmpItems.length === 0) return;
			tmpResult.push(Object.assign({}, pCategory, { Items: tmpItems }));
		});
		return tmpResult;
	}

	/**
	 * A flat, query-filtered list of leaf items across all categories (advanced included
	 * once a query is present). Used by the command-palette view.
	 *
	 * Pass `Scope` / `Filter` (same semantics as getFilteredCategories) to pre-filter.
	 *
	 * @param {string} [pQuery]
	 * @param {{Scope?: Array<string>, Filter?: Function}} [pOptions]
	 * @returns {Array<{Item: Object, Category: Object}>}
	 */
	searchFlat(pQuery, pOptions)
	{
		const tmpOptions = pOptions || {};
		const tmpQuery = (typeof pQuery === 'string' ? pQuery : this.getQuery()).trim().toLowerCase();
		const tmpScope = Array.isArray(tmpOptions.Scope) ? tmpOptions.Scope : null;
		const tmpFilter = (typeof tmpOptions.Filter === 'function') ? tmpOptions.Filter : null;
		const tmpGlobalFilter = this._globalFilter;
		const tmpResult = [];
		this.getNavigationGraph().forEach((pCategory) =>
		{
			if (tmpScope && tmpScope.indexOf(pCategory.Hash) < 0) return;
			(pCategory.Children || []).forEach((pItem) =>
			{
				if (tmpGlobalFilter && !tmpGlobalFilter(pItem, pCategory)) return;
				if (tmpFilter && !tmpFilter(pItem, pCategory)) return;
				if (this.matchesNode(pItem, tmpQuery)) tmpResult.push({ Item: pItem, Category: pCategory });
			});
		});
		return tmpResult;
	}

	// ── Render helpers ───────────────────────────────────────────────────────

	escapeHTML(pStr)
	{
		return String(pStr == null ? '' : pStr).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	/** HTML-escape, then wrap query tokens in <mark> for match highlighting. */
	highlight(pText, pQuery)
	{
		let tmpOut = this.escapeHTML(pText);
		const tmpQuery = (pQuery || '').trim();
		if (!tmpQuery) return tmpOut;
		tmpQuery.split(/\s+/).filter(Boolean).forEach((pTok) =>
		{
			const tmpEsc = pTok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			tmpOut = tmpOut.replace(new RegExp('(' + tmpEsc + ')', 'ig'), '<mark class="pict-nav-mark">$1</mark>');
		});
		return tmpOut;
	}

	// ── Navigation ───────────────────────────────────────────────────────────

	/**
	 * Activate a navigation node. Resolves a hash to its node, marks it active, then
	 * hands off to the host OnNavigate handler if one is configured; otherwise falls
	 * back to hash-route navigation for `Route` values that start with '#'.
	 *
	 * @param {Object|string} pNodeOrHash
	 */
	navigate(pNodeOrHash)
	{
		const tmpNode = (typeof pNodeOrHash === 'string') ? this.getNodeByHash(pNodeOrHash) : pNodeOrHash;
		if (!tmpNode)
		{
			this.log.warn(`PictNavigation.navigate: node not found for [${pNodeOrHash}].`);
			return;
		}
		this.setActive(tmpNode.Hash);
		this.log.info(`PictNavigation: navigate -> ${tmpNode.Name} (${tmpNode.Route || tmpNode.Hash})`);

		// A navigation always dismisses the launcher overlay if it was open.
		if (this.isLauncherOpen()) { this.closeLauncher(); }

		if (typeof this.onNavigate === 'function')
		{
			this.onNavigate(tmpNode);
			return;
		}
		if (typeof tmpNode.Route === 'string' && tmpNode.Route.charAt(0) === '#' && typeof window !== 'undefined' && window.location)
		{
			window.location.hash = tmpNode.Route.replace(/^#/, '');
		}
	}

	/**
	 * Convenience: point a render-type view at a destination and render it. pRenderType
	 * is 'Hub' | 'Sidebar' | 'Palette' | 'List' (the view hash suffix).
	 *
	 * Pass `pOptions.Scope` (category-hash array) / `pOptions.Filter` (item predicate) to
	 * render a pre-filtered subset. Both are always applied (defaulting to none) so a prior
	 * scoped render does not leak into an unscoped one on the same shared view.
	 *
	 * @param {string} pRenderType
	 * @param {string} [pDestinationAddress]
	 * @param {{Scope?: Array<string>, Filter?: Function}} [pOptions]
	 */
	render(pRenderType, pDestinationAddress, pOptions)
	{
		const tmpView = this.pict.views['Navigation-' + pRenderType];
		if (!tmpView)
		{
			this.log.warn(`PictNavigation.render: unknown render type [${pRenderType}].`);
			return null;
		}
		if (pDestinationAddress)
		{
			tmpView.options.DefaultDestinationAddress = pDestinationAddress;
			if (Array.isArray(tmpView.options.Renderables))
			{
				tmpView.options.Renderables.forEach((pRenderable) => { pRenderable.DestinationAddress = pDestinationAddress; });
			}
		}
		const tmpOptions = pOptions || {};
		tmpView.options.Scope = Array.isArray(tmpOptions.Scope) ? tmpOptions.Scope : null;
		tmpView.options.Filter = (typeof tmpOptions.Filter === 'function') ? tmpOptions.Filter : null;
		tmpView.render();
		return tmpView;
	}

	/**
	 * Render the Sidebar render type in DOCKED mode (rail only, no detail pane) into a
	 * destination — the persistent-application-sidebar form. Item clicks navigate the host.
	 * Returns the docked sidebar view (call .syncActive() on it after external navigations).
	 *
	 * @param {string} pDestinationAddress
	 */
	renderSidebarDocked(pDestinationAddress)
	{
		// A dedicated docked instance (ShowDetail false) distinct from the two-pane 'Navigation-Sidebar'.
		if (!this.pict.views['Navigation-Sidebar-Docked'])
		{
			this.pict.addViewSingleton('Navigation-Sidebar-Docked', Object.assign({}, libViewSidebar.default_configuration,
				{
					ViewIdentifier: 'Navigation-Sidebar-Docked',
					NavigationProviderHash: this.options.ProviderIdentifier,
					ShowDetail: false,
					DefaultDestinationAddress: pDestinationAddress || '#Navigation-Container',
					Renderables:
					[
						{ RenderableHash: 'Navigation-Sidebar-Wrap', TemplateHash: 'Navigation-Sidebar-Container', DestinationAddress: pDestinationAddress || '#Navigation-Container', RenderType: 'replace' }
					]
				}), libViewSidebar);
		}
		return this.render('Sidebar-Docked', pDestinationAddress);
	}

	// ── Command-palette launcher overlay ───────────────────────────────────────

	/** Ensure the body-level launcher overlay container exists (backdrop + centered card). */
	_ensureLauncherDOM()
	{
		if (typeof document === 'undefined') return;
		if (document.getElementById('PictNavLauncher')) return;
		// Body-level overlay chrome — a documented exception to the "no direct DOM" rule
		// (same category as a popover/tooltip; there is no renderable destination for it yet).
		const tmpContainer = document.createElement('div');
		tmpContainer.id = 'PictNavLauncher';
		tmpContainer.className = 'pict-nav-launcher';
		document.body.appendChild(tmpContainer);
		const tmpProviderRef = `_Pict.providers['${this.options.ProviderIdentifier}']`;
		this.pict.ContentAssignment.assignContent('#PictNavLauncher',
			`<div class="pict-nav-launcher-backdrop" onclick="${tmpProviderRef}.closeLauncher()"></div>` +
			`<div class="pict-nav-launcher-card" id="PictNavLauncher-Card" role="dialog" aria-modal="true" aria-label="Jump to"></div>`);
	}

	/** Open the command-palette launcher overlay (fresh, empty query) and focus its input. */
	openLauncher()
	{
		this._ensureLauncherDOM();
		const tmpView = this.pict.views['Navigation-Launcher'];
		if (tmpView)
		{
			tmpView._localQuery = '';
			tmpView.render();
		}
		this.pict.CSSMap.injectCSS();
		this.pict.ContentAssignment.addClass('#PictNavLauncher', 'is-open');
		this._launcherOpen = true;
		// Focus the search input on the next tick (after the overlay is painted/visible).
		const fFocus = () =>
		{
			const tmpInput = this.pict.ContentAssignment.getElement('#PictNavLauncher input');
			if (tmpInput && tmpInput[0] && typeof tmpInput[0].focus === 'function') { tmpInput[0].focus(); }
		};
		if (typeof setTimeout === 'function') { setTimeout(fFocus, 0); } else { fFocus(); }
		return this;
	}

	/** Hide the launcher overlay. */
	closeLauncher()
	{
		this.pict.ContentAssignment.removeClass('#PictNavLauncher', 'is-open');
		this._launcherOpen = false;
		return this;
	}

	toggleLauncher() { return this._launcherOpen ? this.closeLauncher() : this.openLauncher(); }

	isLauncherOpen() { return !!this._launcherOpen; }

	/**
	 * Install a single, safe global keydown handler for the launcher:
	 *   • Cmd/Ctrl+K  → toggle the launcher overlay (the Slack/Linear quick-switcher key)
	 *   • Escape      → close the launcher (only when it is open; otherwise left alone)
	 * Idempotent; returns an unbind function. This is a documented exception to the
	 * "no addEventListener" rule — a browser-level global shortcut has no inline equivalent.
	 *
	 * @returns {Function} unbind
	 */
	bindLauncherHotkey()
	{
		if (typeof document === 'undefined') { return () => {}; }
		if (this._hotkeyBound) { return this._hotkeyUnbind; }
		const fHandler = (pEvent) =>
		{
			if (!pEvent) return;
			const tmpKey = (pEvent.key || '').toLowerCase();
			if ((pEvent.metaKey || pEvent.ctrlKey) && !pEvent.altKey && tmpKey === 'k')
			{
				pEvent.preventDefault();
				pEvent.stopPropagation();
				this.toggleLauncher();
				return;
			}
			if (tmpKey === 'escape' && this.isLauncherOpen())
			{
				pEvent.preventDefault();
				pEvent.stopPropagation();
				this.closeLauncher();
			}
		};
		// Capture phase so we intercept before focused inputs (e.g. the palette's own keydown).
		document.addEventListener('keydown', fHandler, true);
		this._hotkeyBound = true;
		this._hotkeyUnbind = () =>
		{
			document.removeEventListener('keydown', fHandler, true);
			this._hotkeyBound = false;
			this._hotkeyUnbind = null;
		};
		this.log.info('PictNavigation: launcher hotkey bound (Cmd/Ctrl+K opens, Escape closes).');
		return this._hotkeyUnbind;
	}
}

/* The render types this section can produce, in display order. Layout 'page' renders
   as a home screen; 'rail' is a persistent docked sidebar. Hosts read this to build a
   navigation-style chooser without hard-coding the list. */
PictNavigationProvider.RenderTypes =
[
	{ Key: 'Sidebar', Label: 'Sidebar', Layout: 'rail', Icon: 'Menu', Blurb: 'A persistent docked rail on the left.' },
	{ Key: 'Hub', Label: 'Hub', Layout: 'page', Icon: 'Home', Blurb: 'Categorized cards — a settings home.' },
	{ Key: 'List', Label: 'List', Layout: 'page', Icon: 'More', Blurb: 'A scannable grouped list.' },
	{ Key: 'Palette', Label: 'Command Palette', Layout: 'page', Icon: 'Search', Blurb: 'A ⌘K-style search list.' }
];

/* Shared, themeable styling for every render type. Colors come from the pict theme
   tokens (--theme-color-*) with neutral fallbacks so the views look right with or
   without a theme provider. */
PictNavigationProvider.SharedCSS = /*css*/`
.pict-nav { color: var(--theme-color-text-primary, #1f2733); font-size: 14px; }
.pict-nav *, .pict-nav *::before, .pict-nav *::after { box-sizing: border-box; }
.pict-nav-mark { background: var(--theme-color-status-warning, #f2c94c); color: inherit; border-radius: 2px; padding: 0 1px; }

/* Search field */
.pict-nav-search { position: relative; }
.pict-nav-search input {
	width: 100%; font: inherit; font-size: 0.95rem; padding: 0.55rem 0.7rem 0.55rem 2.1rem;
	border: 1px solid var(--theme-color-border-default, #d7dce3); border-radius: 8px;
	background: var(--theme-color-background-primary, #fff); color: var(--theme-color-text-primary, #1f2733); }
.pict-nav-search input:focus { outline: none; border-color: var(--theme-color-brand-primary, #156dd1);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-color-brand-primary, #156dd1) 18%, transparent); }
.pict-nav-search .pict-nav-search-ic { position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%);
	color: var(--theme-color-text-muted, #6b7686); pointer-events: none; }

/* Advanced toggle — right-aligned under the search box, with a little top + right
   breathing room so "Show advanced" doesn't crowd the search box's right edge. */
.pict-nav-adv { display: flex; justify-content: flex-end; align-items: center; gap: 0.4rem; font-size: 0.8rem;
	color: var(--theme-color-text-secondary, #45505f); cursor: pointer; user-select: none;
	padding: 0.4rem 0.35rem 0 0; }

/* Icon chip */
.pict-nav-ic { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
	width: 38px; height: 38px; border-radius: 9px; background: var(--theme-color-background-tertiary, #eceef2); }

/* Empty state */
.pict-nav-empty { text-align: center; color: var(--theme-color-text-muted, #6b7686); padding: 2.5rem 1rem; }

/* Command-palette launcher overlay (⌘K). The card hosts the palette render type. */
.pict-nav-launcher { position: fixed; inset: 0; z-index: 6000; display: none; }
.pict-nav-launcher.is-open { display: block; }
.pict-nav-launcher-backdrop { position: absolute; inset: 0;
	background: color-mix(in srgb, var(--theme-color-text-primary, #1f2733) 42%, transparent); }
.pict-nav-launcher-card { position: absolute; left: 50%; top: 13vh; transform: translateX(-50%);
	width: min(660px, 94vw); animation: pict-nav-launcher-in 0.12s ease-out; }
.pict-nav-launcher-card .pict-nav-pl { max-height: 68vh; }
@keyframes pict-nav-launcher-in { from { opacity: 0; transform: translate(-50%, -6px); } to { opacity: 1; transform: translate(-50%, 0); } }
`;

module.exports = PictNavigationProvider;
module.exports.default_configuration = _DEFAULT_PROVIDER_CONFIGURATION;
