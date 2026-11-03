import type { Category, CrowdBand } from './schemas';

export const SCORING_CONFIG = {
  crowdWeights: { small: 1, medium: 2.5, large: 5, very_large: 9 } satisfies Record<CrowdBand, number>,
  categoryWeights: { concert: 1.35, festival: 1.25, sport: 1.35, racing: 1.2, show: 1, other: 0.8 } satisfies Record<Category, number>,
  clusterWindowMinutes: 90,
  clusterBonus: 3,
  thresholds: { busy: 7, veryBusy: 17 }
} as const;
