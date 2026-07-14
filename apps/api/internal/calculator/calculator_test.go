package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name       string
		op         Operation
		operands   []float64
		wantResult float64
		wantErr    error
	}{
		// --- add ---
		{name: "add success", op: OpAdd, operands: []float64{1, 2}, wantResult: 3},
		{name: "add negative", op: OpAdd, operands: []float64{1, -5}, wantResult: -4},
		{name: "add overflow", op: OpAdd, operands: []float64{math.MaxFloat64, math.MaxFloat64}, wantErr: ErrNumericOverflow},

		// --- subtract ---
		{name: "subtract success", op: OpSubtract, operands: []float64{0, 5}, wantResult: -5},
		{name: "subtract fractional", op: OpSubtract, operands: []float64{10.5, 0.5}, wantResult: 10},

		// --- multiply ---
		{name: "multiply success", op: OpMultiply, operands: []float64{2, 4}, wantResult: 8},
		{name: "multiply overflow", op: OpMultiply, operands: []float64{1e200, 1e200}, wantErr: ErrNumericOverflow},

		// --- divide ---
		{name: "divide success", op: OpDivide, operands: []float64{10, 4}, wantResult: 2.5},
		{name: "divide by positive zero", op: OpDivide, operands: []float64{1, 0}, wantErr: ErrDivisionByZero},
		{name: "divide by negative zero", op: OpDivide, operands: []float64{1, math.Copysign(0, -1)}, wantErr: ErrDivisionByZero},
		{name: "divide overflow", op: OpDivide, operands: []float64{1e308, 1e-308}, wantErr: ErrNumericOverflow},

		// --- sqrt ---
		{name: "sqrt success", op: OpSqrt, operands: []float64{9}, wantResult: 3},
		{name: "sqrt zero", op: OpSqrt, operands: []float64{0}, wantResult: 0},
		{name: "sqrt negative zero", op: OpSqrt, operands: []float64{math.Copysign(0, -1)}, wantResult: 0},
		{name: "sqrt fractional", op: OpSqrt, operands: []float64{2}, wantResult: 1.4142135623730951},
		{name: "sqrt negative", op: OpSqrt, operands: []float64{-1}, wantErr: ErrMathDomain},

		// --- percentage ---
		{name: "percentage success", op: OpPercentage, operands: []float64{200, 15}, wantResult: 30},
		{name: "percentage zero rate", op: OpPercentage, operands: []float64{50, 0}, wantResult: 0},
		{name: "percentage negative base", op: OpPercentage, operands: []float64{-40, 25}, wantResult: -10},
		{name: "percentage overflow", op: OpPercentage, operands: []float64{1e300, 1e10}, wantErr: ErrNumericOverflow},

		// --- power ---
		{name: "power success", op: OpPower, operands: []float64{2, 3}, wantResult: 8},
		{name: "power zero base zero exponent", op: OpPower, operands: []float64{0, 0}, wantResult: 1},
		{name: "power negative base integer exponent odd", op: OpPower, operands: []float64{-2, 3}, wantResult: -8},
		{name: "power negative base integer exponent even", op: OpPower, operands: []float64{-2, 2}, wantResult: 4},
		{name: "power negative base non-integer exponent", op: OpPower, operands: []float64{-2, 0.5}, wantErr: ErrMathDomain},
		{name: "power negative exponent", op: OpPower, operands: []float64{2, -2}, wantResult: 0.25},
		{name: "power zero base negative exponent", op: OpPower, operands: []float64{0, -1}, wantErr: ErrMathDomain},
		{name: "power overflow", op: OpPower, operands: []float64{10, 1000}, wantErr: ErrNumericOverflow},
		{name: "power integer predicate near integer", op: OpPower, operands: []float64{-2, 3.0000000000000004}, wantErr: ErrMathDomain},

		// --- Validation & Errors ---
		{name: "unsupported operation", op: "unsupported", operands: []float64{1, 2}, wantErr: ErrUnsupportedOperation},
		{name: "empty operation", op: "", operands: []float64{1, 2}, wantErr: ErrUnsupportedOperation},
		{name: "too few operands", op: OpAdd, operands: []float64{1}, wantErr: ErrInvalidOperands},
		{name: "too many operands", op: OpAdd, operands: []float64{1, 2, 3}, wantErr: ErrInvalidOperands},
		{name: "nil operands", op: OpAdd, operands: nil, wantErr: ErrInvalidOperands},
		{name: "non-finite operand NaN", op: OpAdd, operands: []float64{math.NaN(), 1}, wantErr: ErrInvalidOperands},
		{name: "non-finite operand +Inf", op: OpAdd, operands: []float64{math.Inf(1), 1}, wantErr: ErrInvalidOperands},
		{name: "non-finite operand -Inf", op: OpAdd, operands: []float64{math.Inf(-1), 1}, wantErr: ErrInvalidOperands},

		// --- Per-operation arity coverage ---
		{name: "sqrt too many operands", op: OpSqrt, operands: []float64{1, 2}, wantErr: ErrInvalidOperands},
		{name: "sqrt too few operands", op: OpSqrt, operands: nil, wantErr: ErrInvalidOperands},
		{name: "divide too few operands", op: OpDivide, operands: []float64{1}, wantErr: ErrInvalidOperands},
		{name: "power too many operands", op: OpPower, operands: []float64{1, 2, 3}, wantErr: ErrInvalidOperands},
		{name: "percentage too few operands", op: OpPercentage, operands: []float64{50}, wantErr: ErrInvalidOperands},

		// --- Zero normalization on non-sqrt paths ---
		// -0 + -0 = -0 under IEEE-754; the domain must normalize to +0.
		{name: "add negative-zero operands normalizes result", op: OpAdd, operands: []float64{math.Copysign(0, -1), math.Copysign(0, -1)}, wantResult: 0},
		{name: "subtract equal operands normalizes result", op: OpSubtract, operands: []float64{5, 5}, wantResult: 0},
		{name: "multiply by zero normalizes result", op: OpMultiply, operands: []float64{math.Copysign(0, -1), 3}, wantResult: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.operands)

			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("Calculate() error = %v, wantErr %v", err, tt.wantErr)
				}
				return
			}

			if err != nil {
				t.Fatalf("Calculate() unexpected error: %v", err)
			}

			if got != tt.wantResult {
				t.Errorf("Calculate() = %v, want %v", got, tt.wantResult)
			}

			// Ensure zero result is normalized
			if tt.wantResult == 0 {
				if math.Signbit(got) {
					t.Errorf("Calculate() returned negative zero, want positive zero")
				}
			}
		})
	}
}

func TestNormalizeZero(t *testing.T) {
	tests := []struct {
		name  string
		input float64
		want  float64
	}{
		{"positive zero", 0, 0},
		{"negative zero", math.Copysign(0, -1), 0},
		{"positive value", 1.5, 1.5},
		{"negative value", -1.5, -1.5},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NormalizeZero(tt.input)
			if got != tt.want {
				t.Errorf("NormalizeZero() = %v, want %v", got, tt.want)
			}
			if got == 0 && math.Signbit(got) {
				t.Errorf("NormalizeZero() returned negative zero, want positive zero")
			}
		})
	}
}

func TestSentinelErrors(t *testing.T) {
	sentinels := []error{
		ErrUnsupportedOperation,
		ErrInvalidOperands,
		ErrDivisionByZero,
		ErrMathDomain,
		ErrNumericOverflow,
	}

	for _, err := range sentinels {
		if err == nil {
			t.Errorf("sentinel error is nil")
			continue
		}
		// Basic check that errors.Is works with itself
		if !errors.Is(err, err) {
			t.Errorf("errors.Is(%v, %v) failed", err, err)
		}
	}
}
