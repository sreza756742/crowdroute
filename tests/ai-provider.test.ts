import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractWithAi } from '../pipeline/ai/provider';

afterEach(() => { delete process.env.AI_EXTRACTION_ENABLED; });
describe('optional AI extraction', () => {
  it('does not call a provider while disabled', async () => {
    const extract = vi.fn(); await extractWithAi({ extract }, 'input'); expect(extract).not.toHaveBeenCalled();
  });
  it('calls the configured provider while enabled', async () => {
    process.env.AI_EXTRACTION_ENABLED = 'true'; const extract = vi.fn().mockResolvedValue([]); await extractWithAi({ extract }, 'input'); expect(extract).toHaveBeenCalledOnce();
  });
});
