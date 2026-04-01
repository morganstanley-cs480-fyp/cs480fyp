import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({
  path: path.resolve(__dirname, 'playwright.env'), // or .env
});

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const frontendenv = {
  ...process.env,
  VITE_COGNITO_AUTHORITY: process.env.VITE_COGNITO_AUTHORITY,
  VITE_COGNITO_CLIENT_ID: process.env.VITE_COGNITO_CLIENT_ID,
  VITE_COGNITO_REDIRECT_URI: process.env.VITE_COGNITO_REDIRECT_URI,
  VITE_COGNITO_LOGOUT_URI: process.env.VITE_COGNITO_LOGOUT_URI,
  VITE_COGNITO_DOMAIN: process.env.VITE_COGNITO_DOMAIN,
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
  VITE_TRADE_FLOW_API_BASE_URL: process.env.VITE_TRADE_FLOW_API_BASE_URL,
  VITE_EXCEPTION_API_BASE_URL: process.env.VITE_EXCEPTION_API_BASE_URL,
};

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    // headless: false,
    headless: true,
    trace: 'on-first-retry',
  },
  webServer: {
    command: "npm run dev",
    port: 5173,
    cwd: "../",
    env: frontendenv

  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*authsetup\.ts/,
      use: {
        storageState: undefined, 
      },
    },

    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /.*authsetup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: '/usr/bin/chromium',
        },
        storageState: 'auth.json',
      },
    },


  ],
});
