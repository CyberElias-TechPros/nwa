import { describe, expect, it } from 'vitest';
import en from '@nwa/i18n/locales/en-NG.json';
import pcm from '@nwa/i18n/locales/pcm.json';

describe('i18n locales', () => {
  it('have identical keys', () => {
    const enKeys = Object.keys(en).sort();
    const pcmKeys = Object.keys(pcm).sort();
    expect(pcmKeys).toEqual(enKeys);
  });

  it('have non-empty values for every key', () => {
    for (const [, v] of Object.entries(en)) {
      expect(v).toBeTruthy();
    }
    for (const [, v] of Object.entries(pcm)) {
      expect(v).toBeTruthy();
    }
  });

  it('contain key brand strings', () => {
    expect(en['app.name']).toBe('NaWeAgree');
    expect(pcm['app.name']).toBe('NaWeAgree');
    expect(pcm['cta.agreeVersion']).toMatch(/I see am/);
  });
});
