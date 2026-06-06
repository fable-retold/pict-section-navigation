const libPictApplication = require('pict-application');
const libPictView = require('pict-view');

// Require the module's local source directly (this example ships inside the
// unpublished module). A published consumer would require('pict-section-navigation').
const libPictSectionNavigation = require('../../../source/Pict-Section-Navigation.js');

const html = String.raw;

// ── The navigation graph: a bookstore back-office, organized by area ──────────
// Category nodes carry an Icon, Accent (a CSS color — here theme tokens) and a
// Blurb; their Children are the destinations, each with a one-line help
// Description, an Icon, a Route, search Keywords, and an optional Advanced flag.
const _BOOKSTORE_GRAPH =
[
	{
		Name: 'Catalog', Icon: 'fas fa-book', Accent: 'var(--theme-color-brand-primary, #156dd1)', Blurb: 'The books and how they are described.',
		Children:
		[
			{ Name: 'Books', Icon: 'fas fa-book', Route: '#/books', Keywords: 'title isbn sku', Description: 'Every title you sell — ISBNs, formats, prices, and descriptions.' },
			{ Name: 'Authors', Icon: 'fas fa-user-pen', Route: '#/authors', Keywords: 'writer contributor', Description: 'The people who wrote the books, with bios and photos.' },
			{ Name: 'Series', Icon: 'fas fa-layer-group', Route: '#/series', Keywords: 'collection saga', Description: 'Multi-book series and the order titles belong in.' },
			{ Name: 'Genres', Icon: 'fas fa-tags', Route: '#/genres', Keywords: 'category shelf subject', Description: 'The shelving categories used to organize the catalog.' },
			{ Name: 'Editions', Icon: 'fas fa-clone', Route: '#/editions', Keywords: 'hardcover paperback ebook audio format', Advanced: true, Description: 'Format-specific editions (hardcover, paperback, ebook, audio) of a title.' },
			{ Name: 'Catalog Tags', Icon: 'fas fa-hashtag', Route: '#/catalog-tags', Keywords: 'label merchandising', Advanced: true, Description: 'Free-form merchandising tags for staff picks, awards, and themes.' }
		]
	},
	{
		Name: 'Inventory', Icon: 'fas fa-boxes-stacked', Accent: 'var(--theme-color-status-info, #0e8fa8)', Blurb: 'Stock, suppliers, and replenishment.',
		Children:
		[
			{ Name: 'Stock Levels', Icon: 'fas fa-warehouse', Route: '#/stock', Keywords: 'quantity on hand availability', Description: 'On-hand quantities per title and location, with low-stock alerts.' },
			{ Name: 'Suppliers', Icon: 'fas fa-truck-field', Route: '#/suppliers', Keywords: 'distributor vendor wholesaler', Description: 'Distributors and publishers you reorder from, and their terms.' },
			{ Name: 'Purchase Orders', Icon: 'fas fa-file-invoice', Route: '#/purchase-orders', Keywords: 'reorder restock po', Description: 'Restock orders to suppliers and their receiving status.' },
			{ Name: 'Warehouses', Icon: 'fas fa-building-circle-check', Route: '#/warehouses', Keywords: 'location stockroom', Advanced: true, Description: 'Physical stock locations and their fulfillment priority.' }
		]
	},
	{
		Name: 'Sales', Icon: 'fas fa-cart-shopping', Accent: 'var(--theme-color-status-success, #2e7a3a)', Blurb: 'Orders, customers, and the money.',
		Children:
		[
			{ Name: 'Orders', Icon: 'fas fa-receipt', Route: '#/orders', Keywords: 'purchase checkout', Description: 'Customer purchases, their line items, fulfillment, and payment status.' },
			{ Name: 'Customers', Icon: 'fas fa-users', Route: '#/customers', Keywords: 'account shopper member', Description: 'Shopper accounts, contact details, and order history.' },
			{ Name: 'Returns', Icon: 'fas fa-rotate-left', Route: '#/returns', Keywords: 'refund rma exchange', Description: 'Return requests, refunds, and exchange handling.' },
			{ Name: 'Gift Cards', Icon: 'fas fa-gift', Route: '#/gift-cards', Keywords: 'voucher balance', Description: 'Issued gift cards, balances, and redemption history.' },
			{ Name: 'Discounts', Icon: 'fas fa-percent', Route: '#/discounts', Keywords: 'coupon promo code sale', Description: 'Coupon codes and automatic discount rules.' }
		]
	},
	{
		Name: 'Marketing', Icon: 'fas fa-bullhorn', Accent: 'var(--theme-color-status-warning, #a86b00)', Blurb: 'Reach readers and grow the list.',
		Children:
		[
			{ Name: 'Promotions', Icon: 'fas fa-star', Route: '#/promotions', Keywords: 'campaign feature sale', Description: 'Featured campaigns, bundles, and seasonal sales.' },
			{ Name: 'Reviews', Icon: 'fas fa-comment-dots', Route: '#/reviews', Keywords: 'rating feedback', Description: 'Customer reviews and ratings, and their moderation.' },
			{ Name: 'Newsletters', Icon: 'fas fa-envelope-open-text', Route: '#/newsletters', Keywords: 'email subscriber list', Description: 'Email campaigns and subscriber segments.' },
			{ Name: 'Recommendations', Icon: 'fas fa-wand-magic-sparkles', Route: '#/recommendations', Keywords: 'related also bought engine', Advanced: true, Description: 'The "readers also bought" rules and related-title engine.' }
		]
	},
	{
		Name: 'Storefront', Icon: 'fas fa-store', Accent: 'var(--theme-color-brand-secondary, #5569f0)', Blurb: 'What shoppers see online.',
		Children:
		[
			{ Name: 'Pages', Icon: 'fas fa-file-lines', Route: '#/pages', Keywords: 'content cms about', Description: 'Editable content pages — About, FAQ, events, and more.' },
			{ Name: 'Menus', Icon: 'fas fa-bars', Route: '#/menus', Keywords: 'navigation header footer', Description: 'The storefront navigation menus shoppers browse.' },
			{ Name: 'Banners', Icon: 'fas fa-image', Route: '#/banners', Keywords: 'hero carousel promo', Description: 'Homepage hero banners and promotional slots.' },
			{ Name: 'Themes', Icon: 'fas fa-palette', Route: '#/themes', Keywords: 'design appearance brand', Description: 'The storefront look — colors, fonts, and layout.' }
		]
	},
	{
		Name: 'Reports', Icon: 'fas fa-chart-line', Accent: 'var(--theme-color-status-info, #0e8fa8)', Secondary: true, Blurb: 'Read-only insight into the business.',
		Children:
		[
			{ Name: 'Sales Reports', Icon: 'fas fa-chart-column', Route: '#/reports/sales', Keywords: 'revenue trend', Description: 'Revenue, units, and trends over time.' },
			{ Name: 'Inventory Reports', Icon: 'fas fa-clipboard-list', Route: '#/reports/inventory', Keywords: 'turnover aging stock', Description: 'Stock turnover, aging, and reorder forecasting.' },
			{ Name: 'Customer Insights', Icon: 'fas fa-chart-pie', Route: '#/reports/customers', Keywords: 'cohort retention ltv', Description: 'Cohorts, retention, and lifetime value.' },
			{ Name: 'Bestsellers', Icon: 'fas fa-trophy', Route: '#/reports/bestsellers', Keywords: 'top ranking popular', Description: 'Top titles by sales, returns, and reviews.' }
		]
	},
	{
		Name: 'Settings', Icon: 'fas fa-gear', Accent: 'var(--theme-color-text-secondary, #45505f)', Blurb: 'How the store itself is configured.',
		Children:
		[
			{ Name: 'Store Profile', Icon: 'fas fa-shop', Route: '#/settings/profile', Keywords: 'name address hours', Description: 'Store name, locations, hours, and contact details.' },
			{ Name: 'Shipping', Icon: 'fas fa-truck-fast', Route: '#/settings/shipping', Keywords: 'rates carrier delivery', Description: 'Shipping zones, rates, and carrier options.' },
			{ Name: 'Taxes', Icon: 'fas fa-coins', Route: '#/settings/taxes', Keywords: 'rate jurisdiction vat', Description: 'Tax rates by jurisdiction and product class.' },
			{ Name: 'Payments', Icon: 'fas fa-credit-card', Route: '#/settings/payments', Keywords: 'gateway processor card', Description: 'Payment gateways and accepted methods.' },
			{ Name: 'Staff & Roles', Icon: 'fas fa-user-shield', Route: '#/settings/staff', Keywords: 'employee permission access', Advanced: true, Description: 'Staff accounts and what each role is allowed to do.' },
			{ Name: 'Integrations', Icon: 'fas fa-plug', Route: '#/settings/integrations', Keywords: 'api webhook connect', Advanced: true, Description: 'Connected services, API keys, and webhooks.' }
		]
	}
];

