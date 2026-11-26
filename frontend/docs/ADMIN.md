# Administration

The admin area starts at `/admin`, inside the existing forum shell. Every child route is guarded by
`/api/me` roles before it mounts or fetches data. The backend remains responsible for authorization.
All admin reads and writes use the gateway session and the shared HTTP/CSRF wrapper; they do not use
`mockSignInAs` or the in-memory mock database.

## Implemented flows

| Page | Actions | Backend contract |
|---|---|---|
| `/admin` | Active/inactive community totals, top five communities, navigation | `GET /api/communities` with `sort=top`; `inactive=true` selects inactive communities |
| `/admin/communities` | Search, sort, paginate; create; edit description; confirm shutdown/reactivation | `GET /api/communities?inactive=true|false|all`, `POST /api/communities`, `GET/PATCH/DELETE /api/communities/{name}`, `POST /api/communities/{name}/reactivate` |
| `/admin/users` | Create user or admin accounts; search and paginate all accounts; filter Active/Banned/Deleted and All/Users/Admins; review formatted details; edit profiles from the list or details; ban with preset or custom reason; unban | `GET /api/admin/users?q=&status=&role=&page=&size=`, `POST /api/admin/users`, `PATCH /api/admin/users/{username}`, `POST/DELETE /api/admin/users/{username}/ban` |
| `/admin/posts` | Search/paginate posts, read full content and images, review paginated comments, confirm post removal, navigate to author moderation | `GET /api/posts`, `GET /api/posts/{id}/comments`, `DELETE /api/posts/{id}` |

Names cannot be changed. Shutdown and post removal are soft operations. Communities can be reactivated;
there is no post-restoration endpoint. Bans require a nonblank reason of at most 500 characters, forbid
admin targets, and revoke authorizations. Existing access tokens can remain valid for up to 15 minutes.
Unban restores login access, not previous sessions. Backend conflicts and field errors stay visible in
the dialog without clearing the user's input.

## Requirements versus the current backend

Reviewed `docs/Zadatak-Levi9-Reddit-Praksa.pdf`, `docs/levddit-api-endpoints.pdf`, the security and production
notes, and the controllers/services in auth-service, community-service, and post-service on develop.
Current controllers take precedence where the older endpoint PDF differs (ban namespace, inactive
parameter, and supported sorts).

The requirements assign admins removal of any post or comment. Post removal exists. Comment reads
exist, but there is no comment-removal controller on develop. Comment review therefore explains that
removal is unavailable and offers author moderation; it does not simulate successful removal.

The Create user dialog uses the existing registration rules and password fields. `POST /api/admin/users` is admin-only, reuses registration validation and BCrypt hashing, and creates the selected USER or ADMIN role without changing the administrator's session. The dialog defaults to User, and omission of the role in an older client request also defaults to USER. Public signup always creates USER accounts and has no role-selection field. Password confirmation is checked only in the client. On success, the directory returns to its first unfiltered page and refreshes; on failure, entered values are retained. No email or invitation is sent.

The details and edit dialogs reuse `UserProfileContent`: the same profile header, name/email positions, role/status badges, joined date and ban details. Editing replaces only first name, last name and email with inputs; the other information stays read-only. Dialog actions and mutation/validation state remain in their own dialog components.

The shared Edit user dialog updates first name, last name and email through `PATCH /api/admin/users/{username}`. It is available from each live account row and its details view; save/cancel returns to details when editing started there. Duplicate email errors preserve entered values. Admin editing does not require the target's password, supports banned accounts, and rejects deleted accounts. Username, role, password and moderation state are unchanged by profile edits.

The admin user directory returns names, email, role, account status, joined date, and ban details. It includes deleted accounts, but live accounts expose profile editing, and only live non-admin accounts expose ban/unban actions. Search matches username, email, first name or last name, ignoring case; wildcard characters are literal. Results are ordered newest first with ID as a stable tie-breaker. The optional role filter accepts `USER` or `ADMIN`; omitting it includes both. Role, status and search are combined before database pagination. The UI shows five accounts per page and keeps search, status, role and page in the URL; author links using `?username=` still work. Password hashes and authorization records are never returned. There is no report queue, audit-log, or platform-statistics endpoint. The normal public community page and
other pre-existing frontend operations still have mock helpers; this change does not migrate those.

## Design and validation

The admin pages reuse the forum shell, theme tokens, cards, typography, community avatars, Button,
TextField, Select, Notice, and Pagination. The shared Modal uses native dialog focus containment,
Escape handling, an accessible title, and focus restoration. TextArea follows the existing field styles.
Search/filter/page state is stored in the URL. Community status defaults to All: `GET /api/communities?inactive=all` returns a globally sorted, paginated mix of active and inactive rows with an `active` flag. Selecting Active or Inactive sends `inactive=false` or `inactive=true`. The presence of `inactive` requires ADMIN. Public requests omit it and remain active-only. All requests use the existing controller and gateway route; the UI URL still uses `status=active|inactive` for selected filters. Confirmations protect shutdown, reactivation, ban,
unban, and post removal; pending writes cannot be submitted twice.

Run `npm run build`, `npm run lint`, and `npm test` from `frontend/`. API contract tests cover real gateway
paths, encoded usernames, pagination, writes, and backend refusals. Access tests verify that protected
child pages do not mount for loading, anonymous, or regular-user sessions.
