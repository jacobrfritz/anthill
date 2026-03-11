# Gemini Instructions for Anthill

This document defines the foundational mandates for development within this workspace. These instructions take absolute precedence over general defaults.

## Core Development Philosophy

- **Professionalism:** Write clean, maintainable, and well-documented code. Follow industry-standard design patterns (SOLID, DRY, KISS).
- **Type Safety:** Ensure rigorous type safety in both TypeScript and Python.
- **Verification:** No change is complete without empirical verification through automated tests.

## Development Workflows

### Spec-Driven Development (SDD)
Before implementing any significant feature or refactoring:
1. **Draft Specifications:** Create or update a specification document (e.g., in `docs/specs/`) detailing the requirements, architecture, and API contracts.
2. **Review:** Ensure the specification aligns with the project's architectural goals.
3. **Traceability:** Implementation must strictly map back to the defined specifications.

### Test-Driven Development (TDD)
Adhere to the Red-Green-Refactor cycle for all logic changes:
1. **Red:** Write a failing test case that defines the desired improvement or new function.
2. **Green:** Produce the minimum amount of code necessary to pass the test.
3. **Refactor:** Clean up the new code while ensuring tests remain green.
4. **Bug Fixes:** Every bug report must start with a reproduction test case that fails before the fix is applied.

## Language Standards

### Python
- **Environment:** Always use a virtual environment (`venv`). It should be located at the root of the `backend/` directory as `.venv`.
- **Tooling:** Use `pytest` for testing, `mypy` for type checking, and `ruff` for linting and formatting.
- **Typing:** Use type hints for all function signatures and complex variables. Use `pydantic` for data validation where appropriate.
- **Style:** Follow PEP 8 via `ruff` defaults. Use docstrings (Google or NumPy style) for public modules and functions.

### TypeScript
- **Tooling:** Use `vitest` or `jest` for testing, and `eslint`/`prettier` for linting/formatting.
- **Strictness:** Enable `strict` mode in `tsconfig.json`. Avoid `any` at all costs; use `unknown` or specific interfaces/types.
- **Functional Patterns:** Prefer immutability and functional programming patterns where they improve clarity.

## Testing Mandates
- **Coverage:** Aim for high meaningful coverage. Focus on edge cases and contract boundaries.
- **Isolation:** Use mocks and dependencies injection to isolate units under test.
- **Integration:** Maintain a suite of integration tests to verify the collaboration between modules.
