// The container for all the Pict-Section-Navigation related code.

// The navigation provider (primary API surface — holds the navigation graph and
// registers the render-type views).
const PictProviderNavigation = require('./providers/Pict-Provider-Navigation.js');

// The render-type views (also auto-registered by the provider).
const PictViewNavigationHub = require('./views/PictView-Navigation-Hub.js');
const PictViewNavigationSidebar = require('./views/PictView-Navigation-Sidebar.js');
const PictViewNavigationPalette = require('./views/PictView-Navigation-Palette.js');
const PictViewNavigationList = require('./views/PictView-Navigation-List.js');

module.exports = PictProviderNavigation;

module.exports.PictProviderNavigation = PictProviderNavigation;
module.exports.PictViewNavigationHub = PictViewNavigationHub;
module.exports.PictViewNavigationSidebar = PictViewNavigationSidebar;
module.exports.PictViewNavigationPalette = PictViewNavigationPalette;
module.exports.PictViewNavigationList = PictViewNavigationList;
