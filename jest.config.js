/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/cypress/', '/.next/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': '<rootDir>/test-utils/styleMock.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
    '^.+\\.(js|jsx)$': [
      'babel-jest',
      {
        presets: [
          [
            'next/babel',
            {
              'preset-env': { targets: { node: 'current' } },
              'preset-react': { runtime: 'automatic' },
            },
          ],
        ],
      },
    ],
  },
  passWithNoTests: true,
  setupFiles: ['<rootDir>/test-utils/jest-setup.js'],
  setupFilesAfterEnv: [],
};
