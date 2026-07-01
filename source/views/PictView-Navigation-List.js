const libPictViewClass = require('pict-view');

const html = String.raw;

/**
 * Navigation render type: LIST
 *
 * A scannable single-column, grouped settings list (iOS / Stripe-settings style):
 * each category is a rounded "group" card whose rows carry a name, a one-line
 * description and a chevron. Best for a top-to-bottom directory where every setting
 * gets an inline explanation. Shares the live search + advanced toggle of the hub.
 */
const default_configuration =
{
	"ViewIdentifier": "Navigation-List",
	"NavigationProviderHash": "Pict-Navigation",

	"ShowSearch": true,
	"ShowAdvancedToggle": true,
	"SearchPlaceholder": "Search…",

	"RenderOnLoad": false,
	"DefaultRenderable": "Navigation-List-Wrap",
	"DefaultDestinationAddress": "#Navigation-Container",

	"Templates":
	[
		{ "Hash": "Navigation-List-Container", "Template": html`<div class="pict-nav-list-mount"></div>` }
	],
	"Renderables":
	[
		{
			"RenderableHash": "Navigation-List-Wrap",
			"TemplateHash": "Navigation-List-Container",
			"DestinationAddress": "#Navigation-Container",
			"RenderType": "replace"
		}
	],

	"CSS": /*css*/`
.pict-nav-list-wrap { max-width: 780px; margin: 0 auto; }
.pict-nav-list-head { margin-bottom: 1.1rem; }
.pict-nav-list-head .pict-nav-search { flex: 1 1 auto; }
.pict-nav-list-head-row { display: flex; gap: 0.75rem; align-items: center; }
.pict-nav-list-group { background: var(--theme-color-background-panel, #fff); border: 1px solid var(--theme-color-border-light, #e8ebf0);
	border-radius: 12px; overflow: hidden; margin-bottom: 1.1rem; }
.pict-nav-list-group.is-secondary { opacity: 0.96; }
.pict-nav-list-group-head { display: flex; align-items: center; gap: 0.6rem; padding: 0.8rem 1.1rem;
	background: var(--theme-color-background-tertiary, #eceef2); border-bottom: 1px solid var(--theme-color-border-light, #e8ebf0); }
.pict-nav-list-group-head h3 { font-size: 1rem; font-weight: 700; margin: 0; color: var(--theme-color-text-primary, #1f2733); }
.pict-nav-list-group-ic { color: var(--theme-color-brand-primary, #156dd1); }
.pict-nav-list-group-blurb { color: var(--theme-color-text-muted, #6b7686); font-size: 0.8rem; margin-left: auto; text-align: right; }
.pict-nav-list-row { display: flex; align-items: center; gap: 0.9rem; padding: 0.8rem 1.1rem; text-decoration: none; color: inherit;
	border-top: 1px solid var(--theme-color-border-light, #e8ebf0); transition: background .12s ease; }
.pict-nav-list-row:hover { background: var(--theme-color-background-tertiary, #eceef2); }
.pict-nav-list-row .pict-nav-ic { width: 34px; height: 34px; color: var(--theme-color-brand-primary, #156dd1); font-size: 1.2rem; display: inline-flex; align-items: center; justify-content: center; }
.pict-nav-list-row-text { min-width: 0; }
.pict-nav-list-row-name { display: block; font-weight: 600; line-height: 1.15; }
.pict-nav-list-row-desc { display: block; font-size: 0.8rem; color: var(--theme-color-text-muted, #6b7686); margin-top: 1px; line-height: 1.35; }
.pict-nav-list-chev { margin-left: auto; color: var(--theme-color-text-muted, #6b7686); }
.pict-nav-adv-pill { font-size: 0.6rem; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--theme-color-text-muted, #6b7686);
	border: 1px solid var(--theme-color-border-default, #d7dce3); border-radius: 999px; padding: 1px 7px; margin-left: 6px; vertical-align: middle; }
`
};