const _RENDER_TYPES = [ 'Hub', 'Sidebar', 'Palette', 'List' ];

class BookstoreShellView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._activeType = 'Hub';
	}

	onAfterRender(pRenderable)
	{
		super.onAfterRender(pRenderable);
		this.pict.CSSMap.injectCSS();
		this.show(this._activeType);
	}

	/** Render one render type into the shared container and mark its switch button active. */
	show(pRenderType)
	{
		this._activeType = pRenderType;
		_RENDER_TYPES.forEach((pType) =>
		{
			this.pict.ContentAssignment[(pType === pRenderType) ? 'addClass' : 'removeClass'](`#BookstoreSwitch-${pType}`, 'is-active');
		});
		const tmpProvider = this.pict.providers['Pict-Navigation'];
		if (tmpProvider) { tmpProvider.render(pRenderType, '#Navigation-Container'); }
	}

	/** The example does not actually route — show where a click would go. */
	showToast(pNode)
	{
		this.pict.ContentAssignment.assignContent('#Bookstore-Toast',
			`<span class="bk-toast-ic">${this.pict.icon('ExternalLink')}</span> Would open <code>${pNode.Route || pNode.Hash}</code> · <strong>${pNode.Name}</strong>`);
		this.pict.ContentAssignment.addClass('#Bookstore-Toast', 'show');
		if (this._toastTimer) { clearTimeout(this._toastTimer); }
		this._toastTimer = setTimeout(() => this.pict.ContentAssignment.removeClass('#Bookstore-Toast', 'show'), 2200);
	}
}

