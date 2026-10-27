// The `/vitest` entry registers the jest-dom matchers AND augments Vitest's
// `Assertion` interface — the bare `@testing-library/jest-dom` import only
// augments Jest's, which leaves `toBeInTheDocument` & co. untyped here.
import '@testing-library/jest-dom/vitest';
