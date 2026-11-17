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
