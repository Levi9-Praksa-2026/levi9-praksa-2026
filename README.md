# levddit

<p align="center">
  <img src="https://img.shields.io/badge/Java-25-ED8B00?logo=openjdk&logoColor=white" alt="Java 25" />
  <img src="https://img.shields.io/badge/Spring%20Boot-4.1-6DB33F?logo=springboot&logoColor=white" alt="Spring Boot 4.1" />
  <img src="https://img.shields.io/badge/Spring%20Cloud-Gateway-6DB33F?logo=spring&logoColor=white" alt="Spring Cloud Gateway" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 17" />
  <img src="https://img.shields.io/badge/Flyway-migrations-CC0200?logo=flyway&logoColor=white" alt="Flyway" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white" alt="TypeScript 7" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker Compose" />
  <img src="https://img.shields.io/badge/AWS-S3-FF9900" alt="AWS S3" />
  <img src="https://img.shields.io/badge/Maven-build-C71A36?logo=apachemaven&logoColor=white" alt="Maven" />
  <img src="https://img.shields.io/badge/JUnit-5-25A162?logo=junit5&logoColor=white" alt="JUnit 5" />
  <img src="https://img.shields.io/badge/Testcontainers-real%20Postgres-2496ED" alt="Testcontainers" />
  <img src="https://img.shields.io/badge/GitHub%20Actions-CI-2088FF?logo=githubactions&logoColor=white" alt="GitHub Actions" />
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
    fe -->|"/api/**"| gw
    gw -->|"/api/auth, /api/users"| auth
    gw -->|"/api/communities"| comm
    gw -->|"/api/posts, /api/comments"| post
    gw -.->|"fetches public keys<br/>/.well-known/jwks.json"| auth

    auth --> sa
    comm --> sc
    post --> sp
    post -->|"post images"| s3

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

| Service | Schema | Models |
| --- | --- | --- |
| Auth | `auth` | Users, refresh tokens |
| Community | `community` | Communities, memberships |
| Post | `post` | Posts, images, comments, post votes, comment votes |

Flyway applies each service's migrations on startup, and Hibernate validates the JPA mappings.
Each service uses the usual Spring layout: `controller`, `service`, `repository`, `entity`, `dto`,
`exception`, `config` and `security`. The gateway only has `controller` and `security`.

Memberships and votes use a composite key made up of the target ID and user ID. When a feature
changes a membership or vote and updates a stored count or score, write both within the same
service transaction.

## Branches

```mermaid
flowchart LR
    f["feature/*"] -->|"PR"| d[develop] -->|"release PR"| m[main] -->|"deploy"| aws[(AWS)]

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

## On AWS

One environment in `eu-central-1`, all of it in Terraform under [`infra/`](infra).

```mermaid
flowchart LR
    user([Browser])

    cf["CloudFront<br/>HTTPS"]
    fe[("S3<br/>React build")]

    subgraph vpc[default VPC]
        alb["ALB<br/>HTTP :80"]

        subgraph ecs[ECS Fargate · Service Connect]
            gw["gateway"]
            auth["auth-service"]
            comm["community-service"]
            post["post-service"]
        end

        rds[("RDS PostgreSQL 17<br/>schema per service")]
    end

    media[("S3<br/>post images")]
    sm["Secrets Manager"]

    user -->|HTTPS| cf
    cf -->|"everything else"| fe
    cf -->|"/api, /oauth2, /login/oauth2,<br/>/connect, /.well-known, /logout"| alb
    alb --> gw
    gw --> auth & comm & post
    gw & auth & comm & post --> rds
    post --> media
    ecs -.->|"secrets"| sm

    classDef edge    fill:#ffffff,stroke:#0B1F4B,stroke-width:2px,color:#0B1F4B
    classDef gateway fill:#0B1F4B,stroke:#050f26,stroke-width:2px,color:#ffffff
    classDef service fill:#163A7A,stroke:#0B1F4B,color:#ffffff
    classDef data    fill:#2F5FB3,stroke:#163A7A,color:#ffffff

    class user,cf,alb,sm edge
    class gw gateway
    class auth,comm,post service
    class fe,rds,media data

    style vpc fill:transparent,stroke:#0B1F4B,stroke-dasharray:6 4
    style ecs fill:transparent,stroke:#163A7A
