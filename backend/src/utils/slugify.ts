// Combining diacritical marks block: U+0300-U+036F (stripped after NFKD normalization).
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

export async function ensureUniqueSlug(
  baseSlug: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  while (await exists(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
