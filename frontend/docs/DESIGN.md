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
| Hero sizing | At least one viewport tall, growing with content; natural grid rows stack below 1024px; the globe uses a square frame capped at 560px with clipped canvas and labels | Keeps the buttons in the document flow on tablets and short windows, and gives the globe stable proportions during resizing |
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
| Top bar height | `h-app-bar`, 56px on every width | Compared with the welcome page's 72px: the forum is read for long stretches and vertical space is the feed's. 56 matches the welcome page's phone header |
| Sidebar | `w-sidebar` 272px, collapses to a `w-rail` 64px icon rail on desktop (remembered per browser); a drawer over the page under 1024px | Room for community names, and a way to give the page more width |
| Page column | `max-w-feed`, 720px, centred in the space beside the sidebar | A readable line length for posts and comments |
| Search box | `rounded-btn` (a pill on the forum), 40px tall, up to 560px wide, line border, accent ring on focus. From 1024px it is centred over the page column (it follows the sidebar when it collapses), with the brand and the account pinned to the bar's edges | The same radius as the buttons; centred on the content it searches, not on the window |
| Community icon | the first letter, white on the accent blue, in a circle | There are no community images yet |
| Account | the user's initials on the `surface` tint plus the username (initials only on phones) | Tinted, so a person never looks like a community |
| Icons | `lucide-react`, 16 to 20px, inheriting the text colour | One consistent icon set |
| Active link | `aria-current="page"` gets the `surface` tint and `ink` text | The state is in the markup, so it is announced as well as seen |
