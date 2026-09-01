import {
  allProjections,
  applyAction,
  clawMachineLevel,
  cloneState,
  commandFromDirection,
  createEventStore,
  getLevel,
  initialActionResult,
  LEVELS,
  type Action,
  type ClawMachineState,
  type Command,
  type EventStore,
  type LevelDefinition,
  type ViewId,
} from "./domain";
import { drawDebugWorld, drawProjection } from "./rendering/canvas";

interface ChatMessage {
  actor: "bot_a" | "bot_b";
  text: string;
}

let sessionNumber = 0;

const viewName = (view: ViewId): string =>
  view === "XZ" ? "SIDE VIEW (XZ)" : view === "YZ" ? "SIDE VIEW (YZ)" : "TOP VIEW (XY)";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const button = (label: string, testId: string, className = "button"): string =>
  `<button class="${className}" data-testid="${testId}" type="button">${label}</button>`;

export class PerspectiveApp {
  private readonly root: HTMLElement;
  private level: LevelDefinition = clawMachineLevel;
  private result = initialActionResult(this.level);
  private readonly eventStore: EventStore = createEventStore(this.createSessionId());
  private readonly undoStack: ClawMachineState[] = [];
  private messages: ChatMessage[] = [];
  private readonly debugAvailable =
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG === "1";
  private debugVisible = false;

  public constructor(root: HTMLElement) {
    this.root = root;
    this.debugVisible =
      this.debugAvailable && new URLSearchParams(window.location.search).get("debug") === "1";
    window.addEventListener("keydown", (event) => {
      if (event.key !== "`" || !this.debugAvailable || this.screenIsMenu()) return;
      this.debugVisible = !this.debugVisible;
      this.renderGame();
    });
    this.renderMenu();
    this.installDebugApi();
  }

  private screenIsMenu(): boolean {
    return !this.root.querySelector("[data-testid='game-screen']");
  }

  private createSessionId(): string {
    sessionNumber += 1;
    return `session-${sessionNumber}`;
  }

  private renderMenu(): void {
    this.root.innerHTML = `
      <main class="menu-screen" data-testid="menu-screen">
        <div class="menu-orbit orbit-left" aria-hidden="true"></div>
        <div class="menu-orbit orbit-right" aria-hidden="true"></div>
        <div class="menu-topbar">
          <div class="cube-mark" aria-hidden="true"><span></span><span></span><span></span></div>
          <div class="menu-utilities" aria-hidden="true"><span>⚙</span><span>▥</span><span>?</span></div>
        </div>
        <div class="menu-copy">
          <h1>PERSPECTIVE</h1>
          <div class="menu-divider"><span></span></div>
          <div class="level-cards">
            ${LEVELS.map(
              (level) => `
              <button class="level-card" data-testid="play-button" data-level-id="${level.id}" type="button">
                <span class="level-card-number">${String(level.number).padStart(2, "0")}</span>
                <strong>${escapeHtml(level.title)}</strong>
                <span class="level-card-art" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
                <span class="level-card-play">PLAY <b>›</b></span>
              </button>
            `,
            ).join("")}
          </div>
        </div>
        <div class="menu-footer" aria-hidden="true"><span></span><b>◇</b><span></span></div>
      </main>
    `;
    this.root
      .querySelectorAll<HTMLButtonElement>("[data-testid='play-button']")
      .forEach((playButton) => {
        playButton.addEventListener("click", () => {
          const levelId = playButton.dataset.levelId ?? this.level.id;
          this.startLevel(getLevel(levelId));
        });
      });
  }

  private startLevel(level: LevelDefinition): void {
    this.level = level;
    this.result = initialActionResult(level, level.seed);
    this.eventStore.clear();
    this.eventStore.record(this.result.events);
    this.undoStack.length = 0;
    this.messages = [];
    this.renderGame();
  }

