import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 30000 },
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL: "http://127.0.0.1:5188",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
    launchOptions: {
      ...(process.platform === "win32"
        ? {
            executablePath:
              "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
          }
        : {}),
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        "--autoplay-policy=no-user-gesture-required",
      ],
    },
  },
  webServer: [
    {
      command: "node e2e/server.cjs",
      url: "http://127.0.0.1:5059/api/status",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: "npx vite build --config e2e/vite.config.js --outDir e2e-dist && npx vite preview --config e2e/vite.config.js --host 127.0.0.1 --port 5188 --strictPort",
      url: "http://127.0.0.1:5188",
      reuseExistingServer: false,
      timeout: 180000,
    },
  ],
});
