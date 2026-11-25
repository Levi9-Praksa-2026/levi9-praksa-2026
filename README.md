# levddit

Run the local stack with `docker compose up --build`. The frontend is at
`http://localhost:3000`, the gateway at `http://localhost:8080`, and PostgreSQL
at `localhost:5432`. See [the database diagram](docs/Base.mermaid) for the data model.

Each data service owns a PostgreSQL schema. Flyway applies its migrations on
startup, and Hibernate validates the JPA mappings. Each service uses the usual Spring
layout: `controller`, `service`, `repository`, `entity`, `dto`, `exception`, `config`
and `security`. The gateway only has `controller` and `security`.

| Service | Schema | Models |
| --- | --- | --- |
| Auth | `auth` | Users, refresh tokens |
| Community | `community` | Communities, memberships |
| Post | `post` | Posts, images, comments, post votes, comment votes |

References to records owned by another service are stored as IDs. Memberships
and votes use a composite key made up of the target ID and user ID. When a
feature changes a membership or vote and updates a stored count or score, write
both within the same service transaction.

Run the backend checks with `./mvnw verify` using Java 25 and Docker.
After a successful build, open `coverage-report/target/site/jacoco-aggregate/index.html`
for combined backend coverage, with a breakdown for each service. Each service still
must meet its own 70% line coverage requirement. CI includes the combined report in
its downloadable `maven-reports` artifact. CI attempts all independent services with
`--fail-at-end`, then generates coverage separately even after verification fails.
Open `coverage-status.html` alongside the combined report for each service's
verification result and measured line coverage. Missing execution data is marked
unavailable and excluded from the combined percentage, rather than counted as 0%.
Coverage from failed verification is labeled potentially partial. Failures still
fail CI. The status table also appears in the GitHub run summary, and the artifact
includes `maven-verify.log` for diagnosis.

The community list is `GET /api/communities?sort=new|top&name=&page=&size=`. It returns active communities
with only their name and member count; the default order is `new`. Admins list shut-down communities with
`?inactive=true`: the *presence* of the parameter selects the admin handler, so `inactive=false` still
requires ADMIN. The frontend's searchable directory is `/communities`. The endpoints document also defines
`sort=hot`, but that is not implemented yet — it needs activity data from post-service's
`/internal/posts/community-activity`, which is a separate piece of work.