  private renderGame(): void {
    const state = this.result.state;
    this.root.innerHTML = `
      <main class="game-shell" data-testid="game-screen">
        <header class="game-header">
          <div>
            <p class="eyebrow">PERSPECTIVE / ${String(this.level.number).padStart(2, "0")}</p>
            <h1>${escapeHtml(this.level.title)}</h1>
          </div>
          <div class="header-status"><span>KEYS</span><strong data-testid="key-counter">${state.keysDelivered.length} / 3</strong></div>
        </header>
        <div class="game-grid">
          <aside class="controls-panel panel">
            <p class="panel-label">CONTROLS</p>
            <p class="view-label">${viewName(state.currentPlayerView)}</p>
            ${button("◀", "move-left", "control-button")}
            ${button("▶", "move-right", "control-button")}
            <div class="control-spacer"></div>
            ${button("RESET LEVEL", "reset-level", "button secondary")}
            ${button("UNDO", "undo-action", "button secondary")}
            ${button("MENU", "return-menu", "button text-button")}
          </aside>
          <section class="viewport-panel panel">
            <canvas aria-label="Pixel art claw machine view" data-testid="game-canvas" height="520" width="680"></canvas>
            <p class="viewport-caption">${state.completed ? "LEVEL COMPLETE" : "Experiment with the views."}</p>
          </section>
          <aside class="chat-panel panel">
            <p class="panel-label">BOT CHAT</p>
            <div class="bot-selector">
              ${button("BOT A", "bot-a-selector", `bot-tab ${this.selectedBot === "bot_a" ? "active" : ""}`)}
              ${button("BOT B", "bot-b-selector", `bot-tab ${this.selectedBot === "bot_b" ? "active" : ""}`)}
            </div>
            <div class="chat-log" data-testid="bot-chat">
              ${this.messages
                .map(
                  (message) => `
                <div class="chat-message ${message.actor}" data-testid="${message.actor === "system" ? "system-message" : `${message.actor.replace("_", "-")}-message`}">
                  <span class="message-actor">${message.actor === "system" ? "SYSTEM" : message.actor.replace("_", " ").toUpperCase()}</span>
                  <span>${escapeHtml(message.text)}</span>
                </div>
              `,
                )
                .join("")}
            </div>
            <div class="quick-actions">
              ${button("LEFT", "bot-left", "button quick-button")}
              ${button("RIGHT", "bot-right", "button quick-button")}
              ${button("GRAB", "bot-grab", "button quick-button accent")}
            </div>
            <form class="command-form" data-testid="bot-command-form">
              <label for="bot-command-input">COMMAND ${this.selectedBot === "bot_a" ? "BOT A" : "BOT B"}</label>
              <div class="command-row"><input autocomplete="off" id="bot-command-input" data-testid="bot-command-input" placeholder="try: move left" /><button class="send-button" type="submit">↵</button></div>
            </form>
          </aside>
        </div>
        ${
          state.completed
            ? `
          <section class="complete-panel" data-testid="level-complete">
            <p class="eyebrow">KEYS 3 / 3</p><h2>LEVEL COMPLETE</h2>
            ${button("REPLAY LEVEL", "replay-level", "button accent-button")}
            ${button("RETURN TO MENU", "complete-menu", "button secondary")}
          </section>
        `
            : ""
        }
        ${this.debugVisible ? this.renderDebug(state) : ""}
      </main>
    `;

    this.bindGameEvents();
    const canvas = this.root.querySelector<HTMLCanvasElement>("[data-testid='game-canvas']");
    if (canvas)
      drawProjection(canvas, this.result.projections[state.currentPlayerView], this.level);
    this.renderDebugCanvas(state);
  }

  private renderDebug(state: ClawMachineState): string {
    return `
      <section class="debug-panel" data-testid="debug-overlay">
        <div><p class="panel-label">DEBUG STATE</p><button class="button secondary" data-testid="export-events" type="button">EXPORT EVENTS</button></div>
        <pre data-testid="debug-state">${escapeHtml(
          JSON.stringify(
            {
              seed: state.seed,
              levelId: state.levelId,
              clawPosition: state.clawPosition,
              clawState: state.clawState,
              heldObjectId: state.heldObjectId,
              objects: state.objects,
              keysDelivered: state.keysDelivered,
              currentPlayerView: state.currentPlayerView,
              botAView: this.level.initialAssignments.bot_a,
              botBView: this.level.initialAssignments.bot_b,
              actionCount: state.actionCount,
              lastCommand: state.lastCommand,
              lastSimulationEvent: state.lastSimulationEvent,
            },
            null,
            2,
          ),
        )}</pre>
        <canvas class="debug-canvas" data-testid="debug-3d" height="170" width="280"></canvas>
      </section>
    `;
  }

