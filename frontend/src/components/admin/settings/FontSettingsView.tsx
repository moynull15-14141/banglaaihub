'use client';

import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { useSiteFonts } from '@/lib/hooks/useSiteFonts';
import { FontSlotCard } from './FontSlotCard';
import type { FontSlot } from '@/lib/api/siteFonts';

const SLOTS: FontSlot[] = ['sans', 'heading', 'mono'];

export function FontSettingsView() {
  const { data: fonts, isLoading, isError, refetch } = useSiteFonts();

  if (isLoading) {
    return <LoadingScreen label="Loading typography settings…" />;
  }

  if (isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Couldn't load font settings"
          description="Something went wrong while fetching the current typography."
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Typography</h1>
      <p className="mt-1 text-muted-foreground">
        Control the fonts used across the site — pick from Google Fonts or upload your own. Changes go live for new
        visitors within a minute, without a redeploy.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {SLOTS.map((slot) => (
          <FontSlotCard key={slot} slot={slot} current={fonts?.find((font) => font.slot === slot)} />
        ))}
      </div>
    </PageContainer>
  );
}
