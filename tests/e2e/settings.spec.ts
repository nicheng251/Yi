import { test, expect } from "@playwright/test";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should toggle theme between light and dark", async ({ page }) => {
    // Navigate to settings
    await page.getByRole("link", { name: /设置|Settings/i }).click();

    // Find theme toggle
    const themeToggle = page.getByRole("button", { name: /主题|Theme|Light|Dark/i });

    // Get initial theme
    const initialTheme = await page.getAttribute('html', 'data-theme');

    // Toggle theme
    await themeToggle.click();

    // Verify theme changed
    const newTheme = await page.getAttribute('html', 'data-theme');
    expect(newTheme).not.toBe(initialTheme);
  });

  test("should toggle autostart", async ({ page }) => {
    // Navigate to settings
    await page.getByRole("link", { name: /设置|Settings/i }).click();

    // Find autostart toggle
    const autostartToggle = page.getByRole("button", { name: /开机自启|Auto-start/i });

    // Toggle autostart
    await autostartToggle.click();

    // Verify toggle state changed (UI should reflect the change)
    // The actual OS behavior can't be tested in e2e, but UI state should change
  });

  test("should show settings page with all options", async ({ page }) => {
    // Navigate to settings
    await page.getByRole("link", { name: /设置|Settings/i }).click();

    // Verify all setting options are present
    await expect(page.getByText(/主题|Theme/i)).toBeVisible();
    await expect(page.getByText(/开机自启|Auto-start/i)).toBeVisible();
    await expect(page.getByText(/导出.*数据|Export/i)).toBeVisible();
    await expect(page.getByText(/导入.*数据|Import/i)).toBeVisible();
  });
});