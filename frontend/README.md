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
- `src/shared/`: design system styles, UI primitives, config and helpers. Nothing here imports from `pages` or `features`.

Import from `src` with the `@/` alias, for example `import { routes } from '@/shared/config/routes'`.
All paths live in `src/shared/config/routes.ts`.

## Docker

The image builds the static site and serves it with nginx. `nginx.conf` sends every unknown path to
`index.html`, so refreshing a route such as `/login` works, and
`/welcome` redirects to `/welcome/` (`absolute_redirect off` keeps the host and port).
`VITE_API_URL` (the gateway URL) is baked in at build time.
