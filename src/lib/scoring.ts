import { SCORING_CONFIG } from './scoring.config';
import type { Day, Event } from './schemas';

export function eventScore(event: Event): number {
  return SCORING_CONFIG.crowdWeights[event.crowd_band] * SCORING_CONFIG.categoryWeights[event.category];
}

export function scoreDay(date: string, events: Event[]): Day {
  const dayEvents = events.filter((event) => localDate(event.start_at) === date);
  let score = dayEvents.reduce((total, event) => total + eventScore(event), 0);
  const finishes = dayEvents.map((event) => new Date(event.est_end_at).valueOf()).sort((a, b) => a - b);
  for (let index = 1; index < finishes.length; index += 1) {
    if (finishes[index] - finishes[index - 1] <= SCORING_CONFIG.clusterWindowMinutes * 60_000) {
      score += SCORING_CONFIG.clusterBonus;
    }
  }
  const rating = score >= SCORING_CONFIG.thresholds.veryBusy ? 'very_busy' : score >= SCORING_CONFIG.thresholds.busy ? 'busy' : 'quiet';
  return {
    date,
    rating,
    score: Math.round(score * 100) / 100,
    top_event_ids: [...dayEvents].sort((a, b) => eventScore(b) - eventScore(a)).slice(0, 3).map((event) => event.id)
  };
}

export function localDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}
