// Combining diacritical marks block: U+0300-U+036F (stripped after NFKD normalization).
// Mirrors backend/src/utils/slugify.ts exactly (client-side preview only — the backend
// remains the source of truth for uniqueness).
const DIACRITIC_RANGE_START = String.fromCharCode(0x0300);
const DIACRITIC_RANGE_END = String.fromCharCode(0x036f);
const COMBINING_DIACRITICS = new RegExp(`[${DIACRITIC_RANGE_START}-${DIACRITIC_RANGE_END}]`, 'g');

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(COMBINING_DIACRITICS, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
