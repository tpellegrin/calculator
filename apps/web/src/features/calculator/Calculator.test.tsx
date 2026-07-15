import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { renderWithProviders } from 'test/utils';
import * as api from 'api/calculator';
import type { CalculationResponse } from 'api/types';
import { Calculator } from './index';

vi.mock('api/calculator', () => ({
  calculate: vi.fn(),
}));

describe('Calculator component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the physical keypad and display', () => {
    renderWithProviders(<Calculator />);

    expect(screen.getByLabelText(/Calculator display/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Equals/i })).toBeInTheDocument();
  });

  it('updates display on digit click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Calculator />);

    const display = screen.getByLabelText(/Calculator display/i);
    expect(display).toHaveTextContent('0');

    await user.click(screen.getByRole('button', { name: '5' }));
    expect(display).toHaveTextContent('5');

    await user.click(screen.getByRole('button', { name: '2' }));
    expect(display).toHaveTextContent('52');
  });

  it('performs a calculation and displays result', async () => {
    const user = userEvent.setup();
    const mockCalculate = vi.mocked(api.calculate);
    mockCalculate.mockResolvedValue({
      operation: 'add',
      operands: [12, 30],
      result: 42,
    });

    renderWithProviders(<Calculator />);
    const display = screen.getByLabelText(/Calculator display/i);

    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: /Add/i }));
    await user.click(screen.getByRole('button', { name: '3' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: /Equals/i }));

    expect(mockCalculate).toHaveBeenCalledWith(
      { operation: 'add', operands: [12, 30] },
      expect.any(Object),
    );

    // Should show result
    await waitFor(() => {
      expect(display).toHaveTextContent('42');
    });
  });

  it('handles square root (unary)', async () => {
    const user = userEvent.setup();
    const mockCalculate = vi.mocked(api.calculate);
    mockCalculate.mockResolvedValue({
      operation: 'sqrt',
      operands: [9],
      result: 3,
    });

    renderWithProviders(<Calculator />);
    const display = screen.getByLabelText(/Calculator display/i);

    await user.click(screen.getByRole('button', { name: '9' }));
    await user.click(screen.getByRole('button', { name: /Square root/i }));
    await user.click(screen.getByRole('button', { name: /Equals/i }));

    expect(mockCalculate).toHaveBeenCalledWith(
      { operation: 'sqrt', operands: [9] },
      expect.any(Object),
    );
    await waitFor(() => {
      expect(display).toHaveTextContent('3');
    });
  });

  it('handles percentage (binary)', async () => {
    const user = userEvent.setup();
    const mockCalculate = vi.mocked(api.calculate);
    mockCalculate.mockResolvedValue({
      operation: 'percentage',
      operands: [200, 15],
      result: 30,
    });

    renderWithProviders(<Calculator />);
    const display = screen.getByLabelText(/Calculator display/i);

    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: /Percentage/i }));
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: /Equals/i }));

    expect(mockCalculate).toHaveBeenCalledWith(
      { operation: 'percentage', operands: [200, 15] },
      expect.any(Object),
    );
    await waitFor(() => {
      expect(display).toHaveTextContent('30');
    });
  });

  it('shows loading status', async () => {
    const mockCalculate = vi.mocked(api.calculate);
    let resolve: (value: CalculationResponse) => void;
    const promise = new Promise<CalculationResponse>((r) => {
      resolve = r;
    });
    mockCalculate.mockReturnValue(promise);

    renderWithProviders(<Calculator />);

    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: /Add/i }));
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: /Equals/i }));

    expect(screen.getByText(/Calculating.../i)).toBeInTheDocument();

    act(() => {
      resolve({ operation: 'add', operands: [1, 1], result: 2 });
    });

    await waitFor(() => {
      expect(screen.queryByText(/Calculating.../i)).not.toBeInTheDocument();
    });
  });

  it('handles keyboard input', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Calculator />);
    const root = screen.getByRole('region');
    const display = screen.getByLabelText(/Calculator display/i);

    root.focus();
    await user.keyboard('123');
    expect(display).toHaveTextContent('123');

    await user.keyboard('{Backspace}');
    expect(display).toHaveTextContent('12');

    await user.keyboard('+');
    // Binary state, buffer resets to 0
    expect(display).toHaveTextContent('0');

    await user.keyboard('5=');
    // Note: Equals won't resolve unless we mock it, but we can check if it called API
    expect(api.calculate).toHaveBeenCalled();
  });
});
