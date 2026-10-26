import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

// The page is async and imports JSON directly from @nwa/i18n, so we render a
// smoke component that exercises the i18n package wiring. The full server
// component render test is added in W3 with next-test-utils.
import en from '@nwa/i18n/locales/en-NG.json';

describe('web app', () => {
  it('wires english locale strings', () => {
    expect(en['app.name']).toBe('NaWeAgree');
    expect(en['app.tagline']).toMatch(/remember/i);
  });

  it('exposes a working React render smoke', () => {
    render(<div data-testid="root">hello</div>);
    expect(screen.getByTestId('root')).toHaveTextContent('hello');
  });
});