```

| Piece | What it does |
| --- | --- |
| CloudFront | The only public entry point. Sends the gateway's paths to the ALB and everything else to the React bucket. HTTPS to the browser, HTTP to the ALB. |
| ALB | Accepts traffic only from CloudFront: its security group allows CloudFront's address list, and its listener forwards only requests carrying the secret `X-Origin-Verify` header (anything else gets 403). |
| ECS Fargate | The four services, one task each, 0.5 vCPU / 1 GB. Only the gateway is behind the ALB; the others find each other by name through Service Connect (`http://auth-service:8081`, as in Docker Compose). A failing deployment rolls back by itself. |
| RDS | One PostgreSQL 17 instance, one database, a schema per service. Flyway creates the schemas on startup. Not publicly reachable. The master password is generated and rotated by RDS; the services read it from Secrets Manager themselves. |
| S3 | Post images, private and versioned. post-service serves them; the browser never reaches the bucket. |
| Secrets Manager | The JWT signing key and the gateway's OAuth client secret. Terraform creates the secrets empty; the values are put in by hand. |
| Security groups | The whole network boundary: CloudFront -> ALB -> gateway -> services -> RDS, each accepting only the layer before it. |

Everything runs in the default VPC's public subnets with public IPs and no NAT gateway, to keep the cost down.
`docs/production-changes.md` lists every setting the services need in production.

### Office hours

RDS and the four services run on weekdays only, 08:30-18:00 Belgrade time. EventBridge Scheduler starts RDS at
08:15 and the services at 08:30, then stops the services at 18:00 and RDS at 18:10. Outside those hours the site is
down. The ALB keeps running, because it has no off switch.

To run it outside office hours, start RDS first, wait until it is available, then scale the services to 1:

```bash
aws rds start-db-instance --db-instance-identifier levddit
aws ecs update-service --cluster levddit --service auth-service --desired-count 1
```

Do the same for `community-service`, `post-service` and `gateway`. The next scheduled stop turns them off again.

### Deploying the backend

1. Merge the release PR from `develop` into `main`.
2. The **Service images** workflow builds all four images and pushes them to ECR as `levddit/<service>:<commit SHA>`.
   It never deploys.
3. Once it finishes, run the **Terraform apply** workflow on `main` (Actions -> Terraform apply -> Run workflow).
   Each task definition points at the newest image's digest, so only services whose image actually changed are
   redeployed.

To roll back, set `image_tag` in `infra/variables.tf` to an older commit SHA (ECR keeps the last 10 images) and
apply again. Set it back to `null` afterwards.

### Changing the infrastructure

1. Change the Terraform in `infra/` on a feature branch.
2. The **Terraform plan** workflow comments the plan on the PR. It is read-only.
3. Merge to `develop`, then release to `main`. Merging never changes AWS.
4. Run **Terraform apply** on `main`. It stops if the plan deletes or replaces anything, unless you tick
   *Allow destroy*.

GitHub Actions gets short-lived AWS credentials through OIDC, so no AWS keys are stored in GitHub. The plan role
is read-only, and the apply and image-push roles only work from `main`. State is in the S3 bucket
`levddit-tfstate-466578118705`.

While RDS is stopped, a plan that changes the RDS instance fails to apply. Start the instance first.

## Status

| Area | State |
| --- | --- |
| Database schemas + migrations | done |
| Gateway routing, CORS, JWT verification | done |
| Auth: JWKS endpoint, delete user | done |
| Auth: register / login / refresh | in progress |
| Communities CRUD | in progress |
| Posts, comments, votes | in progress |
| AWS deployment | backend runs on ECS Fargate; CloudFront and the frontend deploy in progress |

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

### Coverage

After a successful build, open `coverage-report/target/site/jacoco-aggregate/index.html` for
combined backend coverage, with a breakdown per service. Each service still has to meet its own
70% line coverage. `coverage-status.html` next to it shows each service's verification result and
line coverage; missing execution data is marked unavailable rather than counted as 0%, and
coverage from a failed verification is labeled potentially partial.

CI runs all services with `--fail-at-end` and builds the coverage report even when verification
fails (failures still fail CI). The status table is in the GitHub run summary, and the
`maven-reports` artifact holds the combined report and `maven-verify.log`.

## Notes

- The community list is `GET /api/communities?sort=new|top&name=&page=&size=`. It returns active
  communities with only their name and member count; the default order is `new`. Admins list
  shut-down communities with `?inactive=true`: the *presence* of the parameter selects the admin
  handler, so `inactive=false` still requires ADMIN. The frontend's searchable directory is
  `/communities`.
- `sort=hot` is in the endpoints document but not implemented yet. It needs activity data from
  post-service's `/internal/posts/community-activity`, which is separate work.

## Docs

- [Database diagram](docs/Base.mermaid)
- [Error convention](docs/error-convention.md)
- [Security convention](docs/security-convention.md)
- [Production changes](docs/production-changes.md)
- [Task spec (PDF)](docs/Zadatak-Levi9-Reddit-Praksa.pdf)
- [API endpoints (PDF)](docs/levddit-api-endpoints.pdf)
