# JurisAI Frontend Tests

This directory contains tests for the JurisAI frontend application.

## Test Structure

- `__tests__/components/`: Tests for React components
- `__tests__/contexts/`: Tests for React context providers
- `__tests__/hooks/`: Tests for custom React hooks

## Running Tests

To run the tests, you'll need to install the dependencies first:

```bash
cd apps/frontend
npm install
```

Then run the tests using Jest:

```bash
npm test
```

To run tests in watch mode:

```bash
npm run test:watch
```

To run tests with coverage:

```bash
npm run test:coverage
```

## Writing Tests

When writing tests:

1. Place component tests in the `__tests__/components/` directory
2. Place context tests in the `__tests__/contexts/` directory
3. Place hook tests in the `__tests__/hooks/` directory
4. Name test files with a `.test.tsx` or `.test.ts` extension
5. Use the React Testing Library for component testing
6. Mock external dependencies as needed
