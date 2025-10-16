/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/cypress/', '/.next/'],
  passWithNoTests: true,
  setupFilesAfterEnv: [],
};