const _ShellViewConfiguration =
{
	"ViewIdentifier": "BookstoreShell",
	"RenderOnLoad": true,
	"DefaultRenderable": "Bookstore-Shell-Wrap",
	"DefaultDestinationAddress": "#Bookstore-Container",

	"Templates":
	[
		{
			"Hash": "Bookstore-Shell-Template",
			"Template": html`
				<div class="bk-switch">
					<span class="bk-switch-label">Render type</span>
					<button id="BookstoreSwitch-Hub" class="bk-switch-btn is-active" onclick="_Pict.views.BookstoreShell.show('Hub')">Hub</button>
					<button id="BookstoreSwitch-Sidebar" class="bk-switch-btn" onclick="_Pict.views.BookstoreShell.show('Sidebar')">Sidebar</button>
					<button id="BookstoreSwitch-Palette" class="bk-switch-btn" onclick="_Pict.views.BookstoreShell.show('Palette')">Command Palette</button>
					<button id="BookstoreSwitch-List" class="bk-switch-btn" onclick="_Pict.views.BookstoreShell.show('List')">List</button>
					<span class="bk-kbd-hint">Press <kbd>⌘</kbd><kbd>K</kbd> (or <kbd>Ctrl</kbd><kbd>K</kbd>) to launch</span>
				</div>
				<div id="Navigation-Container" class="pict-nav bk-nav-host"></div>
				<div id="Bookstore-Toast" class="bk-toast"></div>`
		}
	],
	"Renderables":
	[
		{
			"RenderableHash": "Bookstore-Shell-Wrap",
			"TemplateHash": "Bookstore-Shell-Template",
			"DestinationAddress": "#Bookstore-Container",
			"RenderType": "replace"
		}
	],

	"CSS": /*css*/`
.bk-switch { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
.bk-switch-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--theme-color-text-muted, #6b7686); margin-right: 0.25rem; }
.bk-switch-btn { font: inherit; font-size: 0.85rem; padding: 0.4rem 0.9rem; border: 1px solid var(--theme-color-border-default, #d7dce3); background: var(--theme-color-background-panel, #fff); color: var(--theme-color-text-secondary, #45505f); border-radius: 8px; cursor: pointer; }
.bk-switch-btn:hover { border-color: var(--theme-color-brand-primary, #156dd1); }
.bk-switch-btn.is-active { background: var(--theme-color-brand-primary, #156dd1); border-color: var(--theme-color-brand-primary, #156dd1); color: var(--theme-color-text-on-brand, #fff); font-weight: 600; }
.bk-kbd-hint { margin-left: auto; font-size: 0.78rem; color: var(--theme-color-text-muted, #6b7686); }
.bk-kbd-hint kbd { background: var(--theme-color-background-tertiary, #eceef2); border: 1px solid var(--theme-color-border-default, #d7dce3); border-radius: 4px; padding: 0 5px; font: inherit; font-weight: 700; margin: 0 1px; }
.bk-nav-host { min-height: 60vh; }
/* The Sidebar render type lays out as a full-height flex row; give it room. */
#BookstoreSwitch-Sidebar.is-active ~ #Navigation-Container, .bk-nav-host:has(.pict-nav-sidebar) { height: calc(100vh - 230px); min-height: 460px; }
.bk-toast { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%) translateY(20px); background: var(--theme-color-background-panel, #fff); color: var(--theme-color-text-primary, #1f2733); border: 1px solid var(--theme-color-border-default, #d7dce3); box-shadow: 0 12px 30px var(--theme-color-shadow-color, rgba(15,23,42,0.18)); border-radius: 10px; padding: 0.65rem 1.1rem; opacity: 0; pointer-events: none; transition: opacity .2s ease, transform .2s ease; z-index: 2000; font-size: 0.9rem; }
.bk-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.bk-toast code { background: var(--theme-color-background-tertiary, #eceef2); padding: 1px 6px; border-radius: 5px; }
.bk-toast-ic { color: var(--theme-color-brand-primary, #156dd1); }
`
};

