---
name: snacky_fix-ci
description: >-
  Check recent GitHub Actions CI results and fix any failing jobs.
  Trigger when the user asks to check CI, fix CI errors, check pipeline,
  fix build, or says "fix ci".
---

# Fix CI — Check & Repair GitHub Actions Failures

## Step 1: Identify the failing run

Run these commands to find the most recent CI run and its status:

```bash
# List recent workflow runs (last 5)
gh run list --limit 5

# If a specific run is failing, get its details
gh run view <RUN_ID>
```

Pick the most recent **failed** or **in_progress** run. If all runs are passing, tell the user "All CI checks are passing" and stop.

## Step 2: Download failure logs

For the failing run, get the logs for each failed job:

```bash
# View the failed jobs and their step-level output
gh run view <RUN_ID> --log-failed
```

If `--log-failed` output is too large, narrow to a specific job:

```bash
# List jobs in the run
gh run view <RUN_ID> --json jobs --jq '.jobs[] | select(.conclusion == "failure") | {name, conclusion}'

# View logs for a specific job
gh run view <RUN_ID> --log --job <JOB_ID>
```

## Step 3: Classify and fix each failure

For each failed job, classify the error and apply the fix:

| Job                     | Common Errors                                    | Fix                                                            |
| ----------------------- | ------------------------------------------------ | -------------------------------------------------------------- |
| **Lint & Format**       | Prettier diff, ESLint violations                 | Run `pnpm format` then fix ESLint errors in the flagged files  |
| **Type Check**          | `tsc` errors (TS2xxx)                            | Read the file + line from the error, fix the type issue        |
| **Unit Tests**          | Jest assertion failures                          | Read the failing test, check if test is wrong or code is wrong |
| **Security Scan**       | `pnpm audit` high vulnerabilities                | Update the vulnerable package or add an override               |
| **Build Check**         | Metro bundle failure, "Unable to resolve module" | Check pnpm monorepo paths (see `pnpm-monorepo-rn` rule)        |
| **Validate Migrations** | SQL lint errors                                  | Fix the SQL in `supabase/migrations/`                          |

## Step 4: Verify locally

After fixing, run the equivalent local commands to confirm the fix:

```bash
# Lint + format
pnpm format:check && pnpm lint

# Type check
pnpm typecheck

# Tests
pnpm test

# Mobile bundle check
cd apps/mobile
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/test.bundle
```

## Step 5: Commit and push

If fixes were made:

1. Stage and commit with a descriptive message like `fix: resolve CI lint/type errors`
2. Push to the branch
3. Monitor the new run: `gh run watch`

## Important Notes

- Always read the **full error output** before attempting a fix — don't guess
- If a failure is in a dependency (not our code), check if a version bump fixes it
- If the failure is flaky (passes on retry), note it but don't change code
- Never skip CI checks (`--no-verify`) to work around failures
