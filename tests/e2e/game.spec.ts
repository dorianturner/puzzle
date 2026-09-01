import { expect, test } from "@playwright/test";
import { clawMachineLevel } from "../../src/domain";

test.describe("Perspective gameplay", () => {
  test("opens the authored level from the minimal menu", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("menu-screen")).toBeVisible();
    await page.getByTestId("play-button").click();
    await expect(page.getByTestId("game-screen")).toBeVisible();
    await expect(page.getByTestId("game-canvas")).toBeVisible();
    await expect(page.getByTestId("key-counter")).toHaveText("0 / 3");
  });

  test("accepts a text alias and reports both bot observations", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("play-button").click();
    await page.getByTestId("bot-command-input").fill("move right");
    await page.getByTestId("bot-command-form").press("Enter");

    await expect(page.getByTestId("bot-a-message").last()).toContainText("claw");
    await expect(page.getByTestId("bot-b-message").last()).toContainText("claw");
  });

  test("completes the canonical solution through the debug API", async ({ page }) => {
    await page.goto("/?debug=1");
    await page.getByTestId("play-button").click();
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
    await page.getByTestId("play-button").click();
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