class PictViewNavigationList extends libPictViewClass
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

	_resultsAddress()
	{
		return '#PictNav-List-Results-' + String(this.options.ViewIdentifier).replace(/[^a-zA-Z0-9]/g, '');
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
			const tmpShell = `<div class="pict-nav pict-nav-list">
				<div class="pict-nav-list-wrap">
					<div class="pict-nav-list-head">
						<div class="pict-nav-list-head-row">${tmpSearch}</div>
						${tmpAdvanced}
					</div>
					<div id="${this._resultsAddress().slice(1)}" class="pict-nav-list-results"></div>
				</div>
			</div>`;
			this.pict.ContentAssignment.assignContent(this.options.DefaultDestinationAddress, tmpShell);
			this.repaint();
		}
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable);
	}

	/** Rebuild the (search-filtered) results area without disturbing the search input. */
	repaint()
	{
		const tmpProvider = this.navigationProvider;
		if (!tmpProvider) return;
		const tmpHandler = `_Pict.views['${this.options.ViewIdentifier}']`;
		const tmpQuery = tmpProvider.getQuery();
		const tmpCategories = tmpProvider.getFilteredCategories({ Scope: this.options.Scope, Filter: this.options.Filter });

		let tmpHTML = '';
		tmpCategories.forEach((pCategory) =>
		{
			const tmpCatStyle = pCategory.Accent ? ` style="color:${pCategory.Accent}"` : '';
			tmpHTML += `<section class="pict-nav-list-group ${pCategory.Secondary ? 'is-secondary' : ''}">
				<header class="pict-nav-list-group-head"><span class="pict-nav-list-group-ic"${tmpCatStyle}>${pCategory.Icon ? this.pict.icon(pCategory.Icon) : ''}</span><h3>${tmpProvider.escapeHTML(pCategory.Name)}</h3>${pCategory.Blurb ? `<span class="pict-nav-list-group-blurb">${tmpProvider.escapeHTML(pCategory.Blurb)}</span>` : ''}</header>`;
			pCategory.Items.forEach((pItem) =>
			{
				const tmpAccent = pItem.Accent || pCategory.Accent;
				const tmpIcStyle = tmpAccent ? ` style="color:${tmpAccent}"` : '';
				tmpHTML += `<a class="pict-nav-list-row" href="${pItem.Route ? tmpProvider.escapeHTML(pItem.Route) : '#'}" onclick="return ${tmpHandler}.activate('${pItem.Hash}', event)">
					<span class="pict-nav-ic"${tmpIcStyle}>${pItem.Icon ? this.pict.icon(pItem.Icon) : ''}</span>
					<span class="pict-nav-list-row-text"><span class="pict-nav-list-row-name">${tmpProvider.highlight(pItem.Name, tmpQuery)}${pItem.Advanced ? '<span class="pict-nav-adv-pill">adv</span>' : ''}</span>${pItem.Description ? `<span class="pict-nav-list-row-desc">${tmpProvider.highlight(pItem.Description, tmpQuery)}</span>` : ''}</span>
					<span class="pict-nav-list-chev">${this.pict.icon('ChevronRight')}</span>
				</a>`;
			});
			tmpHTML += `</section>`;
		});
		if (tmpCategories.length === 0)
		{
			tmpHTML = `<div class="pict-nav-empty">Nothing matches your filter.</div>`;
		}
		this.pict.ContentAssignment.assignContent(this._resultsAddress(), tmpHTML);
	}

	onSearch(pValue)
	{
		this.navigationProvider.setQuery(pValue);
		this.repaint();
	}

	onToggleAdvanced(pChecked)
	{
		this.navigationProvider.setShowAdvanced(pChecked);
		this.repaint();
	}

	activate(pHash, pEvent)
	{
		if (pEvent) { pEvent.preventDefault(); }
		this.navigationProvider.navigate(pHash);
		return false;
	}
}

module.exports = PictViewNavigationList;
module.exports.default_configuration = default_configuration;
