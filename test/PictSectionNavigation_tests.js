/*
	Unit tests for Pict Section: Navigation
*/

// Provide a DOM when browser-env is installed (parity with the other pict sections);
// the provider/export tests below run fine headless when it is not.
try { require('browser-env')(); } catch (pError) { /* headless */ }

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');

const libPictSectionNavigation = require('../source/Pict-Section-Navigation.js');
const libPictProviderNavigation = require('../source/providers/Pict-Provider-Navigation.js');
const libPictViewNavigationHub = require('../source/views/PictView-Navigation-Hub.js');
const libPictViewNavigationSidebar = require('../source/views/PictView-Navigation-Sidebar.js');
const libPictViewNavigationPalette = require('../source/views/PictView-Navigation-Palette.js');
const libPictViewNavigationList = require('../source/views/PictView-Navigation-List.js');

const _SAMPLE_GRAPH =
[
	{
		Name: 'Catalog', Icon: 'fa-book', Blurb: 'The books',
		Children:
		[
			{ Name: 'Books', Description: 'Every title in the store.', Icon: 'fa-book', Route: '#/Books', Keywords: 'titles isbn' },
			{ Name: 'Authors', Description: 'People who wrote the books.', Icon: 'fa-user-pen', Route: '#/Authors' },
			{ Name: 'Genres', Description: 'Shelving categories.', Icon: 'fa-tags', Route: '#/Genres', Advanced: true }
		]
	},
	{
		Name: 'Sales', Icon: 'fa-cart-shopping', Blurb: 'Orders & customers',
		Children:
		[
			{ Name: 'Orders', Description: 'Customer purchases.', Icon: 'fa-receipt', Route: '#/Orders' }
		]
	}
];

