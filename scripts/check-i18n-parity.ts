#!/usr/bin/env npx tsx
/**
 * Verify that all i18n namespaces have identical keys in en/ and pl/.
 * Exit code 1 if any mismatch is found.
 *
 * Usage: npx tsx scripts/check-i18n-parity.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const I18N_DIR = path.resolve(__dirname, '../apps/mobile/src/i18n');
const LOCALES = ['en', 'pl'] as const;

const getJsonKeys = (filePath: string): string[] => {
  if (!fs.existsSync(filePath)) return [];
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  return Object.keys(content).sort();
};

const getNamespaces = (locale: string): string[] => {
  const dir = path.join(I18N_DIR, locale);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort();
};

let hasErrors = false;

const enNamespaces = getNamespaces('en');
const plNamespaces = getNamespaces('pl');

const enOnly = enNamespaces.filter((ns) => !plNamespaces.includes(ns));
const plOnly = plNamespaces.filter((ns) => !enNamespaces.includes(ns));

if (enOnly.length > 0) {
  console.error(`Missing in pl/: ${enOnly.join(', ')}`);
  hasErrors = true;
}
if (plOnly.length > 0) {
  console.error(`Missing in en/: ${plOnly.join(', ')}`);
  hasErrors = true;
}

const allNamespaces = [...new Set([...enNamespaces, ...plNamespaces])].sort();

for (const ns of allNamespaces) {
  const enKeys = getJsonKeys(path.join(I18N_DIR, 'en', `${ns}.json`));
  const plKeys = getJsonKeys(path.join(I18N_DIR, 'pl', `${ns}.json`));

  const missingInPl = enKeys.filter((k) => !plKeys.includes(k));
  const missingInEn = plKeys.filter((k) => !enKeys.includes(k));

  if (missingInPl.length > 0) {
    console.error(`[${ns}] Keys missing in pl/: ${missingInPl.join(', ')}`);
    hasErrors = true;
  }
  if (missingInEn.length > 0) {
    console.error(`[${ns}] Keys missing in en/: ${missingInEn.join(', ')}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\ni18n parity check FAILED — see errors above.');
  process.exit(1);
} else {
  console.log('i18n parity check passed — all namespaces and keys match.');
}
