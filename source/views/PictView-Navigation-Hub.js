const libPictViewClass = require('pict-view');

const html = String.raw;

/**
 * Navigation render type: HUB
 *
 * Categorized cards with inline descriptions and a live search. The "settings home"
 * pattern — best for discoverability and always-visible help.
 */
const default_configuration =
{
	"ViewIdentifier": "Navigation-Hub",
	"NavigationProviderHash": "Pict-Navigation",

	"ShowSearch": true,
	"ShowAdvancedToggle": true,
	"SearchPlaceholder": "Search…",

	"RenderOnLoad": false,
	"DefaultRenderable": "Navigation-Hub-Wrap",
	"DefaultDestinationAddress": "#Navigation-Container",

	"Templates":
	[
		{ "Hash": "Navigation-Hub-Container", "Template": html`<div class="pict-nav-hub-mount"></div>` }
	],
	"Renderables":
	[
		{
			"RenderableHash": "Navigation-Hub-Wrap",
			"TemplateHash": "Navigation-Hub-Container",
			"DestinationAddress": "#Navigation-Container",
			"RenderType": "replace"
		}
	],

	"CSS": /*css*/`
.pict-nav-hub-head { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.25rem; }
.pict-nav-hub-head .pict-nav-search { flex: 1 1 auto; }
.pict-nav-hub-cat { margin-bottom: 1.9rem; }
.pict-nav-hub-cat-head { display: flex; align-items: baseline; gap: 0.55rem; margin-bottom: 0.8rem; padding-bottom: 0.4rem; border-bottom: 2px solid var(--theme-color-border-light, #e8ebf0); }
.pict-nav-hub-cat.is-secondary .pict-nav-hub-cat-head { border-bottom-style: dashed; }
.pict-nav-hub-cat-head h3 { font-size: 1.12rem; font-weight: 700; margin: 0; color: var(--theme-color-text-primary, #1f2733); }
.pict-nav-hub-cat-ic { color: var(--theme-color-brand-primary, #156dd1); }
.pict-nav-hub-cat-blurb { color: var(--theme-color-text-muted, #6b7686); font-size: 0.84rem; }
.pict-nav-hub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.8rem; }
.pict-nav-hub-card { display: flex; gap: 0.8rem; align-items: flex-start; padding: 0.95rem 1rem; text-decoration: none; color: inherit;
	background: var(--theme-color-background-panel, #fff); border: 1px solid var(--theme-color-border-light, #e8ebf0); border-radius: 11px;
	transition: box-shadow .14s ease, transform .14s ease, border-color .14s ease; }
.pict-nav-hub-card:hover { box-shadow: 0 8px 20px color-mix(in srgb, var(--theme-color-shadow-color, rgba(15,23,42,0.12)) 80%, transparent);
	transform: translateY(-2px); border-color: var(--theme-color-brand-primary, #156dd1); }
.pict-nav-hub-card .pict-nav-ic { color: var(--theme-color-brand-primary, #156dd1); font-size: 1.4rem; display: inline-flex; align-items: center; }
.pict-nav-hub-card-text { min-width: 0; }
.pict-nav-hub-card-name { display: block; font-weight: 650; line-height: 1.15; }
.pict-nav-hub-card-desc { display: block; font-size: 0.82rem; color: var(--theme-color-text-muted, #6b7686); margin-top: 3px; line-height: 1.38; }
.pict-nav-adv-pill { font-size: 0.6rem; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--theme-color-text-muted, #6b7686);
	border: 1px solid var(--theme-color-border-default, #d7dce3); border-radius: 999px; padding: 1px 7px; margin-left: 6px; vertical-align: middle; }
`
};

class PictViewNavigationHub extends libPictViewClass
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
		return '#PictNav-Hub-Results-' + String(this.options.ViewIdentifier).replace(/[^a-zA-Z0-9]/g, '');
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
			const tmpShell = `<div class="pict-nav pict-nav-hub">
				<div class="pict-nav-hub-head">${tmpSearch}${tmpAdvanced}</div>
				<div id="${this._resultsAddress().slice(1)}" class="pict-nav-hub-results"></div>
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
			tmpHTML += `<section class="pict-nav-hub-cat ${pCategory.Secondary ? 'is-secondary' : ''}">
				<header class="pict-nav-hub-cat-head"><span class="pict-nav-hub-cat-ic"${tmpCatStyle}>${pCategory.Icon ? this.pict.icon(pCategory.Icon) : ''}</span><h3>${tmpProvider.escapeHTML(pCategory.Name)}</h3>${pCategory.Blurb ? `<span class="pict-nav-hub-cat-blurb">${tmpProvider.escapeHTML(pCategory.Blurb)}</span>` : ''}</header>
				<div class="pict-nav-hub-grid">`;
			pCategory.Items.forEach((pItem) =>
			{
				const tmpAccent = pItem.Accent || pCategory.Accent;
				const tmpIcStyle = tmpAccent ? ` style="color:${tmpAccent}"` : '';
				tmpHTML += `<a class="pict-nav-hub-card" href="${pItem.Route ? tmpProvider.escapeHTML(pItem.Route) : '#'}" onclick="return ${tmpHandler}.activate('${pItem.Hash}', event)">
					<span class="pict-nav-ic"${tmpIcStyle}>${pItem.Icon ? this.pict.icon(pItem.Icon) : ''}</span>
					<span class="pict-nav-hub-card-text"><span class="pict-nav-hub-card-name">${tmpProvider.highlight(pItem.Name, tmpQuery)}${pItem.Advanced ? '<span class="pict-nav-adv-pill">adv</span>' : ''}</span>${pItem.Description ? `<span class="pict-nav-hub-card-desc">${tmpProvider.highlight(pItem.Description, tmpQuery)}</span>` : ''}</span>
				</a>`;
			});
			tmpHTML += `</div></section>`;
		});
		if (tmpCategories.length === 0)
		{
			tmpHTML = `<div class="pict-nav-empty">Nothing matches your search.</div>`;
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

module.exports = PictViewNavigationHub;
module.exports.default_configuration = default_configuration;