suite
(
	'Pict Section: Navigation',
	() =>
	{
		suite
		(
			'Module Exports',
			() =>
			{
				test('Default export is the navigation provider', (fDone) =>
				{
					Expect(libPictSectionNavigation).to.be.a('function');
					Expect(libPictSectionNavigation).to.equal(libPictProviderNavigation);
					Expect(libPictSectionNavigation.default_configuration).to.be.an('object');
					Expect(libPictSectionNavigation.default_configuration.ProviderIdentifier).to.equal('Pict-Navigation');
					return fDone();
				});
				test('Render-type views are exported', (fDone) =>
				{
					Expect(libPictSectionNavigation.PictViewNavigationHub).to.equal(libPictViewNavigationHub);
					Expect(libPictSectionNavigation.PictViewNavigationSidebar).to.equal(libPictViewNavigationSidebar);
					Expect(libPictSectionNavigation.PictViewNavigationPalette).to.equal(libPictViewNavigationPalette);
					Expect(libPictSectionNavigation.PictViewNavigationList).to.equal(libPictViewNavigationList);
					return fDone();
				});
				test('Each view exports a default_configuration with the expected ViewIdentifier', (fDone) =>
				{
					Expect(libPictViewNavigationHub.default_configuration.ViewIdentifier).to.equal('Navigation-Hub');
					Expect(libPictViewNavigationSidebar.default_configuration.ViewIdentifier).to.equal('Navigation-Sidebar');
					Expect(libPictViewNavigationPalette.default_configuration.ViewIdentifier).to.equal('Navigation-Palette');
					Expect(libPictViewNavigationList.default_configuration.ViewIdentifier).to.equal('Navigation-List');
					return fDone();
				});
			}
		);

		suite
		(
			'Provider — graph, search and navigation',
			() =>
			{
				let _Pict;
				let _Provider;

				setup(() =>
				{
					_Pict = new libPict();
					_Provider = _Pict.addProvider('Pict-Navigation', { NavigationGraph: _SAMPLE_GRAPH }, libPictProviderNavigation);
				});

				test('Registers the four render-type views', (fDone) =>
				{
					Expect(_Pict.views['Navigation-Hub']).to.be.an('object');
					Expect(_Pict.views['Navigation-Sidebar']).to.be.an('object');
					Expect(_Pict.views['Navigation-Palette']).to.be.an('object');
					Expect(_Pict.views['Navigation-List']).to.be.an('object');
					return fDone();
				});

				test('Normalizes the graph (assigns hashes + Children arrays)', (fDone) =>
				{
					let tmpGraph = _Provider.getNavigationGraph();
					Expect(tmpGraph).to.be.an('array').with.lengthOf(2);
					Expect(tmpGraph[0].Hash).to.equal('catalog');
					Expect(tmpGraph[0].Children[0].Hash).to.equal('catalog.books');
					Expect(tmpGraph[0].Children[0].IsLeaf).to.equal(true);
					Expect(tmpGraph[0].IsLeaf).to.equal(false);
					return fDone();
				});

				test('getFilteredCategories hides advanced items while browsing', (fDone) =>
				{
					let tmpCategories = _Provider.getFilteredCategories();
					let tmpCatalog = tmpCategories.find((pCat) => pCat.Hash === 'catalog');
					Expect(tmpCatalog.Items.map((pItem) => pItem.Name)).to.deep.equal([ 'Books', 'Authors' ]);
					return fDone();
				});

				test('getFilteredCategories with ShowAdvanced reveals advanced items', (fDone) =>
				{
					let tmpCategories = _Provider.getFilteredCategories({ ShowAdvanced: true });
					let tmpCatalog = tmpCategories.find((pCat) => pCat.Hash === 'catalog');
					Expect(tmpCatalog.Items.map((pItem) => pItem.Name)).to.include('Genres');
					return fDone();
				});

				test('Search filters by name/description/keywords and reveals advanced matches', (fDone) =>
				{
					_Provider.setQuery('isbn');
					let tmpCategories = _Provider.getFilteredCategories();
					Expect(tmpCategories).to.have.lengthOf(1);
					Expect(tmpCategories[0].Items.map((pItem) => pItem.Name)).to.deep.equal([ 'Books' ]);

					_Provider.setQuery('genre');
					let tmpFlat = _Provider.searchFlat();
					Expect(tmpFlat.map((pRow) => pRow.Item.Name)).to.include('Genres');
					return fDone();
				});

				test('highlight wraps matches in <mark>', (fDone) =>
				{
					let tmpHTML = _Provider.highlight('Customer Orders', 'order');
					Expect(tmpHTML).to.contain('<mark');
					Expect(tmpHTML.toLowerCase()).to.contain('order</mark>');
					return fDone();
				});

				test('navigate calls the host OnNavigate handler and sets active', (fDone) =>
				{
					let tmpNavigated = null;
					_Provider.onNavigate = (pNode) => { tmpNavigated = pNode; };
					_Provider.navigate('catalog.authors');
					Expect(tmpNavigated).to.be.an('object');
					Expect(tmpNavigated.Name).to.equal('Authors');
					Expect(_Provider.getActive()).to.equal('catalog.authors');
					return fDone();
				});

				test('setNavigationGraph replaces the tree', (fDone) =>
				{
					_Provider.setNavigationGraph([ { Name: 'Solo', Children: [ { Name: 'One', Route: '#/One' } ] } ]);
					let tmpGraph = _Provider.getNavigationGraph();
					Expect(tmpGraph).to.have.lengthOf(1);
					Expect(tmpGraph[0].Hash).to.equal('solo');
					Expect(_Provider.getNodeByHash('solo.one').Name).to.equal('One');
					return fDone();
				});
			}
		);

		suite
		(
			'Provider — render-type metadata & route lookup',
			() =>
			{
				let _Pict;
				let _Provider;

				setup(() =>
				{
					_Pict = new libPict();
					_Provider = _Pict.addProvider('Pict-Navigation', { NavigationGraph: _SAMPLE_GRAPH }, libPictProviderNavigation);
				});

				test('getRenderTypes lists the four types with layouts', (fDone) =>
				{
					let tmpTypes = _Provider.getRenderTypes();
					Expect(tmpTypes.map((pType) => pType.Key)).to.have.members([ 'Sidebar', 'Hub', 'List', 'Palette' ]);
					let tmpSidebar = tmpTypes.find((pType) => pType.Key === 'Sidebar');
					Expect(tmpSidebar.Layout).to.equal('rail');
					return fDone();
				});

				test('getRenderTypeLayout / isRailRenderType classify page vs rail', (fDone) =>
				{
					Expect(_Provider.getRenderTypeLayout('Sidebar')).to.equal('rail');
					Expect(_Provider.getRenderTypeLayout('Hub')).to.equal('page');
					Expect(_Provider.getRenderTypeLayout('Nope')).to.equal('page');
					Expect(_Provider.isRailRenderType('Sidebar')).to.equal(true);
					Expect(_Provider.isRailRenderType('Palette')).to.equal(false);
					return fDone();
				});

				test('getNodeByRoute matches on route (leading # optional)', (fDone) =>
				{
					Expect(_Provider.getNodeByRoute('#/Authors').Name).to.equal('Authors');
					Expect(_Provider.getNodeByRoute('/Authors').Name).to.equal('Authors');
					Expect(_Provider.getNodeByRoute('#/Nonexistent')).to.equal(null);
					return fDone();
				});

				test('setActiveByRoute marks the matching node active', (fDone) =>
				{
					let tmpNode = _Provider.setActiveByRoute('#/Orders');
					Expect(tmpNode.Name).to.equal('Orders');
					Expect(_Provider.getActive()).to.equal('sales.orders');
					_Provider.setActiveByRoute('#/Nope');
					Expect(_Provider.getActive()).to.equal(null);
					return fDone();
				});

				test('getFilteredCategories honors Scope (category-hash subset)', (fDone) =>
				{
					let tmpCategories = _Provider.getFilteredCategories({ Scope: [ 'sales' ] });
					Expect(tmpCategories.map((pCat) => pCat.Hash)).to.deep.equal([ 'sales' ]);
					return fDone();
				});

				test('getFilteredCategories honors Filter (per-item predicate)', (fDone) =>
				{
					let tmpCategories = _Provider.getFilteredCategories({ ShowAdvanced: true, Filter: (pItem) => pItem.Name !== 'Authors' });
					let tmpCatalog = tmpCategories.find((pCat) => pCat.Hash === 'catalog');
					Expect(tmpCatalog.Items.map((pItem) => pItem.Name)).to.not.include('Authors');
					Expect(tmpCatalog.Items.map((pItem) => pItem.Name)).to.include('Books');
					return fDone();
				});

				test('searchFlat honors Scope + Filter', (fDone) =>
				{
					let tmpRows = _Provider.searchFlat('', { Scope: [ 'catalog' ], Filter: (pItem) => !pItem.Advanced });
					let tmpNames = tmpRows.map((pRow) => pRow.Item.Name);
					Expect(tmpNames).to.include('Books');
					Expect(tmpNames).to.not.include('Orders');   // out of scope
					Expect(tmpNames).to.not.include('Genres');   // filtered (advanced)
					return fDone();
				});
			}
		);

		suite
		(
			'Provider — command-palette launcher',
			() =>
			{
				let _Pict;
				let _Provider;

				setup(() =>
				{
					_Pict = new libPict();
					_Provider = _Pict.addProvider('Pict-Navigation', { NavigationGraph: _SAMPLE_GRAPH }, libPictProviderNavigation);
				});

				test('Registers a launcher palette instance with its own local query', (fDone) =>
				{
					let tmpLauncher = _Pict.views['Navigation-Launcher'];
					Expect(tmpLauncher).to.be.an('object');
					Expect(tmpLauncher.options.UseLocalQuery).to.equal(true);
					// The launcher's local query must not touch the provider's shared query.
					_Provider.setQuery('shared-query');
					tmpLauncher._setQuery('launcher-query');
					Expect(tmpLauncher._getQuery()).to.equal('launcher-query');
					Expect(_Provider.getQuery()).to.equal('shared-query');
					return fDone();
				});

				test('isLauncherOpen starts false and bindLauncherHotkey returns an unbind fn', (fDone) =>
				{
					Expect(_Provider.isLauncherOpen()).to.equal(false);
					let tmpUnbind = _Provider.bindLauncherHotkey();
					Expect(tmpUnbind).to.be.a('function');
					if (typeof document !== 'undefined')
					{
						// Idempotent when a DOM is present and the listener is actually bound.
						Expect(_Provider.bindLauncherHotkey()).to.equal(tmpUnbind);
					}
					tmpUnbind();
					return fDone();
				});

				test('navigate() closes an open launcher', (fDone) =>
				{
					_Provider._launcherOpen = true;
					_Provider.onNavigate = () => {};
					_Provider.navigate('catalog.books');
					Expect(_Provider.isLauncherOpen()).to.equal(false);
					return fDone();
				});
			}
		);
	}
);
