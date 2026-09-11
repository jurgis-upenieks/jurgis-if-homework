# Fluid sizing

`clamps.css` defines the application's eleven size levels. Every level uses
`clamp(minimum, min(width expression, height expression), maximum)` with rem
bounds. The smaller viewport expression controls the fluid value. Lower spacing
and layout minima keep resizing clearly visible from phones through desktop
screens. Maximum bounds are only 2% above the original scale, and the viewport
contributions keep laptop and desktop sizes close to the original scale. Levels stop
growing at their caps on larger displays. The rem contribution can sit below the
minimum so compact screens reach the lower bound instead of starting above it.
The bounds and rem contributions scale with the user's font preference. Secondary
text, body text, and touch controls retain minima of 0.875rem, 1rem, and 2.75rem;
borders and focus outlines retain their existing minima too.

Use one level from 0 to 10 through Tailwind: `gap-clamp-2`, `size-clamp-6`,
`min-h-clamp-7`, `max-w-clamp-10`, `text-clamp-4`, or `rounded-clamp-2`.
Text and radius tokens reference the same spacing values; they are not separate
scales. For other length utilities, use the token directly, for example
`@apply border-(length:--spacing-clamp-0)`.

| Level | Minimum | Maximum | Typical use |
| --- | --- | --- | --- |
| 0 | 0.0625rem | 0.1275rem | Borders and small offsets |
| 1 | 0.125rem | 0.255rem | Focus rings and fine gaps |
| 2 | 0.1875rem | 0.765rem | Compact gaps and corners |
| 3 | 0.875rem | 1.275rem | Secondary text |
| 4 | 1rem | 1.53rem | Body text and card gaps |
| 5 | 1rem | 2.55rem | Section gaps and brand text |
| 6 | 1.5rem | 4.08rem | Page headings and brand marks |
| 7 | 2.75rem | 4.59rem | Navigation targets and loading spinner |
| 8 | 3rem | 8.16rem | Header height and button width |
| 9 | 10rem | 28.56rem | Card minimum width and search width |
| 10 | 32rem | 97.92rem | Page maximum width |

Use `gap-layout-gap` for page gutters and section or card separation, and
`gap-content-gap` for card insets and spacing inside cards. Both use the central
clamp system: the layout gap grows with the smaller viewport dimension, bounded
by levels 2 and 5; the content gap caps that value at level 4. At a 273 × 700
viewport with the default root font size, both are about 8px. They return to the
existing level 5 and 4 values on larger screens. Fine gaps continue to use levels 1 and 2.

Buttons and input frames use `min-h-control-height`: 80% of level 7, with a
2.75rem minimum to preserve touch targets and scaling with font preferences.
The input field fills its frame without adding a second minimum height inside
the border, so inputs and buttons have matching outer heights. Text can still
increase control height when needed.

The default Tailwind spacing, text-size, radius, shadow, container, and breakpoint
scales are disabled. Use the clamp utilities in new components, including empty,
error, and not-found states. Shadow presets 1 and 2 derive their offsets and blur
from the same spacing levels.

Keep structural values such as zero, `full`, `auto`, `1fr`, unitless line heights,
and the viewport-filling page height. They express layout relationships rather
than a size level. Screen-reader-only utilities retain Tailwind's accessibility
implementation. Use gaps with grid or flex for spacing, and let content increase
control height when needed. Constrain grid track minimums with `min(100%, …)` and
use maximum widths on containers so the scale's lower bounds cannot cause overflow.

The catalogue wraps its toolbar and fits card columns to available space.
Card insets and title/detail separation use the content gap; brand/price
separation uses the fine levels, without stretched detail rows or distributed spacing.
Cards retain their content height; row placement follows normal grid flow.
An empty results grid is hidden so it cannot introduce an extra empty row's gap.

