import { test, expect } from "@playwright/test";

test.describe("Archive", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should archive project with active timer", async ({ page }) => {
    // Start timer on a project
    const project = page.locator('[data-testid="project-item"]').first();
    await project.getByRole("button", { name: /开始/i }).click();

    // Verify timer is running
    await expect(project.getByText(/计时中/i)).toBeVisible();

    // Archive the project
    const archiveButton = project.getByRole("button", { name: /归档/i });
    await archiveButton.click();

    // Verify timer stopped (timer info should not show "计时中")
    await expect(project.getByText(/计时中/i)).not.toBeVisible();
  });

  test("should restore archived project", async ({ page }) => {
    // Create and archive a project
    const projectName = "Archive Test Project";

    // Create project
    await page.getByRole("button", { name: /新项目/i }).click();
    await page.getByPlaceholder(/输入项目名称/i).fill(projectName);
    await page.keyboard.press("Enter");

    // Archive it
    const project = page.getByText(projectName).locator('[data-testid="project-item"]');
    await project.getByRole("button", { name: /归档/i }).click();

    // Go to archive page
    await page.getByRole("link", { name: /归档|Archive/i }).click();

    // Find the archived project
    const archivedProject = page.locator('[data-testid="archived-project"]').filter({ hasText: projectName });
    await expect(archivedProject).toBeVisible();

    // Restore it
    await archivedProject.getByRole("button", { name: /恢复/i }).click();

    // Go back to home and verify project is visible
    await page.getByRole("link", { name: /首页|Home/i }).click();
    await expect(page.getByText(projectName)).toBeVisible();
  });
});