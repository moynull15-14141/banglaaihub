'use client';

import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { useStatCardImages } from '@/lib/hooks/useStatCardImages';
import { STAT_CARD_ICONS, STAT_CARD_LABELS, STAT_CARD_TYPES } from '@/lib/constants/resourceTypes';
import { StatCardImageSlot } from './StatCardImageSlot';

export function StatCardImagesView() {
  const { data: images, isLoading, isError, refetch } = useStatCardImages();

  if (isLoading) {
    return <LoadingScreen label="Loading stat card images…" />;
  }

  if (isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Couldn't load stat card images"
          description="Something went wrong while fetching the current settings."
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Stat Card Images</h1>
      <p className="mt-1 text-muted-foreground">
        Upload a hero image for each homepage &ldquo;Community statistics&rdquo; card. Leave a card unset to keep the
        plain icon look.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_CARD_TYPES.map((type) => (
          <StatCardImageSlot
            key={type}
            type={type}
            label={STAT_CARD_LABELS[type]}
            icon={STAT_CARD_ICONS[type]}
            current={images?.find((image) => image.slot === type)}
          />
        ))}
      </div>
    </PageContainer>
  );
}