class BookstoreApplication extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		// The provider holds the graph and registers the render-type views.
		this.pict.addProvider('Pict-Navigation', { NavigationGraph: _BOOKSTORE_GRAPH }, libPictSectionNavigation);
		// This example just reports where a click would go; a real app would route here.
		this.pict.providers['Pict-Navigation'].onNavigate = (pNode) =>
		{
			const tmpShell = this.pict.views.BookstoreShell;
			if (tmpShell) { tmpShell.showToast(pNode); }
		};

		// Demonstrate the command-palette launcher: ⌘K / Ctrl+K opens it, Escape closes.
		this.pict.providers['Pict-Navigation'].bindLauncherHotkey();

		this.pict.addView('BookstoreShell', _ShellViewConfiguration, BookstoreShellView);
	}
}

module.exports = BookstoreApplication;

module.exports.default_configuration =
{
	"Name": "Bookstore Admin Navigation",
	"Hash": "BookstoreNav",

	"MainViewportViewIdentifier": "BookstoreShell",
	"MainViewportRenderableHash": "Bookstore-Shell-Wrap",
	"MainViewportDestinationAddress": "#Bookstore-Container",
	"AutoRenderMainViewportViewAfterInitialize": true,

	"pict_configuration":
	{
		"Product": "BookstoreNav"
	}
};
