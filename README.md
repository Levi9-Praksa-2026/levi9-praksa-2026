# levddit

<p align="center">
  <img src="https://img.shields.io/badge/Java-25-0B1F4B?logo=openjdk&logoColor=white" alt="Java 25" />
  <img src="https://img.shields.io/badge/Spring%20Boot-4.1-0B1F4B?logo=springboot&logoColor=white" alt="Spring Boot 4.1" />
  <img src="https://img.shields.io/badge/Spring%20Cloud-Gateway-0B1F4B?logo=spring&logoColor=white" alt="Spring Cloud Gateway" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-0B1F4B?logo=postgresql&logoColor=white" alt="PostgreSQL 17" />
  <img src="https://img.shields.io/badge/Flyway-migrations-0B1F4B?logo=flyway&logoColor=white" alt="Flyway" />
  <img src="https://img.shields.io/badge/React-19-0B1F4B?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-0B1F4B?logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/TypeScript-7-0B1F4B?logo=typescript&logoColor=white" alt="TypeScript 7" />
  <img src="https://img.shields.io/badge/Docker-Compose-0B1F4B?logo=docker&logoColor=white" alt="Docker Compose" />
  <img src="https://img.shields.io/badge/AWS-S3-0B1F4B" alt="AWS S3" />
  <img src="https://img.shields.io/badge/Maven-build-0B1F4B?logo=apachemaven&logoColor=white" alt="Maven" />
  <img src="https://img.shields.io/badge/JUnit-5-0B1F4B?logo=junit5&logoColor=white" alt="JUnit 5" />
  <img src="https://img.shields.io/badge/Testcontainers-real%20Postgres-0B1F4B" alt="Testcontainers" />
  <img src="https://img.shields.io/badge/GitHub%20Actions-CI-0B1F4B?logo=githubactions&logoColor=white" alt="GitHub Actions" />
</p>

A small Reddit-style app built during the Levi9 Product & Cloud Engineering internship (2026).
Users can register, join communities, write posts with images, comment and vote.

## How it fits together

```mermaid
flowchart LR
    user([Browser])

    subgraph stack[docker compose]
        fe["frontend<br/>React · :3000"]
        gw["gateway<br/>:8080<br/>routing · CORS · JWT check"]

        subgraph services[Services]
            auth["auth-service<br/>:8081"]
            comm["community-service<br/>:8082"]
            post["post-service<br/>:8083"]
        end

        subgraph db[PostgreSQL]
            sa[(auth schema)]
            sc[(community schema)]
            sp[(post schema)]
        end

        s3[("S3<br/>(Moto locally)")]
    end

    user --> fe
    fe -->|/api/**| gw
    gw -->|/api/auth, /api/users| auth
    gw -->|/api/communities| comm
    gw -->|/api/posts, /api/comments| post
    gw -. fetches public keys<br/>/.well-known/jwks.json .-> auth

    auth --> sa
    comm --> sc
    post --> sp
    post -->|post images| s3

    classDef edge    fill:#ffffff,stroke:#0B1F4B,stroke-width:2px,color:#0B1F4B
    classDef gateway fill:#0B1F4B,stroke:#050f26,stroke-width:2px,color:#ffffff
    classDef service fill:#163A7A,stroke:#0B1F4B,color:#ffffff
    classDef schema  fill:#2F5FB3,stroke:#163A7A,color:#ffffff
    classDef storage fill:#ffffff,stroke:#2F5FB3,stroke-width:2px,stroke-dasharray:4 3,color:#0B1F4B

    class user,fe edge
    class gw gateway
    class auth,comm,post service
    class sa,sc,sp schema
    class s3 storage

    style stack    fill:transparent,stroke:#0B1F4B,stroke-dasharray:6 4
    style services fill:transparent,stroke:#163A7A
    style db       fill:transparent,stroke:#2F5FB3
```

- **Gateway** is the only backend entry point. It routes by path and checks the JWT signature
  against the auth service's public keys (JWKS). Each service still decides who may do what on
  its own routes.
- **auth-service** handles users, roles and refresh tokens, and signs the JWTs.
- **community-service** handles communities and memberships.
- **post-service** handles posts, comments and votes, and stores post images in S3.
- **Each service owns its own schema.** When data belongs to another service, it is stored
  only as an ID. No cross-schema joins.

## Branches

```mermaid
flowchart LR
    f[feature/*] -->|PR| d[develop] -->|release PR| m[main] -->|deploy| aws[(AWS)]

    classDef feature fill:#ffffff,stroke:#0B1F4B,stroke-width:2px,color:#0B1F4B
    classDef develop fill:#2F5FB3,stroke:#163A7A,color:#ffffff
    classDef main    fill:#0B1F4B,stroke:#050f26,color:#ffffff
    classDef cloud   fill:#ffffff,stroke:#2F5FB3,stroke-width:2px,stroke-dasharray:4 3,color:#0B1F4B

    class f feature
    class d develop
    class m main
    class aws cloud
```

`develop` is where work comes together, and `main` is what gets deployed. There is no staging environment.

## Status

| Area | State |
| --- | --- |
| Database schemas + migrations | done |
| Gateway routing, CORS, JWT verification | done |
| Auth: JWKS endpoint, delete user | done |
| Auth: register / login / refresh | in progress |
| Communities CRUD | in progress |
| Posts, comments, votes | in progress |
| AWS deployment | planned (week 3) |

## Run it locally

Requires Docker. For the backend checks without Docker Compose, you need Java 25.

```bash
docker compose up --build
```

| What | Where |
| --- | --- |
| Frontend | http://localhost:3000 |
| Gateway | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

Run the backend tests with `./mvnw verify`. The tests use Testcontainers against a real Postgres,
so Docker must be running.

## Docs

- [Database diagram](docs/Base.mermaid)
- [Error convention](docs/error-convention.md)
- [Security convention](docs/security-convention.md)
- [Production changes](docs/production-changes.md)
- [Task spec (PDF)](docs/Zadatak-Levi9-Reddit-Praksa.pdf)
- [API endpoints (PDF)](docs/levddit-api-endpoints.pdf)
