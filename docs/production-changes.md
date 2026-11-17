# Things to change in production

Local defaults that are fine for `docker compose up` on a laptop but must change before the AWS deploy.
Add an entry whenever you introduce a local-only shortcut. Each entry says what to change and why.

## auth-service

### JWT signing key
- **Local:** `APP_JWT_GENERATE_KEY=true` makes auth-service generate a temporary key pair in memory at every
  start. Nothing secret is needed, but every restart invalidates issued access tokens.
- **Production:** do **not** set `APP_JWT_GENERATE_KEY`. Create one key pair and give auth-service:
  - `APP_JWT_PRIVATE_KEY`: the contents of `private.pem` (one line or several both work)
  - `APP_JWT_KEY_ID`: a name for the key, for example `2026-11`

  ```bash
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
  ```
- Only auth-service gets the private key. The other services need nothing secret: they fetch the public key
  from auth-service's `/.well-known/jwks.json`.
- Never commit `private.pem`. Store it in the environment settings of the deploy target or a secret store.
- If neither a key nor the flag is set, auth-service refuses to start. That is on purpose.

## Database

### Credentials
- **Local:** `docker-compose.yml` falls back to `reddit` / `reddit_local` when `.env` does not override them.
- **Production:** set a strong `POSTGRES_PASSWORD` (or the RDS credentials) through the environment. Never rely on
  the compose defaults.

### Published port
- **Local:** Postgres is published on `5432` so you can connect from the host.
- **Production:** do not publish the database port. Only the services should reach it.

## post-service

### S3
- **Local:** `APP_S3_ENDPOINT=http://moto:5000` points post-service at Moto, a fake S3.
- **Production:** remove `APP_S3_ENDPOINT` so the AWS SDK uses real S3, and set `S3_BUCKET` and `AWS_REGION`
  if they differ from the defaults (`levddit-post-images`, `eu-central-1`).
