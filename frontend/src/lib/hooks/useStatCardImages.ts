import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getStatCardImages, resetStatCardImage, uploadStatCardImage } from '@/lib/api/statCardImages';
import type { ResourceType } from '@/types/resource';

const STAT_CARD_IMAGES_KEY = ['stat-card-images'];

export function useStatCardImages() {
  return useQuery({ queryKey: STAT_CARD_IMAGES_KEY, queryFn: getStatCardImages });
}

export function useUploadStatCardImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slot, file }: { slot: ResourceType; file: File }) => uploadStatCardImage(slot, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STAT_CARD_IMAGES_KEY });
    },
  });
}

export function useResetStatCardImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slot: ResourceType) => resetStatCardImage(slot),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STAT_CARD_IMAGES_KEY });
    },
  });
}
