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
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  reporter: 'html',

  use: {
    // baseURL: 'http://localhost:5173',
    baseURL: 'https://d10aqqj0011qw9.cloudfront.net/',
    // headless: false,
    headless: true,
    trace: 'on-first-retry',
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
