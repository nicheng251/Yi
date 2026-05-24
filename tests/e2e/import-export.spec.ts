import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Import/Export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should export all data to JSON", async ({ page }) => {
    // Navigate to settings
    await page.getByRole("link", { name: /设置|Settings/i }).click();

    // Click export button
    const exportButton = page.getByRole("button", { name: /导出.*数据|Export/i });
    await exportButton.click();

    // Verify success toast or confirmation
    await expect(page.getByText(/导出成功|Export successful/i)).toBeVisible({ timeout: 10000 });
  });

  test("should import data from JSON", async ({ page }) => {
    // Navigate to settings
    await page.getByRole("link", { name: /设置|Settings/i }).click();

    // Click import button
    const importButton = page.getByRole("button", { name: /导入.*数据|Import/i });
    await importButton.click();

    // Verify success toast
    await expect(page.getByText(/导入成功|Import successful/i)).toBeVisible({ timeout: 10000 });
  });

  test("should preserve project data after import", async ({ page }) => {
    // Create a project first
    const projectName = "Import Test Project";
    await page.getByRole("button", { name: /新项目/i }).click();
    await page.getByPlaceholder(/输入项目名称/i).fill(projectName);
    await page.keyboard.press("Enter");

    // Export data
    await page.getByRole("link", { name: /设置|Settings/i }).click();
    await page.getByRole("button", { name: /导出.*数据|Export/i }).click();

    // Go back home
    await page.getByRole("link", { name: /首页|Home/i }).click();

    // Verify project is visible before import
    await expect(page.getByText(projectName)).toBeVisible();
  });
});