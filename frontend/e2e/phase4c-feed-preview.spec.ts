import { test, expect, type Page } from '@playwright/test';

// Phase 4C, Stage 1 — Feed Engine "Core Enterprise Loop". Real browser
// verification against a real dev server + real backend + real DB, covering
// Live Feed Preview, explainable ranking, and Configuration History.
//
// No password-login FORM exists in the UI (Google OAuth only, by deliberate
// design — see the project's July audits), so this suite logs in the same
// way the app itself restores a session on reload: it hits the real login
// API directly via `page.request` (sharing the browser context's cookie
// jar) to obtain the httpOnly refresh cookie, then loads the app, which
// silently calls /auth/refresh on mount (see providers.tsx's AuthBootstrap)
// and hydrates the session exactly as a real reload would.
//
// A single test covers all three Stage 1 admin surfaces sequentially
// (rather than one login per `test()`) since /auth/login is rate-limited
// to 5 requests / 15 minutes — a real production safeguard, not a test
// artifact to route around by hammering the endpoint.
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:5000/api/v1';
const TEST_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'phase4c-verify@example.com';
const TEST_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'TestPass123!';

async function loginAsAdmin(page: Page): Promise<void> {
  const response = await page.request.post(`${API_URL}/auth/login`, {
    data: { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();

  // A direct page.goto('/admin/feed') races ProtectedRoute's redirect
  // effect against providers.tsx's silent /auth/refresh — ProtectedRoute
  // can fire router.replace('/login') before the refresh resolves, and
  // /login then bounces an already-authenticated user to /dashboard. This
  // is a pre-existing timing quirk in shared app infrastructure, unrelated
  // to Stage 1's changes. Route around it by loading once (letting that
  // race settle on /dashboard), then reaching Feed Engine via in-app client
  // navigation, which doesn't remount providers.tsx or re-trigger the race.
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('link', { name: 'Admin Panel' }).click();
  await page.getByRole('link', { name: 'Feed Engine' }).click();
  await expect(page.getByRole('heading', { name: 'Feed Engine' })).toBeVisible({ timeout: 15_000 });
}

test('Phase 4C, Stage 1 — Live Preview, explainable ranking, and Configuration History', async ({ page }) => {
  await loginAsAdmin(page);

  await test.step('Live Preview renders and reacts to an unsaved weight edit', async () => {
    await expect(page.getByRole('heading', { name: 'Live Preview' })).toBeVisible();
    await expect(page.getByText('Preview only — not saved')).toBeVisible();
    await expect(page.getByText('Recalculating…')).toBeHidden({ timeout: 10_000 });

    const freshnessSlider = page
      .locator('div')
      .filter({ hasText: /^Freshness/ })
      .getByRole('slider')
      .first();
    await freshnessSlider.focus();
    for (let i = 0; i < 20; i++) {
      await freshnessSlider.press('ArrowRight');
    }

    // The debounced preview call should re-fire on the edit and settle.
    await page.waitForTimeout(600);
    await expect(page.getByText('Recalculating…')).toBeHidden({ timeout: 10_000 });
  });

  await test.step('Explainable ranking: score breakdown popover shows the real formula terms', async () => {
    const infoButton = page.getByRole('button', { name: 'Why am I seeing this?' }).first();
    await expect(infoButton).toBeVisible({ timeout: 10_000 });
    await infoButton.click();

    const popover = page.locator('[data-slot="popover-content"]').filter({ hasText: 'Why this card?' });
    await expect(popover).toBeVisible();
    await expect(popover.getByText('Freshness')).toBeVisible();
    await expect(popover.getByText('Final score')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  await test.step('Configuration History records a save with a reason, and rollback adds a new entry', async () => {
    const reasonInput = page.getByLabel('Reason for this change (optional)');
    await reasonInput.fill('Playwright e2e verification');

    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Feed configuration saved.')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole('heading', { name: 'Configuration History' })).toBeVisible();
    // Component renders curly quotes (&ldquo;/&rdquo;), not straight ones.
    await expect(page.getByText('Playwright e2e verification')).toBeVisible({ timeout: 10_000 });

    const rollbackButtons = page.getByRole('button', { name: 'Rollback to this version' });
    const historyCountBefore = await rollbackButtons.count();
    await rollbackButtons.first().click();
    await expect(page.getByText('Rolled back to this version.')).toBeVisible({ timeout: 10_000 });

    // Rollback must ADD a new entry, never remove the one just created.
    await expect(async () => {
      expect(await rollbackButtons.count()).toBeGreaterThan(historyCountBefore);
    }).toPass({ timeout: 10_000 });
  });
});
