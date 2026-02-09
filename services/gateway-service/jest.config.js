export default {
  // 1. Tell Jest we are running in Node environment
  testEnvironment: 'node',

  // 2. Disable default transforms (since we are using --experimental-vm-modules)
  transform: {},

  // 3. THE FIX: Force Jest to load the CJS (CommonJS) version of the library
  // This bypasses the "SyntaxError" in the ES version
  moduleNameMapper: {
    '^aws-sdk-client-mock-jest$': '<rootDir>/node_modules/aws-sdk-client-mock-jest/dist/cjs/jest.js'
  }
};