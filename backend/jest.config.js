module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/tests/**/*.test.js'],

  // Timeout para tests largos
  testTimeout: 60000,

  // Mock automático de módulos problemáticos
  moduleNameMapper: {
    '^@faker-js/faker$': '<rootDir>/tests/__mocks__/faker.js'
  }
};
