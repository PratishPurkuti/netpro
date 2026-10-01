import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { demoContacts } from "../lib/demo";
const origin = "http://localhost:3100";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    env: {
      ...process.env,
      DATABASE_PATH: "./data/browser-" + randomUUID() + ".sqlite",
      APP_ORIGIN: origin,
      NEXT_TELEMETRY_DISABLED: "1",
      NETPRO_ENCRYPTION_KEY: "56".repeat(32),
    },
    stdio: "ignore",
  },
);
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/api/status")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  await expect(
    page.getByRole("heading", {
      name: "Make room for meaningful connections.",
    }),
  ).toBeVisible();
  await page.getByLabel("Username", { exact: true }).fill("demo-owner");
  await page
    .getByLabel("Password · at least 12 characters")
    .fill("synthetic-browser-password");
  await page.getByLabel("Your name").fill("Alex Morgan");
  await page.getByLabel("Location", { exact: true }).fill("Wichita Falls");
  await page.getByRole("button", { name: "Create my workspace" }).click();
  await expect(
    page.getByRole("heading", { name: /Your next idea starts/ }),
  ).toBeVisible();
  for (const c of demoContacts) {
    const response = await context.request.post(origin + "/api/contacts", {
      headers: { origin },
      data: c,
    });
    expect(response.ok()).toBeTruthy();
  }
  await page.reload();
  await expect(
    page.getByText("6 saved contacts", { exact: true }),
  ).toBeVisible();
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({
    path: "docs/screenshots/desktop.png",
    fullPage: true,
  });
  await page
    .getByLabel("Search your saved network")
    .fill("Art in Wichita Falls");
  await page.getByRole("button", { name: "Search network" }).click();
  await expect(
    page.getByRole("heading", { name: "Direct matches" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tentative possibilities" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Maya Chen" })).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/search.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Contacts", exact: false })
    .first()
    .click();
  await page.getByLabel("Search contacts").fill("Maya");
  await page.getByRole("link", { name: "Full profile" }).click();
  await expect(
    page.getByRole("heading", { name: "Maya Chen.", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit contact" }).click();
  await page
    .getByLabel("Additional notes")
    .fill("Synthetic browser edit verified.");
  await page.getByRole("button", { name: "Save contact" }).click();
  await expect(
    page.getByText("Synthetic browser edit verified.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cloud AI is disabled" }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export contacts & profile" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("netpro-private-backup.json");
  const response = await context.request.get(origin + "/api/export");
  const exported = await response.json();
  await page.getByLabel("Import a NetPro JSON backup").setInputFiles({
    name: "synthetic-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(
    page.getByRole("heading", {
      name: "Preview: 6 contacts · 0 conversations",
    }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept("REPLACE"));
  await page.getByRole("button", { name: "Replace existing data" }).click();
  await expect(page.getByText(/Restored. Recovery backup:/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Add contact", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Name *", { exact: true }).fill("Taylor Demo");
  await page.getByLabel("Method 1 value").fill("taylor@example.com");
  await page.getByRole("button", { name: "Save contact" }).click();
  await expect(page.getByText("Contact saved.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Contacts", exact: false })
    .first()
    .click();
  await page.getByLabel("Search contacts").fill("Taylor Demo");
  await page.getByRole("link", { name: "Full profile" }).click();
  await expect(
    page.getByRole("heading", { name: "Taylor Demo." }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete contact" }).click();
  await expect(
    page.getByText("Contact deleted.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.getByLabel("Username", { exact: true }).fill("demo-owner");
  await page
    .getByLabel("Password · at least 12 characters")
    .fill("synthetic-browser-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Your next idea starts/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    "Browser journeys passed: setup, search, profiles, edit, export, import, mobile create/delete, login. Desktop/mobile screenshots contain synthetic data only.",
  );
} finally {
  await browser?.close();
  server.kill();
}
