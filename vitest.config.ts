import { defineConfig } from 'vitest/config';

/** Vitest config для тестов packages/shared */
export default defineConfig({
  test: {
    include: ['packages/shared/**/*.spec.ts'],
  },
});
