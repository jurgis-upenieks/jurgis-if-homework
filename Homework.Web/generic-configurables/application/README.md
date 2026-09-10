# Fluid sizing

`clamps.css` defines the application's eleven size levels. Every level uses
`clamp(minimum, min(width expression, height expression), maximum)` with rem
bounds. The smaller viewport expression controls the fluid value. Every level
includes its rem minimum plus a viewport contribution, so it starts changing
on phone screens and continues through laptop, desktop, and 4K viewports.
The bounds and rem contributions scale with the user's font preference.

Use one level from 0 to 10 through Tailwind: `gap-clamp-4`, `size-clamp-6`,
`min-h-clamp-7`, `max-w-clamp-10`, `text-clamp-4`, or `rounded-clamp-2`.
Text and radius tokens reference the same spacing values; they are not separate
scales. For other length utilities, use the token directly, for example
`@apply border-(length:--spacing-clamp-0)`.

| Level | Minimum | Maximum | Typical use |
| --- | --- | --- | --- |
| 0 | 0.0625rem | 0.125rem | Borders and small offsets |
| 1 | 0.125rem | 0.25rem | Focus rings and fine gaps |
| 2 | 0.375rem | 0.75rem | Compact gaps and corners |
| 3 | 0.875rem | 1.25rem | Secondary text |
| 4 | 1rem | 1.5rem | Body text and card gaps |
| 5 | 1.25rem | 2.5rem | Section gaps and brand text |
| 6 | 2rem | 4rem | Page headings and brand marks |
| 7 | 2.75rem | 4.5rem | Interactive control minimum height |
| 8 | 4rem | 8rem | Header/footer height and button width |
| 9 | 14rem | 28rem | Card minimum width and search width |
| 10 | 48rem | 96rem | Page maximum width |

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
Card insets, title/detail separation, brand/price separation, and toolbar gaps
come directly from levels, without stretched detail rows or distributed spacing.
Cards retain their content height; row placement follows normal grid flow.
An empty results grid is hidden so it cannot introduce an extra empty row's gap.

Navigation collapses only when its measured content and clamp gap no longer fit.
Its ResizeObserver changes visibility, never sizes or styles. Hidden navigation
remains measurable and inert; keyboard focus survives expansion and collapse.
There are no viewport breakpoints. The shared message component also supplies
the not-found, route-error, and global-error screens, including the independent
document required when the root layout fails.

`Homework.Web.Tests/test/clamps.test.ts` checks the CSS expressions through
jsdom's CSS parser, both viewport axes from phones through 4K, bounds, root font
changes, ordered levels, readability, touch-target minima, and site-wide usage.
Interaction tests cover intrinsic navigation, focus preservation, and fallback
recovery. Also measure actual rendered element edges against the selected tokens
in portrait, landscape, and short desktop viewports after changing levels.