  private bindGameEvents(): void {
    this.onClick("move-left", () =>
      this.dispatch({ actor: "player", command: commandFromDirection("left") }),
    );
    this.onClick("move-right", () =>
      this.dispatch({ actor: "player", command: commandFromDirection("right") }),
    );
    this.onClick("reset-level", () => this.resetLevel());
    this.onClick("undo-action", () => this.undo());
    this.onClick("return-menu", () => this.renderMenu());
    this.onClick("complete-menu", () => this.renderMenu());
    this.onClick("replay-level", () => this.startLevel(this.level));
    this.onClick("bot-a-selector", () => {
      this.selectedBot = "bot_a";
      this.renderGame();
    });
    this.onClick("bot-b-selector", () => {
      this.selectedBot = "bot_b";
      this.renderGame();
    });
    const quickCommands: Record<string, Command> = {
      "bot-left": "LEFT",
      "bot-right": "RIGHT",
      "bot-grab": "GRAB",
    };
    for (const [testId, command] of Object.entries(quickCommands)) {
      this.onClick(testId, () => this.dispatch({ actor: this.selectedBot, command }));
    }
    const form = this.root.querySelector<HTMLFormElement>("[data-testid='bot-command-form']");
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = this.root.querySelector<HTMLInputElement>("[data-testid='bot-command-input']");
      if (!input) return;
      const command = parseCommand(input.value);
      if (!command) {
        this.messages.push({
          actor: "system",
          text: `Command rejected: ${input.value.trim() || "empty input"}.`,
        });
        this.eventStore.record([
          {
            type: "command_rejected",
            actionIndex: this.result.state.actionCount + 1,
            details: { reason: "unrecognized_text" },
          },
        ]);
        this.renderGame();
        return;
      }
      input.value = "";
      this.dispatch({ actor: this.selectedBot, command });
    });
    this.onClick("export-events", () => {
      const blob = new Blob([this.eventStore.exportJson()], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "perspective-events.json";
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

  private onClick(testId: string, handler: () => void): void {
    this.root
      .querySelector<HTMLElement>(`[data-testid='${testId}']`)
      ?.addEventListener("click", handler);
  }

  private dispatch(action: Action): void {
    if (this.result.state.completed) return;
    this.undoStack.push(cloneState(this.result.state));
    const result = applyAction(this.result.state, action, this.level);
    this.result = result;
    const recorded = this.eventStore.record(result.events, action);
    if (import.meta.env.DEV) {
      for (const event of recorded) console.info("[perspective]", event);
    }
    for (const text of result.botMessages.bot_a) this.messages.push({ actor: "bot_a", text });
    for (const text of result.botMessages.bot_b) this.messages.push({ actor: "bot_b", text });
    this.renderGame();
    this.animateViewport();
  }

  private resetLevel(): void {
    this.eventStore.record([
      { type: "level_reset", actionIndex: this.result.state.actionCount + 1 },
    ]);
    this.result = initialActionResult(this.level, this.result.state.seed);
    this.undoStack.length = 0;
    this.messages = [{ actor: "system", text: "The machine is back at its starting position." }];
    this.renderGame();
  }

  private undo(): void {
    const previous = this.undoStack.pop();
    if (!previous) return;
    this.result = {
      state: previous,
      events: [{ type: "action_undone", actionIndex: previous.actionCount }],
      projections: allProjections(previous),
      botMessages: {
        bot_a: ["The last action was reversed."],
        bot_b: ["The last action was reversed."],
      },
    };
    this.eventStore.record(this.result.events);
    this.messages.push({ actor: "system", text: "Last action undone." });
    this.renderGame();
  }

  private animateViewport(): void {
    const viewport = this.root.querySelector<HTMLElement>(".viewport-panel");
    if (!viewport) return;
    viewport.classList.add("is-transitioning");
    window.setTimeout(() => viewport.classList.remove("is-transitioning"), 600);
  }

  private renderDebugCanvas(state: ClawMachineState): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>("[data-testid='debug-3d']");
    if (canvas) drawDebugWorld(canvas, state);
  }

  private installDebugApi(): void {
    if (!this.debugAvailable) return;
    window.__PERSPECTIVE__ = {
      getState: () => structuredClone(this.result.state),
      getEvents: () => this.eventStore.getEvents(),
      reset: (seed = this.level.seed) => {
        this.result = initialActionResult(this.level, seed);
        this.undoStack.length = 0;
        this.eventStore.clear();
        this.eventStore.record(this.result.events);
        this.renderGame();
        return structuredClone(this.result.state);
      },
      execute: (action) => {
        this.dispatch(action);
        return structuredClone(this.result.state);
      },
      setSeed: (seed) => {
        this.result = initialActionResult(this.level, seed);
        this.undoStack.length = 0;
        this.renderGame();
        return structuredClone(this.result.state);
      },
      getProjection: (view) => structuredClone(this.result.projections[view]),
    };
  }
}

export const mountApp = (root: HTMLElement): PerspectiveApp => new PerspectiveApp(root);
