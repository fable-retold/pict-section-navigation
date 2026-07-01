const libPictViewClass = require('pict-view');

const html = String.raw;

/**
 * Navigation render type: SIDEBAR
 *
 * A persistent grouped left rail with always-visible help and a detail pane on the
 * right. Selecting an item in the rail shows its detail (it does NOT navigate away);
 * the detail pane's "Open" button performs the actual navigation. The "search-first
 * sidebar" pattern — best for dense settings areas where you want a stable map of
 * everything on the left and contextual explanation on the right.
 */
const default_configuration =
{
	"ViewIdentifier": "Navigation-Sidebar",
	"NavigationProviderHash": "Pict-Navigation",

	"ShowSearch": true,
	"ShowAdvancedToggle": true,
	"SearchPlaceholder": "Search…",

	// ShowDetail true  → standalone two-pane home screen (rail + a detail pane that
	//                    explains the selected item; the detail's Open button navigates).
	// ShowDetail false → docked mode: just the rail, sized to fill its container, for use
	//                    as a persistent application sidebar. Clicking an item navigates
	//                    the host immediately (the host's main area is the "detail").
	"ShowDetail": true,

	"WelcomeHeading": "Configuration",
	"WelcomeBlurb": "Search or pick an area from the left. Each entry explains what it does.",

	"RenderOnLoad": false,
	"DefaultRenderable": "Navigation-Sidebar-Wrap",
	"DefaultDestinationAddress": "#Navigation-Container",

	"Templates":
	[
		{ "Hash": "Navigation-Sidebar-Container", "Template": html`<div class="pict-nav-sb-mount"></div>` }
	],
	"Renderables":
	[
		{
			"RenderableHash": "Navigation-Sidebar-Wrap",
			"TemplateHash": "Navigation-Sidebar-Container",
			"DestinationAddress": "#Navigation-Container",
			"RenderType": "replace"
		}
	],

	"CSS": /*css*/`
.pict-nav-sb-layout { display: flex; height: 100%; min-height: 360px; }
.pict-nav-sb-rail { flex: 0 0 330px; width: 330px; display: flex; flex-direction: column; min-height: 0;
	background: var(--theme-color-background-panel, #fff); border-right: 1px solid var(--theme-color-border-light, #e8ebf0); }
/* Docked mode: the rail is the whole thing (no detail pane), filling its host container. */
.pict-nav-sb-docked, .pict-nav-sb-docked .pict-nav-sb-layout { height: 100%; min-height: 0; }
.pict-nav-sb-docked .pict-nav-sb-rail { flex: 1 1 auto; width: 100%; border-right: none; }
.pict-nav-sb-rail-head { padding: 0.75rem; border-bottom: 1px solid var(--theme-color-border-light, #e8ebf0); }
.pict-nav-sb-rail-body { flex: 1 1 auto; overflow: auto; padding: 0.5rem 0.5rem 2rem; min-height: 0; }
.pict-nav-sb-group { margin-bottom: 0.35rem; }
.pict-nav-sb-group-head { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.55rem 0.35rem;
	font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
	color: var(--theme-color-text-muted, #6b7686); cursor: pointer; user-select: none; }
.pict-nav-sb-group-head .pict-nav-sb-cat-ic { display: inline-flex; align-items: center; }
.pict-nav-sb-group-head .pict-nav-sb-chev { margin-left: auto; display: inline-flex; align-items: center;
	transition: transform 0.15s ease; }
.pict-nav-sb-group.collapsed .pict-nav-sb-chev { transform: rotate(-90deg); }
.pict-nav-sb-group.collapsed .pict-nav-sb-items { display: none; }
.pict-nav-sb-item { display: flex; gap: 0.6rem; align-items: flex-start; padding: 0.5rem 0.55rem;
	border-radius: 8px; text-decoration: none; color: inherit; }
.pict-nav-sb-item:hover { background: var(--theme-color-background-tertiary, #eceef2); }
.pict-nav-sb-item.is-active { background: color-mix(in srgb, var(--theme-color-brand-primary, #156dd1) 12%, transparent);
	box-shadow: inset 3px 0 0 var(--theme-color-brand-primary, #156dd1); }
.pict-nav-sb-item .pict-nav-sb-item-ic { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
	width: 26px; height: 26px; border-radius: 7px; background: var(--theme-color-background-tertiary, #eceef2);
	color: var(--theme-color-brand-primary, #156dd1); margin-top: 1px; font-size: 1rem; }
.pict-nav-sb-item-text { min-width: 0; }
.pict-nav-sb-item-name { display: block; font-weight: 600; font-size: 0.9rem; line-height: 1.15; }
.pict-nav-sb-item-desc { display: block; font-size: 0.76rem; color: var(--theme-color-text-muted, #6b7686); line-height: 1.32; margin-top: 1px; }

.pict-nav-sb-main { flex: 1 1 auto; min-width: 0; overflow: auto; padding: 2.5rem 3rem;
	color: var(--theme-color-text-primary, #1f2733); }
.pict-nav-sb-detail { max-width: 640px; }
.pict-nav-sb-detail-cat { font-size: 0.78rem; margin-bottom: 1rem; }
.pict-nav-sb-detail-head { display: flex; gap: 1.1rem; align-items: center; }
.pict-nav-sb-detail-ic { flex: 0 0 auto; width: 64px; height: 64px; border-radius: 16px; display: flex;
	align-items: center; justify-content: center; font-size: 1.7rem; background: var(--theme-color-background-tertiary, #eceef2);
	color: var(--theme-color-brand-primary, #156dd1); }
.pict-nav-sb-detail-title { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.25rem; line-height: 1.15; }
.pict-nav-sb-detail-sub { color: var(--theme-color-text-muted, #6b7686); margin: 0; }
.pict-nav-sb-detail-actions { margin-top: 1.75rem; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; }
.pict-nav-sb-open { display: inline-flex; align-items: center; gap: 0.4rem; font: inherit; font-weight: 650; cursor: pointer;
	padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--theme-color-brand-primary, #156dd1);
	background: var(--theme-color-brand-primary, #156dd1); color: var(--theme-color-text-on-brand, #fff); }
.pict-nav-sb-open:hover { background: color-mix(in srgb, var(--theme-color-brand-primary, #156dd1) 88%, #000); }
.pict-nav-sb-detail-route { font-size: 0.78rem; color: var(--theme-color-text-muted, #6b7686); }
.pict-nav-sb-detail-route code { background: var(--theme-color-background-tertiary, #eceef2); border-radius: 4px; padding: 1px 5px; }
.pict-nav-sb-adv-tag { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase;
	color: var(--theme-color-text-muted, #6b7686); border: 1px solid var(--theme-color-border-default, #d7dce3);
	border-radius: 999px; padding: 1px 8px; margin-left: 0.6rem; vertical-align: middle; }

.pict-nav-sb-welcome { max-width: 640px; }
.pict-nav-sb-welcome h1 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.7rem; font-weight: 700; margin: 0 0 0.4rem; }
.pict-nav-sb-welcome h1 .pict-nav-sb-welcome-ic { color: var(--theme-color-brand-primary, #156dd1); display: inline-flex; }
.pict-nav-sb-welcome-sub { color: var(--theme-color-text-muted, #6b7686); font-size: 1.05rem; margin: 0 0 1.25rem; }
.pict-nav-sb-welcome hr { border: none; border-top: 1px solid var(--theme-color-border-light, #e8ebf0); margin: 0 0 1rem; }
.pict-nav-sb-welcome-cat { display: flex; gap: 0.6rem; align-items: center; padding: 0.5rem 0; }
.pict-nav-sb-welcome-cat .pict-nav-sb-welcome-cat-ic { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
	width: 34px; height: 34px; border-radius: 9px; background: var(--theme-color-background-tertiary, #eceef2); }
.pict-nav-sb-welcome-cat-blurb { color: var(--theme-color-text-muted, #6b7686); font-size: 0.84rem; }
`
};

