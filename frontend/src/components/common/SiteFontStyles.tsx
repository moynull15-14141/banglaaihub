import type { SiteFont } from '@/lib/server/siteFonts';

const CSS_VAR_BY_SLOT: Record<SiteFont['slot'], string> = {
  sans: '--font-sans',
  heading: '--font-heading',
  mono: '--font-mono',
};

// Font family names only ever reach here from the Google Fonts catalog
// allow-list or the backend's sanitized custom-family regex
// (/^[a-zA-Z0-9 _-]{1,60}$/), but this still escapes defensively before
// interpolating into a raw <style> string — a family value is the one piece
// of admin-controlled text this component drops straight into CSS.
function quoteFamily(family: string): string {
  return `'${family.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// Renders the admin-configured fonts into <head>: Google <link>s or custom
// @font-face blocks, plus one override <style> block that sets each
// configured slot's CSS variable on <body> with !important — required
// because next/font's own generated class selector (higher specificity than
// a plain `body { }` rule) already sets --font-sans/--font-geist-mono there,
// so only !important reliably wins regardless of source order. Slots with no
// SiteFont row render nothing, leaving today's next/font Geist defaults
// completely untouched.
export function SiteFontStyles({ fonts }: { fonts: SiteFont[] }) {
  if (fonts.length === 0) return null;

  const hasGoogleFont = fonts.some((font) => font.source === 'google');
  const overrideDeclarations: string[] = [];
  const fontFaceBlocks: string[] = [];
  const preloadLinks: { href: string; type: string }[] = [];
  const googleStylesheetUrls: string[] = [];

  for (const font of fonts) {
    const cssVar = CSS_VAR_BY_SLOT[font.slot];
    const familyValue = `${quoteFamily(font.family)}, ${font.fallback}`;
    overrideDeclarations.push(`${cssVar}: ${familyValue} !important;`);

    if (font.source === 'google' && font.css_url) {
      googleStylesheetUrls.push(font.css_url);
      continue;
    }

    for (const file of font.files) {
      if (!file.url) continue;
      const format = file.format === 'ttf' ? 'truetype' : file.format === 'otf' ? 'opentype' : file.format;
      fontFaceBlocks.push(
        `@font-face { font-family: ${quoteFamily(font.family)}; src: url('${file.url}') format('${format}'); font-weight: ${file.weight}; font-style: ${file.style}; font-display: swap; }`,
      );
      preloadLinks.push({ href: file.url, type: `font/${file.format}` });
    }
  }

  return (
    <>
      {hasGoogleFont ? (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        </>
      ) : null}
      {googleStylesheetUrls.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {preloadLinks.map((link) => (
        <link key={link.href} rel="preload" as="font" type={link.type} href={link.href} crossOrigin="anonymous" />
      ))}
      {fontFaceBlocks.length > 0 || overrideDeclarations.length > 0 ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `${fontFaceBlocks.join('\n')}\nbody { ${overrideDeclarations.join(' ')} }`,
          }}
        />
      ) : null}
    </>
  );
}
