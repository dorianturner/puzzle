import { expect, test } from "@playwright/test";
import { clawMachineLevel } from "../../src/domain";

test.describe("Perspective gameplay", () => {
  test("opens the authored level from the minimal menu", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("menu-screen")).toBeVisible();
    await expect(page.getByTestId("menu-screen")).not.toContainText("Infer depth");
    await page.getByTestId("play-button").first().click();
    await expect(page.getByTestId("game-screen")).toBeVisible();
    await expect(page.getByTestId("game-screen")).not.toContainText("SIDE VIEW");
    await expect(page.getByTestId("game-canvas")).toBeVisible();
    await expect(page.locator(".controls-strip")).toBeVisible();
    await expect(page.getByTestId("key-counter")).toHaveText("0 / 3");
  });

  test("uses explicit bot controls and reports both bot observations", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("play-button").first().click();
    await page.getByTestId("bot-right").click();

    await expect(page.getByTestId("bot-a-message").last()).toContainText("claw");
    await expect(page.getByTestId("bot-b-message").last()).toContainText("claw");
  });

  test("keeps hidden-axis player movement visually still", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("play-button").first().click();
    await page.getByTestId("move-right").click();

    await expect(page.locator(".viewport-panel")).not.toHaveClass(/is-transitioning/);
    const state = await page.evaluate(() => window.__PERSPECTIVE__?.getState());
    expect(state?.clawPosition).toEqual({ x: 0, y: 1, z: 6 });
  });

  test("navigates between registry levels and returns to level select", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("play-button")).toHaveCount(2);
    await page.getByTestId("play-button").first().click();
    await expect(page.getByTestId("level-title")).toHaveText("CLAW MACHINE");
    await expect(page.getByTestId("previous-level")).toBeDisabled();
    await page.getByTestId("next-level").click();
    await expect(page.getByTestId("level-title")).toHaveText("CALIBRATION BAY");
    await expect(page.getByTestId("previous-level")).toBeEnabled();
    await expect(page.getByTestId("next-level")).toBeDisabled();
    await page.getByTestId("previous-level").click();
    await expect(page.getByTestId("level-title")).toHaveText("CLAW MACHINE");
    await page.getByTestId("return-menu").click();
    await expect(page.getByTestId("menu-screen")).toBeVisible();
  });

  test("completes the canonical solution through the debug API", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.getByTestId("play-button").first().click();
    const finalState = await page.evaluate((actions) => {
      const api = window.__PERSPECTIVE__;
      if (!api) throw new Error("Perspective debug API is unavailable");
      api.reset(1001);
      for (const action of actions) api.execute(action);
      return api.getState();
    }, clawMachineLevel.canonicalSolution);

    expect(finalState.keysDelivered).toEqual(["key-1", "key-2", "key-3"]);
    expect(finalState.completed).toBe(true);
    await expect(page.getByTestId("key-counter")).toHaveText("3 / 3");
    await expect(page.getByTestId("level-complete")).toBeVisible();
  });

  test("resets the state and exposes projections for automated inspection", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.getByTestId("play-button").first().click();
    await expect(page.getByTestId("debug-overlay")).toBeVisible();
    await page.keyboard.press("`");
    await expect(page.getByTestId("debug-overlay")).toBeHidden();
    await page.keyboard.press("`");
    await expect(page.getByTestId("debug-overlay")).toBeVisible();
    await page.getByTestId("move-right").click();
    await page.getByTestId("reset-level").click();

    const snapshot = await page.evaluate(() => {
      const api = window.__PERSPECTIVE__;
      if (!api) throw new Error("Perspective debug API is unavailable");
      return {
        state: api.getState(),
        xz: api.getProjection("XZ"),
        yz: api.getProjection("YZ"),
        xy: api.getProjection("XY"),
        events: api.getEvents(),
      };
    });

    expect(snapshot.state.actionCount).toBe(0);
    expect(snapshot.xz.view).toBe("XZ");
    expect(snapshot.yz.view).toBe("YZ");
    expect(snapshot.xy.view).toBe("XY");
    expect(snapshot.events.some((event) => event.type === "level_reset")).toBe(true);
  });
});
