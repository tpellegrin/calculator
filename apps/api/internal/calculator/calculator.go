package calculator

import (
	"math"
)

// Calculate performs the requested arithmetic operation on the provided operands.
// It enforces domain validation, arity requirements, and numeric safety rules
// defined by the calculator contract.
func Calculate(op Operation, operands []float64) (float64, error) {
	// 1. Identify whether the operation is supported
	expectedArity, ok := arity[op]
	if !ok {
		return 0, ErrUnsupportedOperation
	}

	// 2. Validate the exact operand count for that operation
	if len(operands) != expectedArity {
		return 0, ErrInvalidOperands
	}

	// 3. Validate domain-level operand requirements (finite values only)
	for _, v := range operands {
		if math.IsInf(v, 0) || math.IsNaN(v) {
			return 0, ErrInvalidOperands
		}
	}

	var result float64

	// 4. Run operation-specific mathematical-domain guards and 5. perform arithmetic
	switch op {
	case OpAdd:
		result = operands[0] + operands[1]

	case OpSubtract:
		result = operands[0] - operands[1]

	case OpMultiply:
		result = operands[0] * operands[1]

	case OpDivide:
		// Both positive and negative zero are invalid divisors
		if operands[1] == 0 {
			return 0, ErrDivisionByZero
		}
		result = operands[0] / operands[1]

	case OpSqrt:
		// Signed negative zero is equal to zero and must not be rejected
		if operands[0] < 0 {
			return 0, ErrMathDomain
		}
		result = math.Sqrt(operands[0])

	case OpPercentage:
		// Formula: base * rate / 100
		result = operands[0] * operands[1] / 100

	case OpPower:
		base := operands[0]
		exponent := operands[1]

		// Integer-exponent predicate: math.Trunc(exponent) == exponent
		isInteger := math.Trunc(exponent) == exponent

		// Domain guard: negative base with non-integer exponent
		if base < 0 && !isInteger {
			return 0, ErrMathDomain
		}
		// Domain guard: zero base with negative exponent
		if base == 0 && exponent < 0 {
			return 0, ErrMathDomain
		}

		result = math.Pow(base, exponent)
	}

	// 6. Classify the resulting value
	if math.IsInf(result, 0) {
		return 0, ErrNumericOverflow
	}
	if math.IsNaN(result) {
		// Unexpected NaN from any remaining unsupported real-number domain
		return 0, ErrMathDomain
	}

	// 7. Normalize a successful zero result and 8. return the result
	return NormalizeZero(result), nil
}

// NormalizeZero converts negative zero to positive zero.
// Non-zero values are returned unchanged.
func NormalizeZero(value float64) float64 {
	if value == 0 {
		return 0
	}
	return value
}