Catalogue and document pages share the dynamic viewport frame, background,
content width, page headings, and bounded scrolling content row.
The header and title stay visible on both pages. The catalogue toolbar, result
count, and pagination also stay outside its scrolling list, which returns to
the top when the page or search changes. Both content regions are keyboard-focusable.
Nonempty content regions retain a level 7 minimum height. If the viewport cannot
fit the controls and this minimum, the document can scroll to keep every region
reachable. Normal viewports retain the existing bounded layout and fixed controls.
Loading and error content use the same bounded content row.
The shared Base UI scroll area places its vertical track at the far right, from
the site header's bottom edge to the visible viewport's bottom edge. The page grid
reserves the header's intrinsic height and the existing clamp gaps, so the track
follows header wrapping and menu expansion without measured offsets.
When the main content includes a footer, its rows use the page's subgrid and the
track ends at the footer's top edge. The footer keeps its intrinsic height as its
controls wrap; pages without a footer keep the track down to the viewport bottom.
Its named viewport contains the semantic list or message,
and its content observer keeps the thumb synchronized with changing content heights.
A clamp-sized gutter keeps the track clear of the page controls, while the site
header spans the full width. Base UI supplies thumb sizing, dragging, and wheel handling;
native content scrolling and keyboard focus remain available inside the viewport.

The document page renders the repository README during the production build.
Its static route disables timed regeneration. Nested ordered lists use native
CSS counters for paragraph numbers and the shared clamp gaps for indentation.
Document paragraphs have no panels, section text uses regular weight, and code
uses the shared Courier monospace font token.

The shared query provider automatically displays a full-viewport loading overlay
for all active TanStack Query queries and mutations, including retries and
background refreshes. It stays visible until the last overlapping operation ends.
All application data calls use this provider; individual components do not need
loading-overlay flags or request wrappers.

The overlay uses the background theme color at 50% opacity and a rotating,
indeterminate Base UI progress spinner. Its modal fades in over 2 seconds and fades
out over 0.1 second using the shared transition-duration tokens. Rotation and fades
remain enabled with reduced-motion preferences.
The Base UI dialog blocks pointer, touch, keyboard, and scrolling interaction with
the page while loading. Escape and outside clicks cannot dismiss it.
The shared Input's `allowWhileLoading` option keeps an enabled input and its label
accessible above the overlay. With this option, the provider uses native `inert`
on surrounding content and preserves input focus; otherwise it uses the default
modal behavior. Other previously focused controls regain focus after loading.
Product search waits for 300 ms after typing stops before requesting page one,
and remains editable during requests. Enter submits pending text immediately.
Clear cancels pending typing immediately and returns to page one.
Search requires every whitespace-separated token to appear within the title,
in any order. Case, Unicode accents, repeated tokens, and extra whitespace do not
affect matching or trigger a new request for an equivalent search. Original input
text and product titles remain unchanged for display.

The generic application stylesheet defines the shared Tailwind theme mappings.
Business-specific global styles only configure the light and dark palettes;
generic components reference the generic stylesheet directly.

`gap-viewport-gap` and `min-h-viewport-band` also reserve 1.5 times level 9
before distributing spare dynamic viewport height. Gaps range from level 2 to
the layout gap; the header band caps at the smaller of level 8 and four layout
gaps while its contents determine its minimum height. Narrow and short screens
therefore reserve more room for results without changing text or control sizes.
The pagination row preserves the result count's minimum word width and lets
the controls wrap into the remaining space; wider screens retain centered pagination.

Navigation collapses only when its measured content and clamp gap no longer fit.
Its ResizeObserver changes visibility, never sizes or styles. Hidden navigation
remains measurable and inert; keyboard focus survives expansion and collapse.
There are no viewport breakpoints. The shared message component also supplies
the not-found, route-error, and global-error screens, including the independent
document required when the root layout fails.

Interaction tests cover intrinsic navigation, focus preservation, and fallback
recovery. Check fluid sizing in a real browser by measuring rendered element edges
against the selected tokens in portrait, landscape, and short desktop viewports,
with normal and enlarged root fonts. Unit tests do not simulate CSS layout.
