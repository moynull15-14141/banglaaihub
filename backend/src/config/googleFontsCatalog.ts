// Curated Google Fonts allow-list for the Site Font Engine. `family` values
// here are the only ones SiteFontService.upsertFont() accepts for
// source: 'google' — a free-text family name would let an admin build a
// CSS2 URL for a font that doesn't exist (silent fallback-font breakage)
// and interpolates unvalidated input into a stylesheet URL, so the picker
// UI only ever offers what's listed here.
//
// Bengali-capable families are flagged and listed first — this is a Bangla
// AI platform, so a working Bengali glyph set matters more than for a
// typical English-only catalog.
export interface GoogleFontCatalogEntry {
  family: string;
  weights: number[];
  supportsBengali: boolean;
}

export const GOOGLE_FONTS_CATALOG: GoogleFontCatalogEntry[] = [
  // --- Bengali-capable ------------------------------------------------------
  { family: 'Noto Sans Bengali', weights: [400, 500, 600, 700], supportsBengali: true },
  { family: 'Noto Serif Bengali', weights: [400, 500, 600, 700], supportsBengali: true },
  { family: 'Hind Siliguri', weights: [300, 400, 500, 600, 700], supportsBengali: true },
  { family: 'Tiro Bangla', weights: [400], supportsBengali: true },
  { family: 'Baloo Da 2', weights: [400, 500, 600, 700, 800], supportsBengali: true },
  { family: 'Atma', weights: [300, 400, 500, 600, 700], supportsBengali: true },
  { family: 'Galada', weights: [400], supportsBengali: true },
  { family: 'Anek Bangla', weights: [300, 400, 500, 600, 700, 800], supportsBengali: true },
  { family: 'Li Ador Noirrit', weights: [400], supportsBengali: true },
  { family: 'Mina', weights: [400, 700], supportsBengali: true },

  // --- Latin / general purpose -----------------------------------------------
  { family: 'Inter', weights: [400, 500, 600, 700, 800], supportsBengali: false },
  { family: 'Roboto', weights: [300, 400, 500, 700], supportsBengali: false },
  { family: 'Open Sans', weights: [400, 500, 600, 700], supportsBengali: false },
  { family: 'Poppins', weights: [300, 400, 500, 600, 700, 800], supportsBengali: false },
  { family: 'Lato', weights: [300, 400, 700, 900], supportsBengali: false },
  { family: 'Nunito', weights: [400, 500, 600, 700, 800], supportsBengali: false },
  { family: 'Montserrat', weights: [400, 500, 600, 700, 800], supportsBengali: false },
  { family: 'Work Sans', weights: [400, 500, 600, 700], supportsBengali: false },
  { family: 'DM Sans', weights: [400, 500, 700], supportsBengali: false },
  { family: 'Manrope', weights: [400, 500, 600, 700, 800], supportsBengali: false },
  { family: 'Source Sans 3', weights: [400, 500, 600, 700], supportsBengali: false },
  { family: 'Plus Jakarta Sans', weights: [400, 500, 600, 700, 800], supportsBengali: false },
  { family: 'Outfit', weights: [400, 500, 600, 700, 800], supportsBengali: false },
  { family: 'Space Grotesk', weights: [400, 500, 600, 700], supportsBengali: false },
  { family: 'Merriweather', weights: [400, 700, 900], supportsBengali: false },
  { family: 'Playfair Display', weights: [400, 500, 600, 700, 800], supportsBengali: false },
  { family: 'IBM Plex Sans', weights: [400, 500, 600, 700], supportsBengali: false },
  { family: 'JetBrains Mono', weights: [400, 500, 600, 700], supportsBengali: false },
  { family: 'Fira Code', weights: [400, 500, 600, 700], supportsBengali: false },
  { family: 'Source Code Pro', weights: [400, 500, 600, 700], supportsBengali: false },
];

const CATALOG_BY_FAMILY = new Map(GOOGLE_FONTS_CATALOG.map((entry) => [entry.family, entry]));

export function findGoogleFont(family: string): GoogleFontCatalogEntry | undefined {
  return CATALOG_BY_FAMILY.get(family);
}

// Builds a ready-to-use Google Fonts CSS2 stylesheet URL for the given
// catalog entry, restricted to the requested weights (falls back to every
// weight the catalog lists if none/invalid are requested).
export function buildGoogleFontCssUrl(entry: GoogleFontCatalogEntry, weights: number[]): string {
  const validWeights = weights.filter((weight) => entry.weights.includes(weight));
  const resolvedWeights = validWeights.length > 0 ? validWeights : entry.weights;
  const family = encodeURIComponent(entry.family).replace(/%20/g, '+');
  const weightParam = [...resolvedWeights].sort((a, b) => a - b).join(';');
  return `https://fonts.googleapis.com/css2?family=${family}:wght@${weightParam}&display=swap`;
}
