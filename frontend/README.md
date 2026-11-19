# Levddit frontend

React, TypeScript, Vite, React Router and Tailwind v4.

```bash
npm ci
npm run dev     # http://localhost:5173
npm run lint
npm run build   # type check + production build into dist/
```

## Layout

- `src/app/`: entry point, router and the root layout every forum screen renders in.
- `src/pages/`: one folder per route (`home`, `auth`, `not-found`).
- `src/pages/welcome/` + `welcome/index.html`: the welcome page at `/welcome/`. It is a separate document,
  not a React Router route, so links to it reload the page. The 3D globe (three.js) loads lazily and only there.
- `src/features/`: feature code shared by several pages, such as posts and communities.
- `src/shared/`: the theme, UI primitives, config and helpers. Nothing here imports from `pages` or `features`.

Import from `src` with the `@/` alias, for example `import { routes } from '@/shared/config/routes'`.
All paths live in `src/shared/config/routes.ts`.

## Styling

Tailwind v4 utilities, written on the elements. The stylesheets in `src/shared/styles/`:

- `theme.css`: the Levddit tokens (colours, fonts, type scale, radii, page rhythm) and their Tailwind names.
  Tailwind's own palette, fonts, sizes and radii are switched off, so only these exist:
  `bg-surface`, `text-ink`, `text-muted`, `text-accent`, `border-line`, `font-display`, `text-h2`,
  `rounded-btn`, `px-gut`, `h-nav`, `wrap` (the page column). `text-p-*` / `bg-p-*` are the fixed palette
  for pieces that look the same on any ground band (post cards). Spacing and breakpoints are Tailwind's
  (sm 640, md 768, lg 1024, xl 1280).
- Ground bands: a section with `ground-surface`, `ground-inverse` or `ground-brand` flips the colour roles,
  so `text-ink` is white on the blue band without any extra class.
- `base.css`: element defaults only (body, headings, paragraphs, focus ring).
- `hero-enter.css`: the hero's entrance animation, the one choreographed piece kept as CSS.
- `features/offices/office-globe.css`: the globe's labels, which three-globe creates outside React.

Rules of thumb:
- Class strings go through `cn` (`src/shared/lib/cn.ts`: clsx + tailwind-merge). When two classes set the same
  thing, the later one wins, so a `className` passed to a component overrides the component's own class
  (`<PostCard className="p-3" />`). A token added to `theme.css` must also be added to `cn.ts`, or tailwind-merge
  guesses its group and may drop it; `npm test` checks the groups.
- A look that repeats is a component with its classes inside (`Button`, `Section`, `PostCard`),
  not a CSS class and not `@apply`. Variants are a prop that picks a class string (see `Button.tsx`).
- No colour or size outside the theme: Tailwind's `bg-white` or `text-gray-500` produce nothing here.
  A one-off value can be arbitrary (`text-[15px]`), a value that repeats belongs in `theme.css`.
- States that span components have named variants in `theme.css`: `sheet:` (phone menu open),
  `item-open:` (a desktop nav menu shown), `expanded:`, `menu-instant:`, `noscript:`.
- Layout helpers live in `src/shared/ui/layout/screen.ts`: `screenSection`, `screenWrap` (one screen per
  section) and `grid12` (the 12-column grid; children use `col-span-*` from `lg`).

## Docker

The image builds the static site and serves it with nginx. `nginx.conf` sends every unknown path to
`index.html`, so refreshing a route such as `/login` works, and
`/welcome` redirects to `/welcome/` (`absolute_redirect off` keeps the host and port).
`VITE_API_URL` (the gateway URL) is baked in at build time.
