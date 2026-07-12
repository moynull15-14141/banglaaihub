'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFontCatalog, useResetFont, useUploadFontFile, useUpsertFont } from '@/lib/hooks/useSiteFonts';
import type { FontSlot, FontSource, GoogleFontCatalogEntry, SiteFont } from '@/lib/api/siteFonts';

const SLOT_LABELS: Record<FontSlot, string> = {
  sans: 'Body (Sans)',
  heading: 'Headings',
  mono: 'Code (Monospace)',
};

const PREVIEW_TEXT_BN = 'বাংলা ভাষায় কৃত্রিম বুদ্ধিমত্তার জগতে স্বাগতম।';
const PREVIEW_TEXT_EN = 'The quick brown fox jumps over the lazy dog — AI for everyone.';

// Loads a Google Fonts stylesheet just for this card's live preview, before
// anything is saved — removed again on unmount/family change so browsing
// the picker doesn't permanently pollute <head> with every font ever
// clicked.
function useGooglePreview(family: string | null) {
  useEffect(() => {
    if (!family) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;700&display=swap`;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [family]);
}

// Live-previews a not-yet-uploaded custom font file via the FontFace API —
// no round trip to the server needed to see what an uploaded file looks
// like before committing to Save.
function useCustomFilePreview(family: string, file: File | null) {
  useEffect(() => {
    if (!file || !family) return;
    const objectUrl = URL.createObjectURL(file);
    const fontFace = new FontFace(family, `url(${objectUrl})`);
    let cancelled = false;
    fontFace
      .load()
      .then((loaded) => {
        if (cancelled) return;
        document.fonts.add(loaded);
      })
      .catch(() => {
        // Invalid/corrupt file for preview purposes only — the real upload's
        // server-side validation (magic-byte sniffing) is authoritative.
      });
    return () => {
      cancelled = true;
      document.fonts.delete(fontFace);
      URL.revokeObjectURL(objectUrl);
    };
  }, [family, file]);
}

export function FontSlotCard({ slot, current }: { slot: FontSlot; current: SiteFont | undefined }) {
  const { data: catalog } = useFontCatalog();
  const upsertMutation = useUpsertFont();
  const uploadMutation = useUploadFontFile();
  const resetMutation = useResetFont();

  const [source, setSource] = useState<FontSource>(current?.source ?? 'google');
  const [googleFamily, setGoogleFamily] = useState<string | null>(
    current?.source === 'google' ? current.family : null,
  );
  const [customFamily, setCustomFamily] = useState(current?.source === 'custom' ? current.family : '');
  const [regularFile, setRegularFile] = useState<File | null>(null);
  const [boldFile, setBoldFile] = useState<File | null>(null);

  useGooglePreview(source === 'google' ? googleFamily : null);
  useCustomFilePreview(customFamily || `preview-${slot}`, source === 'custom' ? regularFile : null);

  const previewFamily = source === 'google' ? googleFamily : customFamily || null;
  const previewStyle = previewFamily ? { fontFamily: `'${previewFamily}', sans-serif` } : undefined;

  const bengaliFonts = useMemo(() => catalog?.filter((entry) => entry.supportsBengali) ?? [], [catalog]);
  const otherFonts = useMemo(() => catalog?.filter((entry) => !entry.supportsBengali) ?? [], [catalog]);

  async function handleSave() {
    try {
      if (source === 'google') {
        if (!googleFamily) {
          toast.error('Pick a font from the list first.');
          return;
        }
        await upsertMutation.mutateAsync({ slot, input: { source: 'google', family: googleFamily } });
      } else {
        if (!customFamily.trim()) {
          toast.error('Give this font a name first.');
          return;
        }
        await upsertMutation.mutateAsync({ slot, input: { source: 'custom', family: customFamily.trim() } });
        if (regularFile) {
          await uploadMutation.mutateAsync({ slot, weight: 400, style: 'normal', file: regularFile });
        }
        if (boldFile) {
          await uploadMutation.mutateAsync({ slot, weight: 700, style: 'normal', file: boldFile });
        }
      }
      toast.success(`${SLOT_LABELS[slot]} font updated.`);
    } catch {
      toast.error('Could not save this font. Please try again.');
    }
  }

  async function handleReset() {
    try {
      await resetMutation.mutateAsync(slot);
      setGoogleFamily(null);
      setCustomFamily('');
      setRegularFile(null);
      setBoldFile(null);
      toast.success(`${SLOT_LABELS[slot]} reset to default.`);
    } catch {
      toast.error('Could not reset this font.');
    }
  }

  const isSaving = upsertMutation.isPending || uploadMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{SLOT_LABELS[slot]}</span>
          <Badge variant="outline">{current ? current.family : 'Default'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={source} onValueChange={(value) => setSource(value as FontSource)}>
          <TabsList>
            <TabsTrigger value="google">Google Fonts</TabsTrigger>
            <TabsTrigger value="custom">Custom Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="space-y-3">
            {bengaliFonts.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Bengali-friendly</p>
                <div className="flex flex-wrap gap-1.5">
                  {bengaliFonts.map((entry) => (
                    <FontChip
                      key={entry.family}
                      entry={entry}
                      selected={googleFamily === entry.family}
                      onSelect={() => setGoogleFamily(entry.family)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {otherFonts.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Other</p>
                <div className="flex flex-wrap gap-1.5">
                  {otherFonts.map((entry) => (
                    <FontChip
                      key={entry.family}
                      entry={entry}
                      selected={googleFamily === entry.family}
                      onSelect={() => setGoogleFamily(entry.family)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="custom" className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${slot}-family`}>Font name</Label>
              <Input
                id={`${slot}-family`}
                value={customFamily}
                onChange={(event) => setCustomFamily(event.target.value)}
                placeholder="e.g. My Custom Font"
                maxLength={60}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${slot}-regular`}>Regular (400)</Label>
                <Input
                  id={`${slot}-regular`}
                  type="file"
                  accept=".woff2,.woff,.ttf,.otf"
                  onChange={(event) => setRegularFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${slot}-bold`}>Bold (700) — optional</Label>
                <Input
                  id={`${slot}-bold`}
                  type="file"
                  accept=".woff2,.woff,.ttf,.otf"
                  onChange={(event) => setBoldFile(event.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {previewFamily ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p style={previewStyle} className="text-lg">
              {PREVIEW_TEXT_BN}
            </p>
            <p style={previewStyle} className="mt-1 text-sm text-muted-foreground">
              {PREVIEW_TEXT_EN}
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={resetMutation.isPending || !current}>
            Reset to default
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FontChip({
  entry,
  selected,
  onSelect,
}: {
  entry: GoogleFontCatalogEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        selected ? 'border-brand bg-brand/10 text-brand' : 'border-border hover:bg-muted'
      }`}
    >
      {entry.family}
    </button>
  );
}
