import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  // e2e/ holds Playwright specs (npm run test:e2e), not Jest tests
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
}

export default config
