---
name: snacky_dependabot
description: >-
  Review and process pending Dependabot PRs. Trigger when the user asks
  to handle dependabot, review dependency updates, merge dependabot PRs,
  or manage dependency bumps.
---

# Dependabot PR Triage

## Step 1: List pending Dependabot PRs

```bash
gh pr list --author "app/dependabot" --state open --json number,title,labels,createdAt,mergeable,statusCheckRollup --jq '.[] | {number, title, mergeable, checks: (.statusCheckRollup | map({name: .name, conclusion: .conclusion}))}'
```

If no open PRs, tell the user "No pending Dependabot PRs" and stop.

## Step 2: Check CI status for each PR

For each PR, check if CI is passing:

```bash
gh pr checks <PR_NUMBER>
```

Classify each PR into one of:

| Status                      | Meaning                     | Action                     |
| --------------------------- | --------------------------- | -------------------------- |
| **Green (all checks pass)** | Safe to merge               | Merge it                   |
| **Red (checks failing)**    | Breaking change or conflict | Investigate before merging |
| **Pending**                 | CI still running            | Wait and re-check          |

## Step 3: Review changes

For PRs with **failing checks**, inspect what changed:

```bash
gh pr diff <PR_NUMBER> --name-only
gh pr diff <PR_NUMBER>
```

Common issues:

- **Major version bump** — check changelog for breaking changes
- **Peer dependency conflict** — may need to update related packages together
- **Type changes** — new types may cause `tsc` errors
- **Lockfile conflict** — rebase needed

## Step 4: Merge safe PRs

Merge all green PRs in batch. Prefer **squash merge** to keep history clean:

```bash
gh pr merge <PR_NUMBER> --squash --auto
```

For grouped Dependabot PRs (e.g., `react-native`, `supabase`, `linting`), merge the group PR as a single unit.

To merge multiple green PRs at once:

```bash
# Get all green PR numbers
gh pr list --author "app/dependabot" --state open --json number,statusCheckRollup --jq '.[] | select(.statusCheckRollup | all(.conclusion == "success")) | .number'

# Then merge each
gh pr merge <NUMBER> --squash --auto
```

## Step 5: Handle failing PRs

For each failing PR:

1. **Read the CI failure logs**: `gh pr checks <PR_NUMBER>` then `gh run view <RUN_ID> --log-failed`
2. **Decide action**:
   - If it's a **type error from the bump**: checkout the branch, fix the type issue, push, let CI re-run
   - If it's a **breaking change**: close the PR with a comment explaining why (`gh pr close <PR_NUMBER> --comment "Breaking change — deferring major upgrade"`)
   - If it's a **lockfile conflict**: comment `@dependabot rebase` on the PR to trigger a rebase
   - If **multiple PRs conflict** with each other: merge them one at a time, letting each trigger a rebase of the others

```bash
# Checkout a Dependabot branch to fix issues
gh pr checkout <PR_NUMBER>

# After fixing, push and wait for CI
git push

# Or tell Dependabot to rebase
gh pr comment <PR_NUMBER> --body "@dependabot rebase"
```

## Step 6: Report summary

After processing, provide a summary table:

| PR  | Title                    | Action         | Result          |
| --- | ------------------------ | -------------- | --------------- |
| #XX | Bump foo from 1.0 to 1.1 | Merged         | Done            |
| #YY | Bump bar from 2.0 to 3.0 | Closed         | Breaking change |
| #ZZ | Bump baz from 1.2 to 1.3 | Fixed + Merged | Type fix needed |

## Dependabot Commands Reference

These comments can be posted on any Dependabot PR:

| Command                                 | Effect                                 |
| --------------------------------------- | -------------------------------------- |
| `@dependabot rebase`                    | Rebase the PR branch                   |
| `@dependabot recreate`                  | Close and recreate the PR from scratch |
| `@dependabot merge`                     | Merge after CI passes                  |
| `@dependabot squash and merge`          | Squash merge after CI passes           |
| `@dependabot cancel merge`              | Cancel a pending auto-merge            |
| `@dependabot close`                     | Close the PR                           |
| `@dependabot ignore this major version` | Ignore this major version forever      |
| `@dependabot ignore this minor version` | Ignore this minor version forever      |
| `@dependabot ignore this dependency`    | Ignore this dependency forever         |

## Important Notes

- Never merge a red PR without understanding the failure
- For React Native ecosystem bumps, test on both iOS and Android if possible
- Major version bumps of `react` and `react-native` are ignored by our Dependabot config — if one appears, it was manually requested
- After merging several PRs, monitor the main branch CI to ensure no combined breakage