class PictViewNavigationSidebar extends libPictViewClass
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, default_configuration, pOptions);
		super(pFable, tmpOptions, pServiceHash);
	}

	get navigationProvider()
	{
		return this.pict.providers[this.options.NavigationProviderHash || 'Pict-Navigation'];
	}

	_railAddress()
	{
		return '#PictNav-Sidebar-Rail-' + String(this.options.ViewIdentifier).replace(/[^a-zA-Z0-9]/g, '');
	}

	_detailAddress()
	{
		return '#PictNav-Sidebar-Detail-' + String(this.options.ViewIdentifier).replace(/[^a-zA-Z0-9]/g, '');
	}

	onAfterRender(pRenderable)
	{
		const tmpProvider = this.navigationProvider;
		if (tmpProvider)
		{
			const tmpHandler = `_Pict.views['${this.options.ViewIdentifier}']`;
			const tmpSearch = this.options.ShowSearch ? `
				<div class="pict-nav-search">
					<span class="pict-nav-search-ic">${this.pict.icon('Search')}</span>
					<input type="text" placeholder="${tmpProvider.escapeHTML(this.options.SearchPlaceholder)}" value="${tmpProvider.escapeHTML(tmpProvider.getQuery())}"
						oninput="${tmpHandler}.onSearch(this.value)" />
				</div>` : '';
			const tmpAdvanced = this.options.ShowAdvancedToggle ? `
				<label class="pict-nav-adv"><input type="checkbox" ${tmpProvider.getShowAdvanced() ? 'checked' : ''} onchange="${tmpHandler}.onToggleAdvanced(this.checked)" /> Show advanced</label>` : '';
			const tmpDocked = !this.options.ShowDetail;
			const tmpDetail = tmpDocked ? '' : `<main id="${this._detailAddress().slice(1)}" class="pict-nav-sb-main"></main>`;
			const tmpShell = `<div class="pict-nav pict-nav-sb${tmpDocked ? ' pict-nav-sb-docked' : ''}">
				<div class="pict-nav-sb-layout">
					<aside class="pict-nav-sb-rail">
						<div class="pict-nav-sb-rail-head">${tmpSearch}${tmpAdvanced}</div>
						<div id="${this._railAddress().slice(1)}" class="pict-nav-sb-rail-body"></div>
					</aside>
					${tmpDetail}
				</div>
			</div>`;
			this.pict.ContentAssignment.assignContent(this.options.DefaultDestinationAddress, tmpShell);
			this.repaintRail();
			if (!tmpDocked) { this.repaintDetail(); }
		}
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable);
	}

	/** Rebuild the grouped rail body without disturbing the search input above it. */
	repaintRail()
	{
		const tmpProvider = this.navigationProvider;
		if (!tmpProvider) return;
		const tmpHandler = `_Pict.views['${this.options.ViewIdentifier}']`;
		const tmpQuery = tmpProvider.getQuery();
		const tmpCategories = tmpProvider.getFilteredCategories({ Scope: this.options.Scope, Filter: this.options.Filter });
		const tmpChevron = this.pict.icon('ChevronDown');

		let tmpHTML = '';
		tmpCategories.forEach((pCategory) =>
		{
			const tmpCatStyle = pCategory.Accent ? ` style="color:${pCategory.Accent}"` : '';
			// A category can render collapsed by default (pCategory.Collapsed); an active search forces it open.
			const tmpCollapsed = (pCategory.Collapsed && !tmpQuery) ? ' collapsed' : '';
			tmpHTML += `<div class="pict-nav-sb-group${tmpCollapsed}">
				<div class="pict-nav-sb-group-head" onclick="this.parentNode.classList.toggle('collapsed')">
					<span class="pict-nav-sb-cat-ic"${tmpCatStyle}>${pCategory.Icon ? this.pict.icon(pCategory.Icon) : ''}</span>
					<span>${tmpProvider.escapeHTML(pCategory.Name)}</span>
					<span class="pict-nav-sb-chev">${tmpChevron}</span>
				</div>
				<div class="pict-nav-sb-items">`;
			pCategory.Items.forEach((pItem) =>
			{
				const tmpAccent = pItem.Accent || pCategory.Accent;
				const tmpIcStyle = tmpAccent ? ` style="color:${tmpAccent}"` : '';
				const tmpActive = (tmpProvider.getActive() === pItem.Hash) ? ' is-active' : '';
				// Docked rail navigates immediately; two-pane shows the item in the detail pane.
				const tmpClick = this.options.ShowDetail ? 'select' : 'activate';
				tmpHTML += `<a class="pict-nav-sb-item${tmpActive}" href="${pItem.Route ? tmpProvider.escapeHTML(pItem.Route) : '#'}" title="${tmpProvider.escapeHTML(pItem.Description)}" onclick="return ${tmpHandler}.${tmpClick}('${pItem.Hash}', event)">
					<span class="pict-nav-sb-item-ic"${tmpIcStyle}>${pItem.Icon ? this.pict.icon(pItem.Icon) : ''}</span>
					<span class="pict-nav-sb-item-text"><span class="pict-nav-sb-item-name">${tmpProvider.highlight(pItem.Name, tmpQuery)}</span>${pItem.Description ? `<span class="pict-nav-sb-item-desc">${tmpProvider.highlight(pItem.Description, tmpQuery)}</span>` : ''}</span>
				</a>`;
			});
			tmpHTML += `</div></div>`;
		});
		if (tmpCategories.length === 0)
		{
			tmpHTML = `<div class="pict-nav-empty">No matches.</div>`;
		}
		this.pict.ContentAssignment.assignContent(this._railAddress(), tmpHTML);
	}

	/** Rebuild the right-hand detail pane for the active node, or the welcome screen. */
	repaintDetail()
	{
		const tmpProvider = this.navigationProvider;
		if (!tmpProvider) return;
		const tmpHandler = `_Pict.views['${this.options.ViewIdentifier}']`;
		const tmpActiveHash = tmpProvider.getActive();
		const tmpNode = tmpActiveHash ? tmpProvider.getNodeByHash(tmpActiveHash) : null;

		let tmpHTML;
		if (tmpNode)
		{
			const tmpIcStyle = tmpNode.Accent ? ` style="color:${tmpNode.Accent}"` : '';
			const tmpRoute = tmpNode.Route ? tmpProvider.escapeHTML(tmpNode.Route) : '';
			tmpHTML = `<div class="pict-nav-sb-detail">
				<div class="pict-nav-sb-detail-head">
					<span class="pict-nav-sb-detail-ic"${tmpIcStyle}>${tmpNode.Icon ? this.pict.icon(tmpNode.Icon) : ''}</span>
					<div>
						<h1 class="pict-nav-sb-detail-title">${tmpProvider.escapeHTML(tmpNode.Name)}${tmpNode.Advanced ? '<span class="pict-nav-sb-adv-tag">Advanced</span>' : ''}</h1>
						${tmpNode.Description ? `<p class="pict-nav-sb-detail-sub">${tmpProvider.escapeHTML(tmpNode.Description)}</p>` : ''}
					</div>
				</div>
				<div class="pict-nav-sb-detail-actions">
					<button type="button" class="pict-nav-sb-open" onclick="${tmpHandler}.activate('${tmpNode.Hash}', event)">${this.pict.icon('ExternalLink')} Open ${tmpProvider.escapeHTML(tmpNode.Name)}</button>
					${tmpRoute ? `<span class="pict-nav-sb-detail-route">Route: <code>${tmpRoute}</code></span>` : ''}
				</div>
			</div>`;
		}
		else
		{
			let tmpCats = '';
			tmpProvider.getNavigationGraph().forEach((pCategory) =>
			{
				const tmpCatStyle = pCategory.Accent ? ` style="color:${pCategory.Accent}"` : '';
				tmpCats += `<div class="pict-nav-sb-welcome-cat">
					<span class="pict-nav-sb-welcome-cat-ic"${tmpCatStyle}>${pCategory.Icon ? this.pict.icon(pCategory.Icon) : ''}</span>
					<span><strong>${tmpProvider.escapeHTML(pCategory.Name)}</strong>${pCategory.Blurb ? ` <span class="pict-nav-sb-welcome-cat-blurb">— ${tmpProvider.escapeHTML(pCategory.Blurb)}</span>` : ''}</span>
				</div>`;
			});
			tmpHTML = `<div class="pict-nav-sb-welcome">
				<h1><span class="pict-nav-sb-welcome-ic">${this.pict.icon('Settings')}</span><span>${tmpProvider.escapeHTML(this.options.WelcomeHeading)}</span></h1>
				<p class="pict-nav-sb-welcome-sub">${tmpProvider.escapeHTML(this.options.WelcomeBlurb)}</p>
				<hr/>${tmpCats}</div>`;
		}
		this.pict.ContentAssignment.assignContent(this._detailAddress(), tmpHTML);
	}

	/** Select an item: show its detail and move the active highlight. Does NOT navigate. */
	select(pHash, pEvent)
	{
		if (pEvent) { pEvent.preventDefault(); }
		this.navigationProvider.setActive(pHash);
		this.repaintRail();
		this.repaintDetail();
		return false;
	}

	/** Navigate to a node (the detail pane's "Open" button, or a docked-rail item click). */
	activate(pHash, pEvent)
	{
		if (pEvent) { pEvent.preventDefault(); }
		this.navigationProvider.navigate(pHash);
		// In docked mode the rail stays put — move the active highlight to the clicked item.
		this.syncActive();
		return false;
	}

	/**
	 * Re-paint the rail so its active highlight matches the provider's active node. Call
	 * this from the host after an external navigation (URL change, ⌘K launcher) so a
	 * docked sidebar reflects the current route.
	 */
	syncActive()
	{
		this.repaintRail();
		return this;
	}

	onSearch(pValue)
	{
		this.navigationProvider.setQuery(pValue);
		this.repaintRail();
	}

	onToggleAdvanced(pChecked)
	{
		this.navigationProvider.setShowAdvanced(pChecked);
		this.repaintRail();
	}
}

module.exports = PictViewNavigationSidebar;
module.exports.default_configuration = default_configuration;
