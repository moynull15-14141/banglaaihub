import { create } from 'zustand';
import type { FeedCardType } from '@/types/feed';
import type { FeedConfig, FeedDiversityConfig, FeedWeights } from '@/types/feed-admin';

interface FeedConfigDraftState {
  weights: FeedWeights | null;
  diversity: FeedDiversityConfig | null;
  enabledCardTypes: FeedCardType[] | null;
  reason: string;

  syncFromServer: (config: FeedConfig) => void;
  setWeights: (weights: FeedWeights) => void;
  setDiversity: (diversity: FeedDiversityConfig) => void;
  setEnabledCardTypes: (types: FeedCardType[]) => void;
  setReason: (reason: string) => void;
}

// Phase 4C, Stage 1 (Live Feed Preview) — FeedConfigCard's slider/input edits
// and LiveFeedPreview's debounced preview calls need to watch the exact
// same in-progress (unsaved) values. A store rather than React context
// because both components sit under FeedAdminView but neither should need
// to know about the other's existence to read the shared draft.
export const useFeedConfigDraftStore = create<FeedConfigDraftState>((set) => ({
  weights: null,
  diversity: null,
  enabledCardTypes: null,
  reason: '',

  // Called whenever the server config query resolves or changes (initial
  // load, or after a successful save/rollback) — resets the draft to match
  // what's actually persisted, same as FeedConfigCard's old local-state
  // sync effect did before this state was lifted out.
  syncFromServer: (config) =>
    set({
      weights: config.weights,
      diversity: config.diversity,
      enabledCardTypes: config.enabled_card_types,
      reason: '',
    }),
  setWeights: (weights) => set({ weights }),
  setDiversity: (diversity) => set({ diversity }),
  setEnabledCardTypes: (enabledCardTypes) => set({ enabledCardTypes }),
  setReason: (reason) => set({ reason }),
}));
