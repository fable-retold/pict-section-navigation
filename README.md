# pict-section-navigation

> Categorized, searchable application navigation for Pict apps. One **navigation
> graph**, four swappable **render types** — a Hub of cards, a search-first Sidebar,
> a Command Palette, and a Grouped List — all with live search and inline help.

A Pict section built around a provider that holds your navigation as a JSON tree and
a set of views that render that same tree different ways. Decide the information
architecture once; try it as cards, a sidebar, a ⌘K palette, or a settings list
without touching your data.

## Installation

```bash
npm install pict-section-navigation
```

## Usage

```javascript
const libPict = require('pict');
const libPictSectionNavigation = require('pict-section-navigation');

const _Pict = new libPict();

// Register the provider with your navigation graph. It registers the four
// render-type views (Navigation-Hub, Navigation-Sidebar, Navigation-Palette,
// Navigation-List) for you.
_Pict.addProvider('Pict-Navigation',
    {
        NavigationGraph:
        [
            {
                Name: 'Catalog', Icon: 'fas fa-book', Accent: 'var(--theme-color-brand-primary)', Blurb: 'The books.',
                Children:
                [
                    { Name: 'Books',   Icon: 'fas fa-book',     Route: '#/books',   Keywords: 'title isbn', Description: 'Every title you sell.' },
                    { Name: 'Authors', Icon: 'fas fa-user-pen', Route: '#/authors',                         Description: 'Who wrote the books.' }
                ]
            }
        ]
    },
    libPictSectionNavigation);

// Route for real when an item is activated (otherwise hash-style Routes are followed).
_Pict.providers['Pict-Navigation'].onNavigate = (pNode) =>
{
    window.location.hash = (pNode.Route || '').replace(/^#/, '');
};

// Render any render type into a container.
_Pict.providers['Pict-Navigation'].render('Hub', '#Navigation-Container');
```

```html
<div id="Navigation-Container"></div>
```

## The navigation graph

A JSON tree of nodes. Top-level nodes are **categories**; their `Children` are the
**destinations**. Nodes are normalized on load (each gets a `Hash`).

| Field | Applies to | Meaning |
|---|---|---|
| `Name` | all | Display label. |
| `Description` | items | One-line inline help shown under the name. |
| `Blurb` | categories | Short tagline shown beside the category heading. |
| `Icon` | all | An icon class string, rendered as `<i class="…">` (Font Awesome, etc.). |
| `Accent` | all | A CSS color (or theme token) for the node's icon. |
| `Route` | items | Where the node goes. Hash routes (`#/…`) are followed by default. |
| `Keywords` | items | Extra words search should match. |
| `Advanced` | items | Hidden while browsing; revealed by "Show advanced" or a search. |
| `Secondary` | categories | De-emphasized section (e.g. analytics). |
| `Hash` | all | Stable id (auto-derived from `Name` if omitted). |
| `Children` | categories | The nodes inside the category. |

## Render types

All four read the same graph and provide live search; advanced items are progressively
disclosed and revealed by search. Each has a **layout** — `page` (renders as a home
screen) or `rail` (a persistent docked sidebar) — exposed via `getRenderTypes()` so a
host can build a "navigation style" chooser without hard-coding the list.

| Render type | View | Layout | |
|---|---|---|---|
| **Sidebar** | `Navigation-Sidebar` | `rail` | A grouped, searchable rail. Docked (`ShowDetail: false`) it is a persistent app sidebar; standalone (`ShowDetail: true`, the default) it is a two-pane home screen with a detail pane. |
| **Hub** | `Navigation-Hub` | `page` | Categorized cards with descriptions — the "settings home". |
| **List** | `Navigation-List` | `page` | A scannable single column of grouped name + description rows. |
| **Palette** | `Navigation-Palette` | `page` | A ⌘K-style search list with keyboard navigation (↑/↓/Enter/Esc) and category tags. Also the engine behind the launcher overlay. |

Each view takes a `NavigationProviderHash` option (default `Pict-Navigation`) so you
can point custom view instances at a specific provider.

### Page vs. rail — the docked sidebar

`getRenderTypeLayout(type)` / `isRailRenderType(type)` let a host treat the `Sidebar`
style as a **persistent docked rail** and the others as **home screens**. Render the
docked rail with one call:

```javascript
const nav = _Pict.providers['Pict-Navigation'];
if (nav.isRailRenderType(style))
{
    nav.renderSidebarDocked('#App-Sidebar');   // rail only; item clicks navigate the host
}
else
{
    nav.render(style, '#App-Home');             // Hub / List / Palette as a home screen
}
```

