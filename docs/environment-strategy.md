# Environment Strategy

Snacky uses three environments, each backed by a separate Supabase project instance.

## Environments

### Local Development

| Component          | Configuration                                                           |
| ------------------ | ----------------------------------------------------------------------- |
| **Supabase**       | `supabase start` — runs Postgres, Auth, Storage, Edge Runtime in Docker |
| **Database**       | Local Postgres 17 on port 54322, seeded with `supabase/seed.sql`        |
| **Auth**           | Google OAuth with `skip_nonce_check = true` for mobile testing          |
| **Edge Functions** | `supabase functions serve` — hot-reload Deno runtime                    |
| **Studio**         | http://127.0.0.1:54323 — local dashboard for DB/Auth inspection         |
| **Mobile App**     | Metro dev server, connects to local Supabase via `.env`                 |

**Setup:**

```bash
# Start local Supabase stack
supabase start

# Serve Edge Functions (separate terminal)
supabase functions serve

# Start mobile app
pnpm ios   # or pnpm android
```

**Reset database:**

```bash
supabase db reset   # drops, re-applies migrations, runs seed.sql
```

### Staging

| Component          | Configuration                                                  |
| ------------------ | -------------------------------------------------------------- |
| **Supabase**       | Cloud project (linked via `supabase link --project-ref <ref>`) |
| **Database**       | Managed Postgres, migrations applied via `supabase db push`    |
| **Auth**           | Google OAuth with staging client IDs                           |
| **Edge Functions** | Deployed via `supabase functions deploy --all`                 |
| **Mobile App**     | Debug build pointing to staging Supabase URL                   |

**Deployment (automated via `deploy-staging.yml` on push to `main`):**

```bash
supabase db push        # apply pending migrations
supabase functions deploy --all   # deploy all Edge Functions
```

### Production

| Component          | Configuration                                                   |
| ------------------ | --------------------------------------------------------------- |
| **Supabase**       | Separate cloud project with production-grade settings           |
| **Database**       | Managed Postgres with connection pooling enabled, daily backups |
| **Auth**           | Google OAuth with production client IDs, rate limiting enabled  |
| **Edge Functions** | Deployed manually or via release workflow                       |
| **Mobile App**     | Release build signed with production keys                       |

**Production deployment requires manual approval.**

## Configuration Files

| File                                   | Scope                                      | Committed       |
| -------------------------------------- | ------------------------------------------ | --------------- |
| `supabase/config.toml`                 | Local dev Docker config                    | Yes             |
| `supabase/.env`                        | Local secrets (OAuth, API keys)            | No (gitignored) |
| `apps/mobile/.env`                     | Mobile app config (Supabase URL, anon key) | No (gitignored) |
| `apps/mobile/.env.example`             | Template for mobile env vars               | Yes             |
| `.github/workflows/deploy-staging.yml` | Staging deploy automation                  | Yes             |

## Data Flow

```
Local seed.sql  →  supabase db reset
                      ↓
                 Local Postgres

migrations/*.sql  →  supabase db push  →  Staging Postgres
                                            ↓ (manual)
                                         Production Postgres
```

## Secret Management

See `supabase/SECRETS.md` for the full list of required secrets and how to set them.

- **Local**: `supabase/.env` file
- **Staging/Production**: `supabase secrets set` CLI or Dashboard
- **GitHub Actions**: Repository secrets (for CI/CD workflows)
