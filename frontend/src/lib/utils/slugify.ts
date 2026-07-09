// Mirrors backend/src/utils/slugify.ts exactly — needed so TagBadge can link
// to /tags/[slug] from just a tag name (Resource/SearchResult only carry
// tags as string[] names, not {name, slug} pairs) without a lookup
// round-trip. Non-Latin (e.g. Bangla-script) tag names collapse toward an
// empty/collided slug under this algorithm, same limitation as the backend's
// own tag creation — not introduced here.
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
