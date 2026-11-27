# Levddit design decisions

The source of truth for how Levddit looks. Every visual choice that isn't obvious from `theme.css` is
recorded here with its date and reason; anything not covered is asked before it is built. The tokens
themselves live in `src/shared/styles/theme.css` (see the README's Styling section).

## Brand (from the welcome page, 2026-11)

- Colours from the Levi9 logo: ink `#141833`, accent `#2b3fa0` on white; the tint `surface` `#f1f3fa`.
- Type: Albert Sans for text and headings, DM Mono for numbers in cards.
- The forum document (`index.html`) uses the round radius scale (`data-radius="round"`), so `rounded-btn`
  is a pill there.

## Welcome page (2026-11-24)

| Decision | Value | Why |
|---|---|---|
| Closing footer | Content-sized with 48px vertical padding below 640px and 64px above; natural rows | Keeps the space below the final Join now button bounded instead of stretching to fill a viewport |
| Join anywhere band | Content-sized with 48px vertical padding below 640px and 64px above | Avoids empty viewport space above the heading and below the action |
| Globe camera fit | Fit the full atmosphere (1.16 globe radii) to the narrower field of view with a 4% margin, without a fixed minimum camera distance | Lets the globe fill its frame while retaining responsive framing |
| Hero sizing | Height follows content and section padding; natural grid rows stack below 1024px; the globe uses a square frame capped at 640px across seven desktop columns with clipped canvas and labels | Keeps the buttons in the document flow on tablets and short windows, and gives the globe stable proportions during resizing |
| Offices slideshow pause | A third round button after the two arrows, same look; pause and play icons | Anything that moves on its own needs a way to stop it (WCAG 2.2.2); placed where the other controls already are |

## Sign-in and sign-up (2026-11-24)

| Decision | Value | Why |
|---|---|---|
| Page | white (`bg-white`), the brand and one `max-w-form` (400px) column, centred in the window | A calm, single-task page, apart from the forum's frame |
| Illustrations | the two team scenes fixed to the window's bottom corners (`public/auth/`, background cut out), 220 to 460px and 220 to 450px wide with the window; the column is white and sits above them; left out under 768px wide or 600px tall | Brand warmth that stays put however long the form is; where they meet, the form stays readable; on a small screen the form needs all the room |
| Sign-in form | email and password together on one screen | Short and familiar; the backend never says whether an email has an account (it would let anyone list who is registered), so there is nothing to ask about the email on its own |
| Wrong password | "Invalid email or password" with "New here? Create an account", the email carried over | The same answer for an unknown email, with a way forward for someone new |
| Errors | the accent blue, with an icon, right under their field (or in a notice above the form), and the field marked invalid | The palette has no red; the icon and the placement carry the meaning, not the colour alone |
| Password | a show/hide eye; on sign-up the 12-character rule ticks off as it is met, and a four-step blue bar fills with the strength (length counts most) | The backend's only rule is the length (no composition rules, OWASP); the bar is advice |
| Headings | `text-h3` | A 400px column: `text-h2` is too big for it |

## Forum app frame (2026-11-19)

| Decision | Value | Why |
|---|---|---|
| Page background | `bg-canvas`, `#f8f9fd` | A white with a whisper of the brand blue, lighter than `surface`, so the white cards and bars still stand out |
| Cards and bars | white (`bg-bg`) with a `border-line` hairline | Content sits on white; the frame stays quiet |
| Top bar height | `h-app-bar`: 104px below 640px (56px controls row, 40px search, 8px bottom spacing); 56px from 640px | Phone search gets the full width below the controls so its placeholder and queries stay readable; the shared token also offsets page content |
| Sidebar toggle | Desktop: a 28×40px tab attached to the right edge, 12px below the top, with directional chevrons; mobile: close button inside the drawer | Keeps the collapse/expand control visible outside the scrolling navigation in both desktop states |
| Sidebar | `w-sidebar` 272px, collapses to a `w-rail` 64px icon rail on desktop (remembered per browser); a drawer over the page under 1024px | Room for community names, and a way to give the page more width |
| Page column | `max-w-feed`, 720px, centred in the space beside the sidebar | A readable line length for posts and comments |
| Search box | `rounded-btn` (a pill on the forum), 40px tall, up to 560px wide, line border, accent ring on focus. From 1024px it is centred over the page column (it follows the sidebar when it collapses), with the brand and the account pinned to the bar's edges | The same radius as the buttons; centred on the content it searches, not on the window |
| Community icon | the first letter, white on the accent blue, in a circle | There are no community images yet |
| Account | the user's initials on the `surface` tint plus the username (initials only on phones) | Tinted, so a person never looks like a community |
| Icons | `lucide-react`, 16 to 20px, inheriting the text colour | One consistent icon set |
| Active link | `aria-current="page"` gets the `surface` tint and `ink` text | The state is in the markup, so it is announced as well as seen |

## Search and discovery (2026-11-26)

| Decision | Value | Why |
|---|---|---|
| Dropdown groups | Small muted `text-label` labels "Posts" then "Communities"; up to four of each, continuous arrow-key navigation across both | Matches the existing option metadata style, and posts come first as on the page |
| Page sections | `<h2>` "Posts" then "Communities", each with its own loading/error/empty state and pagination | The page mirrors the dropdown's order and keeps each list independently readable |
| Section filter | Three plain buttons "All / Posts / Communities" using theme tokens, active one `bg-surface`, state in `aria-pressed` | "All" restores the stacked default after filtering; no new component or palette needed |
| No matches | Keep `<h1>Discover</h1>` with a muted note naming the query and a Clear button, then show unfiltered posts and active communities | The user still gets a useful page instead of two empty lists; the URL stays shareable |
