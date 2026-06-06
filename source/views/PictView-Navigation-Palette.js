const libPictViewClass = require('pict-view');

const html = String.raw;

/**
 * Navigation render type: PALETTE
 *
 * A command-palette / ⌘K-style search list. A search box at the top filters a flat,
 * keyboard-navigable list of items (↑/↓ to move, Enter to open, Esc to clear). When the
 * search is empty the full directory is shown grouped by category; once a query is typed
 * the results collapse to a flat list with a per-row category tag. Rendered inline inside
 * its container (not a fixed overlay) so the host can position it.
 */
const default_configuration =
{
	"ViewIdentifier": "Navigation-Palette",
	"NavigationProviderHash": "Pict-Navigation",

	"ShowSearch": true,
	"ShowFooter": true,
	"SearchPlaceholder": "Search configuration, tools, analytics…",

	// When true the view keeps its own query string instead of the provider's shared
	// query state. The command-palette launcher overlay sets this so quick-jumping
	// never disturbs a docked sidebar / inline render that is sharing the provider.
	"UseLocalQuery": false,

	"RenderOnLoad": false,
	"DefaultRenderable": "Navigation-Palette-Wrap",
	"DefaultDestinationAddress": "#Navigation-Container",

	"Templates":
	[
		{ "Hash": "Navigation-Palette-Container", "Template": html`<div class="pict-nav-pl-mount"></div>` }
	],
	"Renderables":
	[
		{
			"RenderableHash": "Navigation-Palette-Wrap",
			"TemplateHash": "Navigation-Palette-Container",
			"DestinationAddress": "#Navigation-Container",
			"RenderType": "replace"
		}
	],

	"CSS": /*css*/`
.pict-nav-pl { display: flex; flex-direction: column; max-height: 76vh;
	background: var(--theme-color-background-panel, #fff); border: 1px solid var(--theme-color-border-light, #e8ebf0);
	border-radius: 14px; box-shadow: 0 18px 50px color-mix(in srgb, var(--theme-color-shadow-color, rgba(15,23,42,0.18)) 85%, transparent); overflow: hidden; }
.pict-nav-pl-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.95rem 1.15rem; border-bottom: 1px solid var(--theme-color-border-light, #e8ebf0); }
.pict-nav-pl-head .pict-nav-pl-ic-search { color: var(--theme-color-text-muted, #6b7686); font-size: 1.05rem; display: inline-flex; align-items: center; }
.pict-nav-pl-head input { flex: 1 1 auto; border: none; outline: none; background: transparent; font: inherit; font-size: 1.18rem; color: var(--theme-color-text-primary, #1f2733); }
.pict-nav-pl-head input::placeholder { color: var(--theme-color-text-muted, #6b7686); }
.pict-nav-pl-esc { font-size: 0.6rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--theme-color-text-muted, #6b7686);
	border: 1px solid var(--theme-color-border-default, #d7dce3); border-radius: 999px; padding: 2px 8px; flex: 0 0 auto; }
.pict-nav-pl-results { overflow: auto; padding: 0.4rem; }
.pict-nav-pl-cat { font-size: 0.67rem; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; color: var(--theme-color-text-muted, #6b7686); padding: 0.7rem 0.75rem 0.25rem; }
.pict-nav-pl-row { display: flex; align-items: center; gap: 0.85rem; padding: 0.55rem 0.75rem; border-radius: 9px; cursor: pointer; scroll-margin: 8px; }
.pict-nav-pl-row.hl { background: color-mix(in srgb, var(--theme-color-brand-primary, #156dd1) 12%, transparent); }
.pict-nav-pl-row .pict-nav-ic { width: 32px; height: 32px; }
.pict-nav-pl-text { min-width: 0; }
.pict-nav-pl-name { font-weight: 600; }
.pict-nav-pl-desc { display: block; font-size: 0.79rem; color: var(--theme-color-text-muted, #6b7686); line-height: 1.25; margin-top: 1px; }
.pict-nav-pl-tag { margin-left: auto; flex: 0 0 auto; font-size: 0.67rem; color: var(--theme-color-text-muted, #6b7686);
	border: 1px solid var(--theme-color-border-default, #d7dce3); border-radius: 999px; padding: 1px 9px; white-space: nowrap; }
.pict-nav-pl-row.hl .pict-nav-pl-tag { display: none; }
.pict-nav-pl-enter { margin-left: auto; flex: 0 0 auto; font-size: 0.72rem; font-weight: 700; color: var(--theme-color-brand-primary, #156dd1); opacity: 0; }
.pict-nav-pl-row.hl .pict-nav-pl-enter { opacity: 1; }
.pict-nav-pl-adv-pill { font-size: 0.6rem; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--theme-color-text-muted, #6b7686);
	border: 1px solid var(--theme-color-border-default, #d7dce3); border-radius: 999px; padding: 1px 7px; margin-left: 6px; vertical-align: middle; }
.pict-nav-pl-foot { border-top: 1px solid var(--theme-color-border-light, #e8ebf0); padding: 0.5rem 0.95rem; font-size: 0.72rem;
	color: var(--theme-color-text-muted, #6b7686); display: flex; gap: 1.2rem; flex-wrap: wrap; }
.pict-nav-pl-foot kbd { background: var(--theme-color-background-tertiary, #eceef2); border-radius: 4px; padding: 0 5px; font: inherit; font-weight: 700; }
`
};

