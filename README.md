# levddit

Run the local stack with `docker compose up --build`. The frontend is at
`http://localhost:3000`, the gateway at `http://localhost:8080`, and PostgreSQL
at `localhost:5432`. See [the database diagram](docs/Base.mermaid) for the data model.

Each data service owns a PostgreSQL schema. Flyway applies its migrations on
startup, and Hibernate validates the JPA mappings. Models are in `core.model`
and Spring Data repositories are in `infrastructure.repository`.

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
its downloadable `maven-reports` artifact. If a service fails, the aggregate report
is not generated; available individual test and coverage reports are still uploaded.

The community list is `GET /api/communities?sort=new|top&name=&page=&size=`. It returns active communities
with only their name and member count; the default order is `new`. The endpoints document also defines
`sort=hot`, but that is not implemented yet — it needs activity data from post-service's
`/internal/posts/community-activity`, which is a separate piece of work.
