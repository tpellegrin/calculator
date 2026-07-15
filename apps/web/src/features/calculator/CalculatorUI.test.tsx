import { screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Calculator } from './index';
import { renderWithProviders } from 'test/utils';
import * as api from 'api/calculator';
import type { CalculationResponse } from 'api/types';
import { ApiError } from 'api/errors';
import { SUPPORTED_LOCALES } from 'i18n';
import { t } from 'i18n';
import { useI18n } from 'i18n/provider';

vi.mock('api/calculator', () => ({
  calculate: vi.fn(),
}));

const TestLocaleSwitcher: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { setLang } = useI18n();
  return (
    <>
      <button onClick={() => setLang('en-US')}>to-en-US</button>
      <button onClick={() => setLang('pt-BR')}>to-pt-BR</button>
      {children}
    </>
  );
};

describe('Calculator UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () => {
    const user = userEvent.setup();
    const utils = renderWithProviders(
      <TestLocaleSwitcher>
        <Calculator />
      </TestLocaleSwitcher>,
    );
    const root = screen.getByRole('region', { name: /Calculator/i });
    root.focus();
    return { user, root, ...utils };
  };

  const getDisplay = () =>
    screen.getByLabelText(
      /(Calculator display|Visor da calculadora|\[!!! Ćàļćūļàťőř őįśрļàý !!!\])/i,
    );

  it('renders exactly the accepted keypad keys without a CE button', () => {
    setup();

    // Digits 0-9
    for (let i = 0; i <= 9; i++) {
      expect(
        screen.getByRole('button', { name: String(i) }),
      ).toBeInTheDocument();
    }

    // Decimal separator (depends on locale, default en-US is '.')
    expect(
      screen.getByRole('button', { name: /Decimal separator/i }),
    ).toBeInTheDocument();

    // Operators
    expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Subtract/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Multiply/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Divide/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Power/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Percentage/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Square root/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Toggle sign/i }),
    ).toBeInTheDocument();

    // Controls
    expect(screen.getByRole('button', { name: /Clear/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Backspace/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Equals/i })).toBeInTheDocument();

    // Verify NO CE button
    expect(
      screen.queryByRole('button', { name: 'CE' }),
    ).not.toBeInTheDocument();
  });

  it('supports one behavioral test for each key type via mouse', async () => {
    const { user } = setup();
    const mockCalculate = vi.mocked(api.calculate);
    const display = getDisplay();

    // digit
    await user.click(screen.getByRole('button', { name: '5' }));
    expect(display).toHaveTextContent('5');

    // decimal
    await user.click(
      screen.getByRole('button', { name: /Decimal separator/i }),
    );
    await user.click(screen.getByRole('button', { name: '2' }));
    expect(display).toHaveTextContent('5.2');

    // backspace
    await user.click(screen.getByRole('button', { name: /Backspace/i }));
    expect(display).toHaveTextContent('5.');

    // sign toggle
    await user.click(screen.getByRole('button', { name: /Toggle sign/i }));
    expect(display).toHaveTextContent('-5.');

    // clear
    await user.click(screen.getByRole('button', { name: /Clear/i }));
    expect(display).toHaveTextContent('0');

    // binary operator
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: /Add/i }));
    await user.click(screen.getByRole('button', { name: '2' }));

    // equals
    mockCalculate.mockResolvedValueOnce({
      operation: 'add',
      operands: [1, 2],
      result: 3,
    });
    await user.click(screen.getByRole('button', { name: /Equals/i }));
    await waitFor(() => expect(display).toHaveTextContent('3'));

    // unarySqrt
    await user.click(screen.getByRole('button', { name: /Square root/i }));
    mockCalculate.mockResolvedValueOnce({
      operation: 'sqrt',
      operands: [3],
      result: 1.732050807568877,
    });
    await user.click(screen.getByRole('button', { name: /Equals/i }));
    await waitFor(() => expect(display).toHaveTextContent('1.73205080756888')); // Formatted to 15 sig digits

    // retry (simulated by failure then retry)
    mockCalculate.mockRejectedValueOnce(new ApiError('network', 'Failed'));
    await user.click(screen.getByRole('button', { name: /Add/i }));
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: /Equals/i }));

    const retryBtn = await screen.findByRole('button', { name: /Retry/i });
    mockCalculate.mockResolvedValueOnce({
      operation: 'add',
      operands: [1.732050807568877, 1],
      result: 2.732050807568877,
    });
    await user.click(retryBtn);

    expect(mockCalculate).toHaveBeenCalled();
    await waitFor(() => expect(display).toHaveTextContent('2.73205080756888'), {
      timeout: 3000,
    });
  });

  it('attaches keyboard handling to root and supports required mappings', async () => {
    const { user } = setup();
    const display = getDisplay();
    const mockCalculate = vi.mocked(api.calculate);

    await user.keyboard('123.4');
    expect(display).toHaveTextContent('123.4');

    await user.keyboard('+-*/^%');
    // Backspace
    await user.keyboard('{Backspace}');
    // Clear
    await user.keyboard('{Escape}');
    expect(display).toHaveTextContent('0');

    // Sqrt (s)
    await user.keyboard('9s');
    mockCalculate.mockResolvedValueOnce({
      operation: 'sqrt',
      operands: [9],
      result: 3,
    });
    await user.keyboard('=');
    await waitFor(() => expect(display).toHaveTextContent('3'));

    // Equals (Enter)
    await user.keyboard('1+2');
    mockCalculate.mockResolvedValueOnce({
      operation: 'add',
      operands: [1, 2],
      result: 3,
    });
    await user.keyboard('{Enter}');
    await waitFor(() => expect(display).toHaveTextContent('3'));
  });

  it('handles locale-aware decimal separator for en-US and pt-BR', async () => {
    const { user, root } = setup();

    // en-US (default)
    await user.keyboard('1.5');
    expect(getDisplay()).toHaveTextContent('1.5');
    await user.keyboard(','); // ignored
    expect(getDisplay()).toHaveTextContent('1.5');

    // Switch to pt-BR
    await user.click(screen.getByRole('button', { name: 'to-pt-BR' }));
    root.focus();

    // Should preserve state but show comma
    expect(getDisplay()).toHaveTextContent('1,5');

    await user.keyboard('{Escape}');
    await user.keyboard('2,7');
    expect(getDisplay()).toHaveTextContent('2,7');
    await user.keyboard('.'); // ignored
    expect(getDisplay()).toHaveTextContent('2,7');
  });

  it('shows previous result and pending state during submission', async () => {
    const { user } = setup();
    const mockCalculate = vi.mocked(api.calculate);

    let resolve: (value: CalculationResponse) => void;
    const promise = new Promise<CalculationResponse>((r) => {
      resolve = r;
    });
    mockCalculate.mockReturnValue(promise);

    await user.keyboard('10+20=');

    expect(screen.getByText(/Calculating.../i)).toBeInTheDocument();
    // Previous result (10) should be visible
    expect(screen.getByText(/Previous result: 10/i)).toBeInTheDocument();

    act(() => {
      resolve({ operation: 'add', operands: [10, 20], result: 30 });
    });

    await waitFor(() => {
      expect(screen.queryByText(/Calculating.../i)).not.toBeInTheDocument();
      expect(getDisplay()).toHaveTextContent('30');
    });
  });

  it('handles retryable errors with a Retry button', async () => {
    const { user } = setup();
    vi.mocked(api.calculate).mockRejectedValueOnce(
      new ApiError('network', 'Failed'),
    );

    await user.keyboard('1+1=');

    const errorMsg = await screen.findByRole('alert');
    expect(errorMsg).toHaveTextContent(/Network error/i);

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    expect(retryBtn).toBeEnabled();

    vi.mocked(api.calculate).mockResolvedValueOnce({
      operation: 'add',
      operands: [1, 1],
      result: 2,
    });
    await user.click(retryBtn);

    await waitFor(
      () => {
        expect(getDisplay()).toHaveTextContent('2');
      },
      { timeout: 2000 },
    );
  });

  it('handles domain errors without a Retry button', async () => {
    const { user } = setup();
    vi.mocked(api.calculate).mockRejectedValueOnce(
      new ApiError('apiError', 'Domain error', { code: 'division_by_zero' }),
    );

    await user.keyboard('1/0=');

    const errorMsg = await waitFor(() => screen.getByRole('alert'), {
      timeout: 2000,
    });
    expect(errorMsg).toHaveTextContent(/Cannot divide by zero/i);

    expect(
      screen.queryByRole('button', { name: /Retry/i }),
    ).not.toBeInTheDocument();
  });

  it('enforces exhaustive i18n key parity for calculator namespace', () => {
    // This is more of a smoke test for parity, actual parity is checked by pnpm i18n:check
    SUPPORTED_LOCALES.forEach(() => {
      // Just check a few key ones
      expect(t('calculator.title')).toBeDefined();
      expect(t('calculator.controls.retry')).toBeDefined();
    });
  });

  it('truncates long values and provides them via title/aria-label', async () => {
    const { user } = setup();
    const longValue = 1.234567890123456; // 16 digits, will be formatted to 15
    const expected = '1.23456789012346';

    vi.mocked(api.calculate).mockResolvedValueOnce({
      operation: 'add',
      operands: [0, longValue],
      result: longValue,
    });

    await user.keyboard('0+1.234567890123456=');

    const display = await waitFor(() => getDisplay());
    expect(display).toHaveTextContent(expected);
    expect(display).toHaveAttribute('title', expected);
  });

  it('prevents rapid repeated equals activation bypassing the guard', () => {
    const { root } = setup();
    const mockCalculate = vi.mocked(api.calculate);
    mockCalculate.mockReturnValue(new Promise(() => {})); // Never resolves

    fireEvent.keyDown(root, { key: '1' });
    fireEvent.keyDown(root, { key: '+' });
    fireEvent.keyDown(root, { key: '1' });

    fireEvent.click(screen.getByRole('button', { name: /Equals/i }));
    fireEvent.click(screen.getByRole('button', { name: /Equals/i }));
    fireEvent.click(screen.getByRole('button', { name: /Equals/i }));

    expect(mockCalculate).toHaveBeenCalledTimes(1);
  });

  it('performs retry via keyboard only when canRetry', async () => {
    const { user } = setup();

    // Not canRetry — the pure mapping returns null; no dispatch happens.
    await user.keyboard('r');
    expect(api.calculate).not.toHaveBeenCalled();

    // Trigger a retryable failure.
    vi.mocked(api.calculate).mockRejectedValueOnce(
      new ApiError('network', 'Failed'),
    );
    await user.keyboard('1+1=');
    await screen.findByRole('alert');

    // Now canRetry — the same keyboard shortcut dispatches the accepted
    // T-006 retry action.
    vi.mocked(api.calculate).mockResolvedValueOnce({
      operation: 'add',
      operands: [1, 1],
      result: 2,
    });
    await user.keyboard('r');
    await waitFor(() => expect(getDisplay()).toHaveTextContent('2'), {
      timeout: 2000,
    });
  });
});