Keep the docked rail's active highlight in step with the current route from your router:

```javascript
nav.setActiveByRoute(window.location.hash);
_Pict.views['Navigation-Sidebar-Docked'].syncActive();
```

## Pre-filtered (scoped) rendering

Render a subset of the graph — the basis for topic / per-area nav pages. Pass `Scope`
(an array of category hashes) and/or `Filter` (an item predicate) to `render()`:

```javascript
// A topic page showing only the "people-access" category:
nav.render('List', '#Users-Nav', { Scope: ['people-access'] });
```

For app-wide gating (session/role visibility) set a **global filter** once — every
render (lists, docked sidebar, launcher) honors it, on top of any per-call `Scope`/`Filter`:

```javascript
// Hide items flagged { Headlight: true } unless this is the Headlight session:
nav.setGlobalFilter((item) => !item.Headlight || isHeadlightSession());
```

`getFilteredCategories({ Scope, Filter })` and `searchFlat(query, { Scope, Filter })`
accept the same options directly.

## Command-palette launcher (⌘K) + keyboard

The provider ships a built-in **launcher overlay** — the Palette render type in a
centered modal over a backdrop, the Slack/Linear quick-switcher. It has its own local
search (so it never disturbs a docked sidebar's state) and closes on navigate, backdrop
click, or Escape.

```javascript
nav.bindLauncherHotkey();   // ⌘K / Ctrl+K toggles the launcher; Escape closes it
// or drive it yourself:
nav.openLauncher();  nav.closeLauncher();  nav.toggleLauncher();  nav.isLauncherOpen();
```

`bindLauncherHotkey()` installs one safe, capture-phase `keydown` listener (it only ever
intercepts ⌘/Ctrl+K and Escape-while-open) and returns an idempotent unbind function.

## Provider API

**Graph & search**
- `setNavigationGraph(pGraph)` / `getNavigationGraph()` — set / get the (normalized) tree.
- `getFilteredCategories(pOptions?)` — categories with their items filtered by `Query` + `ShowAdvanced` (and optional `Scope` / `Filter`). The data source for hub / sidebar / list.
- `searchFlat(pQuery?, pOptions?)` — a flat `[{ Item, Category }]` of all matching items (palette); honors `Scope` / `Filter`.
- `setGlobalFilter(fn)` / `getGlobalFilter()` — an app-wide item gate applied to every render.
- `setQuery` / `getQuery`, `setShowAdvanced` / `getShowAdvanced`, `setActive` / `getActive`.
- `matchesNode(pNode, pQuery)`, `highlight(pText, pQuery)`, `escapeHTML(pStr)`.

**Lookup & navigation**
- `getNodeByHash(pHash)` / `getNodeByRoute(pRoute)` — find a node by hash or route (leading `#` optional).
- `setActiveByRoute(pRoute)` — mark the node matching a route active (for syncing a docked rail).
- `navigate(pNodeOrHash)` — activate a node (calls `onNavigate`, else follows a hash `Route`; dismisses the launcher if open).

**Render types & layout**
- `getRenderTypes()` — `[{ Key, Label, Layout, Icon, Blurb }]`, in display order (build a chooser from this).
- `getRenderTypeLayout(pType)` / `isRailRenderType(pType)` — `'page'` vs `'rail'`.
- `render(pRenderType, pDestinationAddress?)` — render a render type into a destination.
- `renderSidebarDocked(pDestinationAddress)` — render the Sidebar as a docked rail (rail only; item clicks navigate).

**Launcher & keyboard**
- `openLauncher()` / `closeLauncher()` / `toggleLauncher()` / `isLauncherOpen()`.
- `bindLauncherHotkey()` — install the ⌘/Ctrl+K + Escape global shortcut; returns an idempotent unbind fn.

## Theming

The views paint with the pict `--theme-color-*` tokens (with neutral fallbacks), so
they inherit a `pict-provider-theme` / host theme automatically. Node icons use the
host's icon font; the views' own chrome glyphs come from the Pict icon registry.

## Example Application

See `example_applications/bookstore/` — one bookstore back-office navigation graph
rendered all four ways, with a render-type switcher.

```bash
cd example_applications/bookstore
npm run build      # quack build + copy
npm run serve      # http://localhost:8236
```

## License

[MIT](./LICENSE) — same as the rest of the Retold suite.
