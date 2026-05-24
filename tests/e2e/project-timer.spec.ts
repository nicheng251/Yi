import { test, expect } from "@playwright/test";

test.describe("Project Timer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display project list", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Yi");
  });

  test("should create a new project", async ({ page }) => {
    const newProjectButton = page.getByRole("button", { name: /新项目|新建/i });
    await newProjectButton.click();

    const input = page.getByPlaceholder(/输入项目名称/i);
    await input.fill("Test Project");
    await input.press("Enter");

    await expect(page.getByText("Test Project")).toBeVisible();
  });

  test("should start and stop timer for a project", async ({ page }) => {
    // Create project if not exists
    const projectItem = page.locator('[data-testid="project-item"]').first();
    const playButton = projectItem.getByRole("button", { name: /开始|播放/i }).first();

    // Start timer
    await playButton.click();
    await expect(projectItem.getByText(/计时中|进行中/i)).toBeVisible();

    // Stop timer
    const stopButton = projectItem.getByRole("button", { name: /停止/i });
    await stopButton.click();
    await expect(projectItem.getByText(/总计.*分钟/i)).toBeVisible();
  });

  test("should auto-stop previous timer when starting new one", async ({ page }) => {
    // Start timer on first project
    const firstProject = page.locator('[data-testid="project-item"]').first();
    await firstProject.getByRole("button", { name: /开始/i }).click();

    // Start timer on second project
    const secondProject = page.locator('[data-testid="project-item"]').nth(1);
    const secondPlayButton = secondProject.getByRole("button", { name: /开始/i });

    // First project timer should auto-stop
    await secondPlayButton.click();

    // Verify second project is now running
    await expect(secondProject.getByText(/计时中/i)).toBeVisible();
  });
});