# Supabase Secrets Configuration

Secrets are managed via `supabase secrets set` (CLI) or the Supabase Dashboard.
They are available as `Deno.env.get('SECRET_NAME')` inside Edge Functions.

## Required Secrets

| Secret | Description | Used By |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key (GPT-5.4 Vision + Chat) | `meal-scan`, `chat`, `generate-plan` |
| `GOOGLE_AI_API_KEY` | Google AI API key (Gemini 3.1 Pro fallback) | `meal-scan` |
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude Sonnet 4.6 fallback) | `meal-scan` |
| `VOYAGE_API_KEY` | Voyage AI API key (voyage-4-large embeddings) | `embed` |
| `FCM_SERVICE_ACCOUNT_JSON` | Firebase Cloud Messaging service account (base64-encoded) | `send-notification` |

## Auto-provided by Supabase

These are automatically available in all Edge Functions — do **not** set them manually:

| Secret | Description |
|---|---|
| `SUPABASE_URL` | Project API URL |
| `SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (full access, bypass RLS) |
| `SUPABASE_DB_URL` | Direct Postgres connection string |

## Setting Secrets

### Staging / Production

```bash
# Set individual secrets
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set GOOGLE_AI_API_KEY=AIza...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set VOYAGE_API_KEY=pa-...

# Set FCM (base64-encode the JSON file first)
supabase secrets set FCM_SERVICE_ACCOUNT_JSON=$(base64 -i firebase-service-account.json)

# List current secrets
supabase secrets list
```

### Local Development

For local development with `supabase start`, create a `supabase/.env` file:

```env
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=sk-...
```

This file is gitignored and only used by `supabase start`.

## Security Notes

- Never commit secrets to version control
- Rotate API keys quarterly
- Use separate API keys for staging and production
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — only use in trusted server-side code
