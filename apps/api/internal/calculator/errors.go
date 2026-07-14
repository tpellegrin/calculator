package calculator

import "errors"

var (
	// ErrUnsupportedOperation is returned when the requested operation identifier is unknown.
	ErrUnsupportedOperation = errors.New("unsupported operation")

	// ErrInvalidOperands is returned when the operand count is incorrect or operands are non-finite.
	ErrInvalidOperands = errors.New("invalid operands")

	// ErrDivisionByZero is returned when a division by zero is attempted.
	ErrDivisionByZero = errors.New("division by zero")

	// ErrMathDomain is returned for mathematically undefined operations (e.g., sqrt of negative).
	ErrMathDomain = errors.New("mathematical domain failure")

	// ErrNumericOverflow is returned when the result of a calculation exceeds the finite range of float64.
	ErrNumericOverflow = errors.New("numeric overflow")
)
