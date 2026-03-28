---
name: rn-metro-debug
description: >-
  Diagnose and fix Metro bundler "Unable to resolve module" errors
  in the pnpm monorepo React Native project. Trigger when the user
  reports a Metro resolution error or a module-not-found crash.
---

# Metro Resolution Error Debugger

When a user reports "Unable to resolve module X from Y", follow this systematic checklist.

## Step 1: Classify the Error

| Pattern                                                             | Likely Cause                         |
| ------------------------------------------------------------------- | ------------------------------------ |
| `Unable to resolve module X from .../node_modules/react-native/...` | Missing hoisted dependency           |
| `Unable to resolve module ~/...` or `@/...`                         | Path alias misconfiguration          |
| `Unable to resolve module @snacky/...`                              | Workspace package `main` field wrong |
| `Unable to resolve module ...` after adding new package             | Metro cache stale                    |

## Step 2: Check Root Causes

### 2a. Missing Hoisted Dependency

In this pnpm monorepo with `node-linker=hoisted`, all packages live at `/snacky/node_modules/`.

1. Check if the package is in any `package.json` — it may be an implicit peer dep
2. Add it explicitly to `apps/mobile/package.json`
3. Run `pnpm install` from repo root
4. Restart Metro with `--reset-cache`

### 2b. Path Alias Issues

The project uses `~/` prefix (NOT `@/`). Verify three places agree:

1. **`apps/mobile/tsconfig.json`**: `"paths": { "~/*": ["./src/*"] }`
2. **`apps/mobile/babel.config.js`**: `module-resolver` plugin with `alias: { '~': './src' }`
3. **`apps/mobile/metro.config.js`**: resolver extraNodeModules with `'~': path.resolve(__dirname, 'src')`

### 2c. Workspace Package Resolution

For `@snacky/api-client` or `@snacky/shared-types`:

1. Verify `package.json` has `"main": "src/index.ts"` (NOT `dist/index.js`)
2. Verify `metro.config.js` watches the monorepo root
3. Verify the source file actually exists at the declared path

### 2d. Stale Cache

After ANY dependency or config change:

```bash
# From apps/mobile/
pnpm start --reset-cache
```

## Step 3: Verify Fix

1. `pnpm install` from repo root succeeds
2. Metro starts without errors
3. App loads on simulator/device

## Common Fixes Quick Reference

| Error                                            | Fix                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `invariant could not be found`                   | Add `invariant` to `apps/mobile/package.json`, pnpm install        |
| `@/shared/...` not found                         | Change all `@/` imports to `~/`                                    |
| `@snacky/api-client ... dist/index.js` not found | Set `"main": "src/index.ts"` in package                            |
| `Cannot assign to property 'protocol'`           | Add `react-native-url-polyfill/auto` as first import in `index.js` |
| Any module not found after install               | Restart Metro with `--reset-cache`                                 |
