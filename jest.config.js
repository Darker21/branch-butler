/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node", // Use Node.js environment for testing
  transform: {}, // Disable any default transforms
  testMatch: ["<rootDir>/test/**/*.test.mjs"],
  moduleDirectories: ["node_modules", "src"],
  moduleNameMapper: {
    "^@src/(.*)$": "<rootDir>/src/$1", // Optional: for aliasing src paths
    "^@test/(.*)$": "<rootDir>/test/$1", // Optional: for aliasing test paths
  },
};

module.exports = config;