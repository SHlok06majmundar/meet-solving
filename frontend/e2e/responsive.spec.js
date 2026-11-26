import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const sizes = [
  { width: 320, height: 740 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 844, height: 390 },
];
const id = "c80efc1a-4ac1-4f1c-8c90-4f8df64210fd";
async function noOverflow(page) {
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), { timeout: 3000 }).toBe(true);
}
async function inside(page, locator) {
  const rect = await locator.boundingBox();
  expect(rect).not.toBeNull();
  const viewport = page.viewportSize();
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width + 1);
}

for (const mode of ["light", "dark"]) {
  test(`${mode} dashboard stays usable from small phones to wide desktops`, async ({
    page,
  }) => {
    await page.addInitScript(
      ({ mode, id }) => {
        localStorage.setItem("nexus_ui_mode", mode);
        localStorage.setItem(
          "nexus_recentMeetings_user_e2e_alice",
          JSON.stringify([
            {
              id,
              title: "A long project planning meeting with a descriptive title",
              date: new Date().toISOString(),
            },
          ]),
        );
      },
      { mode, id },
    );
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Ready when you are." }),
    ).toBeVisible();
    for (const size of sizes) {
      await page.setViewportSize(size);
      await noOverflow(page);
      await inside(
        page,
        page.getByRole("button", { name: "Start a meeting", exact: true }),
      );
      await inside(
        page,
        page.getByRole("textbox", { name: "Meeting link or ID" }),
      );
      if (size.width === 320 || size.width === 1440)
        await page.screenshot({
          path: `test-results/dashboard-${mode}-${size.width}.png`,
          fullPage: true,
        });
    }
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      accessibility.violations.map((issue) => ({
        rule: issue.id,
        targets: issue.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  });

  test(`${mode} landing page navigation fits every supported viewport`, async ({
    page,
  }) => {
    await page.addInitScript((mode) => {
      localStorage.setItem("nexus_ui_mode", mode);
      localStorage.setItem("e2e-signed-out", "true");
    }, mode);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    for (const size of sizes) {
      await page.setViewportSize(size);
      await noOverflow(page);
      await inside(page, page.getByRole("banner"));
      if (size.width === 320 || size.width === 1440)
        await page.screenshot({
          path: `test-results/landing-${mode}-${size.width}.png`,
          fullPage: true,
        });
    }
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      accessibility.violations.map((issue) => ({
        rule: issue.id,
        targets: issue.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  });
}

test("dashboard validates invitations and creates a useful agenda and share dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("textbox", { name: "Meeting link or ID" })
    .fill("invalid invitation");
  await page.getByRole("button", { name: "Join meeting", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Enter a valid meeting");
  await page
    .getByRole("textbox", { name: "Meeting title", exact: true })
    .fill("Sprint planning");
  await page
    .getByRole("textbox", { name: "What do you want to achieve?" })
    .fill("Choose the next release scope");
  await page.getByRole("button", { name: "Prepare an agenda" }).click();
  await expect(
    page.getByRole("dialog", { name: "Your meeting agenda" }),
  ).toBeVisible();
  await noOverflow(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("meeting controls remain visible, media preferences are honored, and panels support keyboard dismissal", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.SpeechRecognition = class {
      start() { this.onstart?.(); }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    };
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route("**/api/ice-servers", (route) =>
    route.fulfill({ json: { iceServers: [] } }),
  );
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Microphone preference" }).click();
  await page.getByRole("button", { name: "Camera preference" }).click();
  await page
    .getByRole("button", { name: "Start a meeting", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unmute microphone", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Turn camera on", exact: true }),
  ).toBeVisible();
  for (const size of sizes) {
    await page.setViewportSize(size);
    for (const label of [
      "Unmute microphone",
      "Turn camera on",
      "Open meeting chat",
      "More meeting tools",
      "Leave meeting",
    ]) {
      const button = page.getByRole("button", { name: label, exact: true });
      await inside(page, button);
      const bounds = await button.boundingBox();
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(size.height + 1);
      expect(bounds.width).toBeGreaterThanOrEqual(44);
    }
    await noOverflow(page);
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await page
    .getByRole("button", { name: "Open meeting chat", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Meeting chat" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Hello team");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Hello team", { exact: false })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Meeting chat" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "More meeting tools" }).click();
  await expect(
    page.getByRole("dialog", { name: "More meeting tools" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "More meeting tools" }),
  ).toBeFocused();
  await page.screenshot({
    path: "test-results/meeting-mobile.png",
    fullPage: true,
  });
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.map((issue) => ({
      rule: issue.id,
      targets: issue.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Unmute microphone", exact: true }).click();
  await page.getByRole("button", { name: "More meeting tools" }).click();
  await page.getByRole("button", { name: "Start Transcription", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "AI Meeting Intelligence" })).toBeVisible();
  await noOverflow(page);
  await inside(page, page.getByRole("button", { name: "Close", exact: true }));
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "AI Meeting Intelligence" })).not.toBeVisible();
  await page
    .getByRole("button", { name: "Leave meeting", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ready when you are." }),
  ).toBeVisible();
});

test("two browser contexts can exchange meeting messages", async ({
  browser,
}) => {
  const alice = await browser.newContext();
  const bob = await browser.newContext();
  try {
    await bob.addInitScript(() =>
      localStorage.setItem("e2e-user-id", "user_e2e_bob"),
    );
    const a = await alice.newPage();
    const b = await bob.newPage();
    for (const page of [a, b])
      await page.route("**/api/ice-servers", (route) =>
        route.fulfill({ json: { iceServers: [] } }),
      );
    await a.goto("http://127.0.0.1:5188/dashboard", {
      waitUntil: "domcontentloaded",
    });
    await a
      .getByRole("button", { name: "Start a meeting", exact: true })
      .click();
    await expect(
      a.getByRole("button", { name: "Leave meeting", exact: true }),
    ).toBeVisible();
    await b.goto(a.url(), { waitUntil: "domcontentloaded" });
    await expect(
      b.getByRole("button", { name: "Leave meeting", exact: true }),
    ).toBeVisible();
    await expect(a.getByText("2 participants", { exact: true })).toBeVisible();
    await expect.poll(() => b.locator('video[id^="video-"]').evaluateAll(videos => videos.some(video => video.readyState >= 2 && video.srcObject?.getVideoTracks().length > 0)), { timeout: 30000 }).toBe(true);
    await a
      .getByRole("button", { name: "Open meeting chat", exact: true })
      .click();
    await b
      .getByRole("button", { name: "Open meeting chat", exact: true })
      .click();
    await a
      .getByRole("textbox", { name: "Message", exact: true })
      .fill("A real cross-context message");
    await a.getByRole("button", { name: "Send message" }).click();
    await expect(
      b.getByText("A real cross-context message", { exact: true }),
    ).toBeVisible();
  } finally {
    await alice.close();
    await bob.close();
  }
});

test("connection configuration failures offer a working retry", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/ice-servers", route => {
    attempts++;
    return attempts === 1 ? route.fulfill({ status: 503, json: { error: "Temporary connection problem" } }) : route.fulfill({ json: { iceServers: [] } });
  });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Start a meeting", exact: true }).click();
  await expect(page.getByText("Temporary connection problem", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(page.getByRole("button", { name: "Leave meeting", exact: true })).toBeVisible();
  expect(attempts).toBe(2);
});

test("scheduled meetings create shareable links and a calendar file", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  const schedule = page.getByRole("dialog", { name: "Plan a meeting" });
  await schedule.getByRole("textbox", { name: "Meeting title", exact: true }).fill("Design review");
  await schedule.getByLabel("Date", { exact: true }).fill(new Date(Date.now() + 864000000).toISOString().slice(0, 10));
  await schedule.getByLabel("Time", { exact: true }).fill("10:30");
  await schedule.getByRole("button", { name: "Create invitation" }).click();
  const sharing = page.getByRole("dialog", { name: "Share Scheduled Meeting" });
  await expect(sharing).toBeVisible();
  await noOverflow(page);
  await sharing.getByRole("tab", { name: "Social", exact: true }).click();
  await noOverflow(page);
  await sharing.getByRole("button", { name: "Close sharing dialog" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download calendar invitation" }).click();
  expect((await download).suggestedFilename()).toBe("nexus-meeting.ics");
});
