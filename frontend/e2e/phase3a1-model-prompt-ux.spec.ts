import { test, expect } from '@playwright/test';

// Phase 3A.1 — real browser verification for Prompt Fork, Version History/
// Navigation, and Copy verification. Runs against a real dev server + real
// backend + real DB, authenticated via a real refreshToken cookie obtained
// from an actual login call (see backend/scripts/_phase3a1VerifySetup.ts and
// the seeding commands in the session transcript) — not a mocked session.
//
// Structured as ONE continuous test with sequential steps sharing a single
// page/context (not isolated per-test contexts) — the backend rotates the
// refresh token on every use (correct security behavior, verified in Phase
// 3A), so re-injecting one static token into N independent fresh contexts
// only authenticates the first; a single continuous session mirrors how a
// real user actually browses and lets the app's own silent-refresh keep the
// session valid throughout, exactly as it does in production.
//
// Required env vars (set by the setup script's output before running this):
// E2E_REFRESH_TOKEN, E2E_V1_SLUG, E2E_V2_SLUG, E2E_V3_SLUG, E2E_COPY_SLUG,
// E2E_COPY_CONTENT_B64, E2E_FORK_SLUG, E2E_MODEL_SLUG

const env = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name} — run the seed setup first.`);
  return value;
};

test('Phase 3A.1 — Model & Prompt UX (copy, fork, version history/nav, download, admin, mobile, dark mode)', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(120_000);

  const url = new URL(baseURL ?? 'http://localhost:3002');
  await context.addCookies([
    {
      name: 'refreshToken',
      value: env('E2E_REFRESH_TOKEN'),
      domain: url.hostname,
      path: '/api/v1/auth',
      httpOnly: true,
      secure: false,
      sameSite: 'Strict',
    },
  ]);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await test.step('session is authenticated (silent refresh from the injected cookie)', async () => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Log in' })).not.toBeVisible({ timeout: 10_000 });
  });

  await test.step('prompt copy button copies exact plain-text content (Bangla + emoji + code fence)', async () => {
    await page.goto(`/prompts/${env('E2E_COPY_SLUG')}`);
    await expect(page.getByRole('heading', { name: 'E2E Copy Verification Prompt' })).toBeVisible();

    const copyButton = page.getByRole('button', { name: 'Copy', exact: true });
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    await expect(page.getByText('Prompt copied to clipboard.')).toBeVisible({ timeout: 8000 });

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    const expected = Buffer.from(env('E2E_COPY_CONTENT_B64'), 'base64').toString('utf-8');
    // Windows normalizes \n -> \r\n at the OS clipboard layer for ALL
    // plain-text clipboard writes (platform behavior, not app-specific) —
    // verified via a side diagnostic comparing DOM textContent (clean \n)
    // against navigator.clipboard.readText() (\r\n) for the identical
    // string. Normalize before comparing so this checks content
    // correctness, not line-ending convention.
    expect(clipboardText.replace(/\r\n/g, '\n')).toBe(expected);
    expect(clipboardText).not.toContain('<div');
    expect(clipboardText).not.toContain('<script');
    expect(clipboardText).toContain('🤖');
    expect(clipboardText).toContain('বাংলা');
    expect(clipboardText).toContain('```python');

    await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeVisible({ timeout: 3000 });
  });

  await test.step('fork prompt button redirects to a new draft edit page with success toast', async () => {
    await page.goto(`/prompts/${env('E2E_FORK_SLUG')}`);
    const forkButton = page.getByRole('button', { name: 'Fork Prompt' });
    await expect(forkButton).toBeVisible();
    await forkButton.click();

    await expect(page.getByText('Prompt forked successfully.')).toBeVisible({ timeout: 8000 });
    await page.waitForURL(/\/my-submissions\/.+\/edit$/);
    await expect(page.getByRole('heading', { name: 'Edit resource' })).toBeVisible();
  });

  await test.step('version history card and prev/next navigation work across a 3-version chain', async () => {
    await page.goto(`/prompts/${env('E2E_V2_SLUG')}`);

    // CardTitle renders a plain <div>, not a semantic heading (consistent
    // shadcn/ui pattern throughout this app) — getByText, not getByRole.
    // Scoped to the card itself: "MoreFromAuthorCard" elsewhere on the same
    // page legitimately lists these same titles again (same author), so an
    // unscoped getByText is ambiguous — that's a real page feature, not a bug.
    const historyCard = page.getByTestId('version-history-card');
    await expect(page.getByText('Version History')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Previous Version')).toBeVisible();
    await expect(page.getByText('Next Version')).toBeVisible();
    await expect(historyCard.getByText('Current', { exact: true })).toBeVisible();
    await expect(historyCard.getByText('E2E Version Chain Prompt v1')).toBeVisible();
    await expect(historyCard.getByText('E2E Version Chain Prompt v2')).toBeVisible();
    await expect(historyCard.getByText('E2E Version Chain Prompt v3')).toBeVisible();

    await page.getByText('Previous Version').click();
    await page.waitForURL(new RegExp(env('E2E_V1_SLUG')));
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByText('Next Version')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Previous Version')).not.toBeVisible();

    await page.getByTestId('version-history-card').getByRole('link', { name: 'Open' }).last().click();
    await page.waitForURL(new RegExp(env('E2E_V3_SLUG')));
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByText('Previous Version')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Next Version')).not.toBeVisible();
  });

  await test.step('model download button issues a real signed URL and completes', async () => {
    await page.goto(`/models/${env('E2E_MODEL_SLUG')}`);
    const downloadButton = page.getByRole('button', { name: /Download/ });
    await expect(downloadButton).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent('download'), downloadButton.click()]);
    expect(download.suggestedFilename()).toContain('e2e-download-test-model');
  });

  await test.step('admin drawer renders model and prompt type-specific metadata', async () => {
    // Navigated via UI clicks (client-side transitions), not page.goto() —
    // a hard reload of a ProtectedRoute-wrapped page hits a pre-existing race
    // in providers.tsx (isInitialized flips true right after the refresh
    // call, before the separate getMe() call resolves isAuthenticated),
    // which can bounce a freshly-hard-loaded protected page to /login then
    // /dashboard. Out of scope for Phase 3A.1 (not Fork/Version
    // History/Copy related) — flagged in the final report instead of fixed
    // here. Clicking through the UI like a real user does avoids it, since
    // it's a same-session client-side navigation, not a remount.
    await page.getByRole('button', { name: 'phase3a1verify' }).click();
    // Radix DropdownMenuItem sets an explicit role="menuitem" on its root,
    // which overrides the wrapped <a>'s implicit "link" role.
    await page.getByRole('menuitem', { name: 'Admin Panel' }).click();
    await page.getByRole('link', { name: 'Pending Approvals' }).click();

    // ModerationTable renders both a desktop table row and a mobile card for
    // every resource simultaneously (CSS-hidden by breakpoint, not by
    // removal) — .first() to avoid the resulting strict-mode ambiguity.
    await expect(page.getByRole('heading', { name: /Pending/ })).toBeVisible();
    await expect(page.getByText('E2E Admin Drawer Test Model').first()).toBeVisible();

    await page.getByText('E2E Admin Drawer Test Model').first().click();
    await expect(page.getByText('Architecture')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Architecture')).not.toBeVisible();

    const promptRow = page.getByText('E2E Admin Drawer Test Prompt').first();
    await promptRow.scrollIntoViewIfNeeded();
    await promptRow.click({ force: true });
    await expect(page.getByText('Rewrite {{text}} concisely.')).toBeVisible({ timeout: 8000 });
    await page.keyboard.press('Escape');
  });

  await test.step('mobile viewport has no horizontal overflow on model and prompt pages', async () => {
    await page.setViewportSize({ width: 375, height: 667 });

    for (const path of [`/models/${env('E2E_MODEL_SLUG')}`, `/prompts/${env('E2E_COPY_SLUG')}`]) {
      await page.goto(path);
      const [scrollWidth, clientWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollWidth, `${path} should not overflow horizontally at 375px`).toBeLessThanOrEqual(clientWidth + 1);
    }

    await page.setViewportSize({ width: 1280, height: 800 });
  });

  await test.step('dark mode actually changes computed background color', async () => {
    // Client-side navigation, not page.goto('/settings') — see the
    // admin-drawer step's comment for why (avoids the same pre-existing
    // ProtectedRoute/providers.tsx race on a hard reload).
    await page.getByRole('button', { name: 'phase3a1verify' }).click();
    await page.getByRole('menuitem', { name: 'Dashboard' }).click();
    // "Settings" also matches a dashboard shortcut card in <main> — scope to
    // the sidebar nav specifically.
    await page.getByLabel('Dashboard navigation').getByRole('link', { name: 'Settings' }).click();
    // Settings defaults to the "Profile" tab — theme toggle lives under
    // "Appearance".
    await page.getByText('Appearance').click();
    await expect(page.getByRole('button', { name: 'Dark' })).toBeVisible();

    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.getByRole('button', { name: 'Dark' }).click();
    await page.waitForTimeout(300);

    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(darkBg).not.toBe(lightBg);

    await page.goto(`/models/${env('E2E_MODEL_SLUG')}`);
    const modelPageBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(modelPageBg).toBe(darkBg);
  });
});