class PictViewNavigationPalette extends libPictViewClass
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, default_configuration, pOptions);
		super(pFable, tmpOptions, pServiceHash);

		// Keyboard-highlight index into the currently-visible rows.
		this._highlightIndex = 0;
		// Flat list of { Item, Category } for the currently-rendered rows (set during repaint).
		this._rows = [];
		// Local query string, used only when UseLocalQuery is set (launcher overlay).
		this._localQuery = '';
	}

	get navigationProvider()
	{
		return this.pict.providers[this.options.NavigationProviderHash || 'Pict-Navigation'];
	}

	/** The active query — local to this view, or the provider's shared query. */
	_getQuery()
	{
		return this.options.UseLocalQuery ? (this._localQuery || '') : this.navigationProvider.getQuery();
	}

	_setQuery(pValue)
	{
		if (this.options.UseLocalQuery) { this._localQuery = String(pValue == null ? '' : pValue); }
		else { this.navigationProvider.setQuery(pValue); }
	}

	_resultsAddress()
	{
		return '#PictNav-Palette-Results-' + String(this.options.ViewIdentifier).replace(/[^a-zA-Z0-9]/g, '');
	}

	onAfterRender(pRenderable)
	{
		const tmpProvider = this.navigationProvider;
		if (tmpProvider)
		{
			const tmpHandler = `_Pict.views['${this.options.ViewIdentifier}']`;
			const tmpSearch = this.options.ShowSearch ? `
				<div class="pict-nav-pl-head">
					<span class="pict-nav-pl-ic-search">${this.pict.icon('Search')}</span>
					<input type="text" autocomplete="off" placeholder="${tmpProvider.escapeHTML(this.options.SearchPlaceholder)}" value="${tmpProvider.escapeHTML(this._getQuery())}"
						oninput="${tmpHandler}.onSearch(this.value)" onkeydown="${tmpHandler}.onKey(event)" />
					<span class="pict-nav-pl-esc">esc</span>
				</div>` : '';
			const tmpFooter = this.options.ShowFooter ? `
				<div class="pict-nav-pl-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> clear</span></div>` : '';
			const tmpShell = `<div class="pict-nav pict-nav-pl">
				${tmpSearch}
				<div id="${this._resultsAddress().slice(1)}" class="pict-nav-pl-results"></div>
				${tmpFooter}
			</div>`;
			this.pict.ContentAssignment.assignContent(this.options.DefaultDestinationAddress, tmpShell);
			this.repaint();
		}
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable);
	}

	/** Rebuild ONLY the results region without disturbing the search input. */
	repaint()
	{
		const tmpProvider = this.navigationProvider;
		if (!tmpProvider) return;
		const tmpHandler = `_Pict.views['${this.options.ViewIdentifier}']`;
		const tmpQuery = this._getQuery();

		this._rows = [];
		let tmpHTML = '';

		const fRenderRow = (pItem, pCategory, pFlat) =>
		{
			const tmpIdx = this._rows.length;
			this._rows.push({ Item: pItem, Category: pCategory });
			const tmpAccent = pItem.Accent || pCategory.Accent;
			const tmpIcStyle = tmpAccent ? ` style="color:${tmpAccent}"` : '';
			const tmpTail = pFlat
				? `<span class="pict-nav-pl-tag">${tmpProvider.escapeHTML(pCategory.Name)}</span><span class="pict-nav-pl-enter">↵ open</span>`
				: `<span class="pict-nav-pl-enter">↵ open</span>`;
			return `<div class="pict-nav-pl-row" data-idx="${tmpIdx}" onmousemove="${tmpHandler}.setHighlight(${tmpIdx})" onclick="${tmpHandler}.openIndex(${tmpIdx})">
				<span class="pict-nav-ic"${tmpIcStyle}>${pItem.Icon ? `<i class="${pItem.Icon}"></i>` : ''}</span>
				<span class="pict-nav-pl-text"><span class="pict-nav-pl-name">${tmpProvider.highlight(pItem.Name, tmpQuery)}${pItem.Advanced ? '<span class="pict-nav-pl-adv-pill">adv</span>' : ''}</span>${pItem.Description ? `<span class="pict-nav-pl-desc">${tmpProvider.highlight(pItem.Description, tmpQuery)}</span>` : ''}</span>
				${tmpTail}
			</div>`;
		};

		if (!tmpQuery)
		{
			// Empty query: full directory, grouped by category with a header before each group.
			const tmpCategories = tmpProvider.getFilteredCategories({ Query: tmpQuery, Scope: this.options.Scope, Filter: this.options.Filter });
			tmpCategories.forEach((pCategory) =>
			{
				tmpHTML += `<div class="pict-nav-pl-cat">${tmpProvider.escapeHTML(pCategory.Name)}</div>`;
				pCategory.Items.forEach((pItem) => { tmpHTML += fRenderRow(pItem, pCategory, false); });
			});
		}
		else
		{
			// Active query: flat list across all categories, each row tagged with its category.
			const tmpMatches = tmpProvider.searchFlat(tmpQuery, { Scope: this.options.Scope, Filter: this.options.Filter });
			tmpMatches.forEach((pMatch) => { tmpHTML += fRenderRow(pMatch.Item, pMatch.Category, true); });
		}

		if (this._rows.length === 0)
		{
			tmpHTML = `<div class="pict-nav-empty">No matches. Try another word.</div>`;
		}

		this.pict.ContentAssignment.assignContent(this._resultsAddress(), tmpHTML);
		this._highlightIndex = 0;
		this._paintHighlight();
	}

	/** Toggle the `hl` class so the row at _highlightIndex is highlighted, and scroll it into view. */
	_paintHighlight()
	{
		const tmpRows = this.pict.ContentAssignment.getElement(this._resultsAddress() + ' .pict-nav-pl-row');
		if (!tmpRows) return;
		for (let i = 0; i < tmpRows.length; i++)
		{
			const tmpRow = tmpRows[i];
			if (!tmpRow || !tmpRow.classList) continue;
			tmpRow.classList.toggle('hl', i === this._highlightIndex);
		}
		const tmpActive = tmpRows[this._highlightIndex];
		if (tmpActive && typeof tmpActive.scrollIntoView === 'function')
		{
			tmpActive.scrollIntoView({ block: 'nearest' });
		}
	}

	onKey(pEvent)
	{
		if (!pEvent) return;
		const tmpMax = this._rows.length - 1;
		switch (pEvent.key)
		{
			case 'ArrowDown':
				pEvent.preventDefault();
				this._highlightIndex = Math.min(this._highlightIndex + 1, tmpMax);
				this._paintHighlight();
				break;
			case 'ArrowUp':
				pEvent.preventDefault();
				this._highlightIndex = Math.max(this._highlightIndex - 1, 0);
				this._paintHighlight();
				break;
			case 'Enter':
				pEvent.preventDefault();
				this.openIndex(this._highlightIndex);
				break;
			case 'Escape':
				pEvent.preventDefault();
				if (pEvent.target) { pEvent.target.value = ''; }
				this.onSearch('');
				break;
			default:
				break;
		}
	}

	setHighlight(pIndex)
	{
		this._highlightIndex = pIndex;
		this._paintHighlight();
	}

	openIndex(pIndex)
	{
		const tmpRow = this._rows[pIndex];
		if (tmpRow)
		{
			this.navigationProvider.navigate(tmpRow.Item.Hash);
		}
	}

	onSearch(pValue)
	{
		this._setQuery(pValue);
		this.repaint();
	}
}

module.exports = PictViewNavigationPalette;
module.exports.default_configuration = default_configuration;
