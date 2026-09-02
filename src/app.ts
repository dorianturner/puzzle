import {
  allProjections,
  applyAction,
  clawMachineLevel,
  cloneState,
  commandFromDirection,
  createEventStore,
  diffProjection,
  getLevel,
  initialActionResult,
  LEVELS,
  type Action,
  type ClawMachineState,
  type EventStore,
  type LevelDefinition,
  type Projection,
  type ViewId,
} from "./domain";
import { drawDebugWorld, drawProjection } from "./rendering/canvas";

interface ChatMessage {
  actor: "bot_a" | "bot_b";
  text: string;
}

let sessionNumber = 0;

const viewName = (view: ViewId): string =>
  view === "XZ" ? "VIEW A" : view === "YZ" ? "VIEW B" : "VIEW C";

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
          <div class="header-brand" aria-hidden="true"><span class="header-cube">◇</span><span>PERSPECTIVE</span></div>
          <div class="header-title">
            <p class="eyebrow">LEVEL ${String(this.level.number).padStart(2, "0")}</p>
            <h1 data-testid="level-title">${escapeHtml(this.level.title)}</h1>
          </div>
          <div class="header-status"><span class="key-icon" aria-hidden="true">⚿</span><span>KEYS</span><strong data-testid="key-counter">${state.keysDelivered.length} / 3</strong></div>
        </header>
        <div class="game-grid">
          <section class="game-main-column">
            <section class="viewport-panel panel">
              <div class="viewport-heading"><span class="live-dot"></span><strong>${viewName(state.currentPlayerView)}</strong><span class="view-rule"></span><small>LIVE PROJECTION</small></div>
              <canvas aria-label="Pixel art claw machine view with a clearly marked prize hole" data-testid="game-canvas" height="520" width="880"></canvas>
              <p class="viewport-caption">${state.completed ? "LEVEL COMPLETE" : "AUTHORITATIVE MACHINE / OBSERVATION FEED"}</p>
            </section>
            <section class="controls-panel panel">
              <div class="controls-heading"><span class="panel-label">OPERATORS</span><span class="controls-hint">DISCRETE INPUT / NO TIME LIMIT</span></div>
              <div class="controls-strip">
                ${this.renderControlGroup("YOU", "YOU", "player", "control-you")}
                ${this.renderControlGroup("BOT A", "A", "bot_a", "control-bot-a")}
                ${this.renderControlGroup("BOT B", "B", "bot_b", "control-bot-b")}
              </div>
              <div class="control-footer">
                ${button("RESET LEVEL", "reset-level", "button secondary")}
                ${button("UNDO", "undo-action", "button secondary")}
                ${button("LEVEL SELECT", "return-menu", "button text-button")}
              </div>
            </section>
          </section>
          <aside class="chat-panel panel">
            <div class="chat-heading"><div><p class="panel-label">BOT CHAT</p><span class="chat-subtitle">REMOTE OBSERVATIONS</span></div><span class="chat-live"><i></i>LIVE</span></div>
            <div class="chat-log" data-testid="bot-chat">
              ${this.messages.length === 0 ? '<div class="chat-empty">WAITING FOR OBSERVATION<br /><span>BOT FEEDS WILL APPEAR AFTER AN ACTION</span></div>' : this.messages.map((message, index) => this.renderChatMessage(message, index)).join("")}
            </div>
            <div class="chat-footer"><span>FEED STATUS</span><strong>${this.messages.length ? `${this.messages.length} OBSERVATIONS` : "NO EVENTS"}</strong></div>
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
    this.scrollChatToLatest();
  }

  private renderControlGroup(
    label: string,
    avatar: string,
    actor: "player" | "bot_a" | "bot_b",
    className: string,
  ): string {
    const prefix = actor === "player" ? "player" : actor === "bot_a" ? "bot" : "bot-b";
    return `
      <section class="control-group ${className}">
        <div class="control-group-heading"><span class="bot-avatar">${avatar}</span><strong>${label}</strong><span class="operator-state">READY</span></div>
        <div class="control-actions">
          ${button("<b>←</b><span>LEFT</span>", actor === "player" ? "move-left" : `${prefix}-left`, "operator-button")}
          ${button("<b>→</b><span>RIGHT</span>", actor === "player" ? "move-right" : `${prefix}-right`, "operator-button")}
          ${button("<b>⌁</b><span>GRAB</span>", actor === "player" ? "player-grab" : `${prefix}-grab`, "operator-button grab-button")}
        </div>
      </section>
    `;
  }

  private renderChatMessage(message: ChatMessage, index: number): string {
    const actor = message.actor === "bot_a" ? "BOT A" : "BOT B";
    const actorClass = message.actor === "bot_a" ? "bot-a" : "bot-b";
    const testId = message.actor === "bot_a" ? "bot-a-message" : "bot-b-message";
    return `
      <article class="chat-message ${actorClass}" data-testid="${testId}">
        <div class="bot-avatar message-avatar">${message.actor === "bot_a" ? "A" : "B"}</div>
        <div class="message-content"><div class="message-meta"><strong>${actor}</strong><time>10:${String(24 + Math.floor(index / 3)).padStart(2, "0")}:${String(31 + index).padStart(2, "0")}</time></div><p>${escapeHtml(message.text)}</p></div>
      </article>
    `;
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
    this.onClick("player-grab", () => this.dispatch({ actor: "player", command: "GRAB" }));
    this.onClick("reset-level", () => this.resetLevel());
    this.onClick("undo-action", () => this.undo());
    this.onClick("return-menu", () => this.renderMenu());
    this.onClick("complete-menu", () => this.renderMenu());
    this.onClick("replay-level", () => this.startLevel(this.level));
    const botActions: Record<string, Action> = {
      "bot-left": { actor: "bot_a", command: "LEFT" },
      "bot-right": { actor: "bot_a", command: "RIGHT" },
      "bot-grab": { actor: "bot_a", command: "GRAB" },
      "bot-b-left": { actor: "bot_b", command: "LEFT" },
      "bot-b-right": { actor: "bot_b", command: "RIGHT" },
      "bot-b-grab": { actor: "bot_b", command: "GRAB" },
    };
    for (const [testId, action] of Object.entries(botActions)) {
      this.onClick(testId, () => this.dispatch(action));
    }
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
    const previousView = this.result.state.currentPlayerView;
    const previousProjection = this.result.projections[previousView];
    this.undoStack.push(cloneState(this.result.state));
    const result = applyAction(this.result.state, action, this.level);
    this.result = result;
    const recorded = this.eventStore.record(result.events, action);
    if (import.meta.env.DEV) {
      for (const event of recorded) console.info("[perspective]", event);
    }
    const messageCount = Math.max(result.botMessages.bot_a.length, result.botMessages.bot_b.length);
    for (let index = 0; index < messageCount; index += 1) {
      const botAMessage = result.botMessages.bot_a[index];
      const botBMessage = result.botMessages.bot_b[index];
      if (botAMessage !== undefined) this.messages.push({ actor: "bot_a", text: botAMessage });
      if (botBMessage !== undefined) this.messages.push({ actor: "bot_b", text: botBMessage });
    }
    this.renderGame();
    const playerViewChanged = previousView !== result.state.currentPlayerView;
    const projectionChanged = this.projectionHasVisibleChange(
      previousProjection,
      result.projections[result.state.currentPlayerView],
    );
    if (playerViewChanged || projectionChanged) this.animateViewport();
  }

  private resetLevel(): void {
    this.eventStore.record([
      { type: "level_reset", actionIndex: this.result.state.actionCount + 1 },
    ]);
    this.result = initialActionResult(this.level, this.result.state.seed);
    this.undoStack.length = 0;
    this.messages = [];
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
    this.messages.push({ actor: "bot_a", text: "The last action was reversed." });
    this.messages.push({ actor: "bot_b", text: "The last action was reversed." });
    this.renderGame();
  }

  private animateViewport(): void {
    const viewport = this.root.querySelector<HTMLElement>(".viewport-panel");
    if (!viewport) return;
    viewport.classList.add("is-transitioning");
    window.setTimeout(() => viewport.classList.remove("is-transitioning"), 600);
  }

  private projectionHasVisibleChange(previous: Projection, current: Projection): boolean {
    const diff = diffProjection(previous, current);
    return Boolean(
      diff.clawMovedHorizontally ||
      diff.clawMovedVertically ||
      diff.clawStateChanged ||
      diff.objectGrabbed ||
      diff.objectDropped ||
      diff.deliveredObject ||
      diff.becameVisible.length ||
      diff.becameHidden.length ||
      diff.movedObjects.length,
    );
  }

  private renderDebugCanvas(state: ClawMachineState): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>("[data-testid='debug-3d']");
    if (canvas) drawDebugWorld(canvas, state);
  }

  private scrollChatToLatest(): void {
    const chatLog = this.root.querySelector<HTMLElement>("[data-testid='bot-chat']");
    if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
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
