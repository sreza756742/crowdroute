import type { RawEvent } from '../types.js';

export interface AiExtractionProvider {
  extract(input: string): Promise<RawEvent[]>;
}

export async function extractWithAi(provider: AiExtractionProvider, input: string): Promise<RawEvent[]> {
  if (process.env.AI_EXTRACTION_ENABLED !== 'true') return [];
  return provider.extract(input);
}
