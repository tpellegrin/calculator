# `features/`

Reserved for calculator-specific code (operation forms, result displays,
history, hooks that call the API).

Nothing lives here yet: the foundation task deliberately stops before adding
domain code. When the calculator implementation task starts, each feature
should own its container(s), styles, colocated `logic.ts`, and tests, and
should compose reusable primitives from `src/components/` rather than
introducing global abstractions.
