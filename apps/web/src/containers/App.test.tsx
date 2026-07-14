/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App', () => {
  it('renders the placeholder view inside a <main> landmark', () => {
    render(<App />);

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();

    // The placeholder communicates the current project state without
    // implying any calculator feature is available yet.
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /^calculator$/i,
      }),
    ).toBeInTheDocument();
    expect(main).toHaveTextContent(/full-stack application foundation ready/i);
  });
});
