package calculator

// Operation represents a supported calculator operation.
type Operation string

const (
	// OpAdd represents the addition operation (binary).
	OpAdd Operation = "add"
	// OpSubtract represents the subtraction operation (binary).
	OpSubtract Operation = "subtract"
	// OpMultiply represents the multiplication operation (binary).
	OpMultiply Operation = "multiply"
	// OpDivide represents the division operation (binary).
	OpDivide Operation = "divide"
	// OpPower represents the exponentiation operation (binary).
	OpPower Operation = "power"
	// OpSqrt represents the square root operation (unary).
	OpSqrt Operation = "sqrt"
	// OpPercentage represents the percentage calculation (binary).
	OpPercentage Operation = "percentage"
)

// arity maps each operation to its required number of operands.
var arity = map[Operation]int{
	OpAdd:        2,
	OpSubtract:   2,
	OpMultiply:   2,
	OpDivide:     2,
	OpPower:      2,
	OpSqrt:       1,
	OpPercentage: 2,
}
