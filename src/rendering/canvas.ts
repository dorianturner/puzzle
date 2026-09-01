import type {
  ClawMachineState,
  LevelDefinition,
  ProjectedItem,
  Projection,
  SpriteId,
} from "../domain";

const spriteColors: Record<SpriteId, string> = {
  bear: "#c98163",
  blob: "#70c7a1",
  cat: "#d98d50",
  duck: "#efc15d",
  frog: "#69b88c",
  key: "#e4c86a",
  rabbit: "#d99bc1",
};

const drawPixelSprite = (
  context: CanvasRenderingContext2D,
  sprite: SpriteId,
  x: number,
  y: number,
  size: number,
): void => {
  const color = spriteColors[sprite];
  const unit = Math.max(2, Math.floor(size / 8));
  context.fillStyle = "#151820";
  context.fillRect(x + unit, y + unit * 2, unit * 6, unit * 5);
  context.fillRect(x + unit * 2, y, unit * 4, unit * 7);
  context.fillStyle = color;
  context.fillRect(x + unit * 2, y + unit * 2, unit * 4, unit * 4);
  context.fillRect(x + unit, y + unit * 3, unit, unit * 3);
  context.fillRect(x + unit * 6, y + unit * 3, unit, unit * 3);
  context.fillStyle = "#f4eee2";
  if (sprite === "key") {
    context.fillRect(x + unit * 3, y + unit, unit * 2, unit * 5);
    context.fillRect(x + unit * 5, y + unit * 4, unit * 2, unit);
    context.fillRect(x + unit * 5, y + unit * 6, unit, unit);
  } else {
    context.fillRect(x + unit * 3, y + unit * 3, unit, unit);
    context.fillRect(x + unit * 5, y + unit * 3, unit, unit);
  }
};

const viewDimensions = (
  level: LevelDefinition,
  projection: Projection,
): { width: number; height: number } => {
  if (projection.view === "XY") {
    return {
      width: level.bounds.x.max - level.bounds.x.min + 1,
      height: level.bounds.y.max - level.bounds.y.min + 1,
    };
  }
  return {
    width: projection.view === "XZ" ? level.bounds.x.max + 1 : level.bounds.y.max + 1,
    height: level.bounds.z.max + 1,
  };
};

const drawGrid = (
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  width: number,
  height: number,
  cell: number,
): void => {
  context.strokeStyle = "#252936";
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += 1) {
    context.beginPath();
    context.moveTo(originX + x * cell, originY);
    context.lineTo(originX + x * cell, originY + height * cell);
    context.stroke();
  }
  for (let y = 0; y <= height; y += 1) {
    context.beginPath();
    context.moveTo(originX, originY + y * cell);
    context.lineTo(originX + width * cell, originY + y * cell);
    context.stroke();
  }
};

const drawClaw = (
  context: CanvasRenderingContext2D,
  projection: Projection,
  originX: number,
  originY: number,
  cell: number,
): void => {
  const x = originX + projection.claw.horizontal * cell + Math.floor(cell / 2);
  const y = originY + projection.claw.vertical * cell + 5;
  context.strokeStyle = "#b9c0ce";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(x, originY - 20);
  context.lineTo(x, y + cell / 2);
  context.stroke();
  context.fillStyle = "#d8dce4";
  context.fillRect(x - 3, y + cell / 2, 6, 12);
  context.strokeStyle = projection.claw.state === "OPEN" ? "#9ea7b8" : "#e4c86a";
  context.beginPath();
  context.moveTo(x - 3, y + cell / 2 + 12);
  context.lineTo(x - (projection.claw.state === "OPEN" ? 10 : 5), y + cell / 2 + 24);
  context.moveTo(x + 3, y + cell / 2 + 12);
  context.lineTo(x + (projection.claw.state === "OPEN" ? 10 : 5), y + cell / 2 + 24);
  context.stroke();
};

const drawItem = (
  context: CanvasRenderingContext2D,
  item: ProjectedItem,
  originX: number,
  originY: number,
  cell: number,
): void => {
  if (!item.visible || item.delivered) return;
  drawPixelSprite(
    context,
    item.sprite,
    originX + item.horizontal * cell + Math.floor(cell * 0.2),
    originY + (item.vertical + 0.18) * cell,
    Math.floor(cell * 0.6),
  );
};

/** Render projected data into the pixel-art viewport. */
export const drawProjection = (
  canvas: HTMLCanvasElement,
  projection: Projection,
  level: LevelDefinition,
): void => {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#0f1118";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const dimensions = viewDimensions(level, projection);
  const cell = Math.min(
    50,
    Math.floor(
      Math.min((canvas.width - 96) / dimensions.width, (canvas.height - 76) / dimensions.height),
    ),
  );
  const width = dimensions.width * cell;
  const height = dimensions.height * cell;
  const originX = Math.floor((canvas.width - width) / 2);
  const originY = Math.floor((canvas.height - height) / 2) + 18;

  context.fillStyle = "#171a23";
  context.fillRect(originX - 12, originY - 12, width + 24, height + 24);
  drawGrid(context, originX, originY, dimensions.width, dimensions.height, cell);

  const chuteX = originX;
  const chuteY =
    originY +
    (projection.view === "XY"
      ? (dimensions.height - 1) * cell
      : Math.max(0, dimensions.height - 1) * cell);
  context.fillStyle = "#08090d";
  context.fillRect(chuteX + 5, chuteY + height / dimensions.height - 10, cell - 10, 10);

  const items = [...projection.items].sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
  for (const item of items) drawItem(context, item, originX, originY, cell);
  drawClaw(context, projection, originX, originY, cell);

  context.fillStyle = "#687184";
  context.font = "12px monospace";
  context.fillText(
    projection.view === "XZ" ? "VIEW A" : projection.view === "YZ" ? "VIEW B" : "VIEW C",
    originX,
    22,
  );
  context.fillText("PRIZE CHUTE", originX + width - 92, canvas.height - 16);
};

/** Draw a deliberately simple authoritative-world debug view. */
export const drawDebugWorld = (canvas: HTMLCanvasElement, state: ClawMachineState): void => {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#0b0d12";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = 18;
  const originX = 24;
  const originY = canvas.height - 24;
  const project = (position: { x: number; y: number; z: number }): { x: number; y: number } => ({
    x: originX + position.x * scale + position.y * scale * 0.45,
    y: originY - position.z * scale - position.y * scale * 0.28,
  });
  context.strokeStyle = "#343b4a";
  context.strokeRect(originX, originY - 6 * scale, 8 * scale, 6 * scale);
  for (const object of state.objects) {
    if (object.delivered) continue;
    const point = project(object.position);
    context.fillStyle = object.kind === "key" ? "#e4c86a" : "#79a9c6";
    context.fillRect(point.x, point.y, 8, 8);
  }
  const claw = project(state.clawPosition);
  context.fillStyle = "#f1f3f6";
  context.fillRect(claw.x - 4, claw.y - 4, 12, 12);
  context.fillStyle = "#778196";
  context.font = "11px monospace";
  context.fillText("AUTHORITATIVE 3D STATE", 12, 16);
};
