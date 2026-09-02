import { projectPosition } from "../domain";
import type {
  ClawMachineState,
  LevelDefinition,
  ProjectedItem,
  Projection,
  SpriteId,
} from "../domain";

interface ViewSize {
  horizontal: number;
  vertical: number;
}

interface CanvasLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  bounds: ViewSize;
}

interface Palette {
  main: string;
  shadow: string;
  highlight: string;
}

const spritePalette: Record<SpriteId, Palette> = {
  bear: { main: "#ef6a98", shadow: "#7a2b67", highlight: "#ffb4c3" },
  blob: { main: "#6fd19a", shadow: "#226f64", highlight: "#c7f3bd" },
  cat: { main: "#e49b49", shadow: "#743b42", highlight: "#ffe0a0" },
  duck: { main: "#f3ce4d", shadow: "#8f6533", highlight: "#fff3a4" },
  frog: { main: "#5dbbd0", shadow: "#26527c", highlight: "#b1f0e3" },
  key: { main: "#e9c85e", shadow: "#89612d", highlight: "#fff4a5" },
  rabbit: { main: "#c77bea", shadow: "#5a377d", highlight: "#f4c7ff" },
};

const getViewSize = (projection: Projection, level: LevelDefinition): ViewSize => {
  switch (projection.view) {
    case "XZ":
      return {
        horizontal: level.bounds.x.max - level.bounds.x.min + 1,
        vertical: level.bounds.z.max - level.bounds.z.min + 1,
      };
    case "YZ":
      return {
        horizontal: level.bounds.y.max - level.bounds.y.min + 1,
        vertical: level.bounds.z.max - level.bounds.z.min + 1,
      };
    case "XY":
      return {
        horizontal: level.bounds.y.max - level.bounds.y.min + 1,
        vertical: level.bounds.x.max - level.bounds.x.min + 1,
      };
  }
};

const getLayout = (
  projection: Projection,
  level: LevelDefinition,
  width: number,
  height: number,
): CanvasLayout => {
  const bounds = getViewSize(projection, level);
  const left = 58;
  const top = 92;
  const machineWidth = width - left * 2;
  const machineHeight = height - top - 74;
  return {
    left,
    top,
    width: machineWidth,
    height: machineHeight,
    cellWidth: machineWidth / bounds.horizontal,
    cellHeight: machineHeight / bounds.vertical,
    bounds,
  };
};

const pixel = (
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void => {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
};

const drawText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size: number,
  align: CanvasTextAlign = "left",
): void => {
  context.fillStyle = color;
  context.font = `${size}px "IBM Plex Mono", monospace`;
  context.textAlign = align;
  context.textBaseline = "middle";
  context.fillText(text, x, y);
};

const drawBackground = (context: CanvasRenderingContext2D, width: number, height: number): void => {
  context.fillStyle = "#090a16";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#11142a";
  context.fillRect(0, 0, width, 36);
  context.fillStyle = "#0d1021";
  context.fillRect(0, height - 38, width, 38);

  for (let x = 0; x < width; x += 28)
    pixel(context, "rgba(76, 71, 137, 0.12)", x, 38, 1, height - 76);
  for (let y = 38; y < height - 38; y += 28)
    pixel(context, "rgba(76, 71, 137, 0.12)", 0, y, width, 1);

  pixel(context, "#65f6ff", 18, 15, 10, 1);
  pixel(context, "#65f6ff", 18, 15, 1, 8);
  pixel(context, "#c27dff", width - 28, height - 22, 10, 1);
  pixel(context, "#c27dff", width - 18, height - 29, 1, 8);
};

const drawMachineFrame = (
  context: CanvasRenderingContext2D,
  layout: CanvasLayout,
  projection: Projection,
): void => {
  const right = layout.left + layout.width;
  const bottom = layout.top + layout.height;

  context.fillStyle = "#1a1233";
  context.fillRect(layout.left - 16, layout.top - 16, layout.width + 32, layout.height + 32);
  context.strokeStyle = "#b44655";
  context.lineWidth = 4;
  context.strokeRect(layout.left - 14, layout.top - 14, layout.width + 28, layout.height + 28);
  context.strokeStyle = "#5c263e";
  context.lineWidth = 1;
  context.strokeRect(layout.left - 7, layout.top - 7, layout.width + 14, layout.height + 14);

  context.fillStyle = "#291649";
  context.fillRect(layout.left, layout.top, layout.width, layout.height);

  context.strokeStyle = "rgba(101, 246, 255, 0.18)";
  context.lineWidth = 1;
  for (let column = 0; column <= layout.bounds.horizontal; column += 1) {
    const x = layout.left + column * layout.cellWidth;
    context.beginPath();
    context.moveTo(x, layout.top);
    context.lineTo(x, bottom);
    context.stroke();
  }
  for (let row = 0; row <= layout.bounds.vertical; row += 1) {
    const y = layout.top + row * layout.cellHeight;
    context.beginPath();
    context.moveTo(layout.left, y);
    context.lineTo(right, y);
    context.stroke();
  }

  context.strokeStyle = "#673250";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(layout.left - 2, layout.top - 2);
  context.lineTo(right + 2, layout.top - 2);
  context.stroke();
  context.lineWidth = 2;
  context.strokeStyle = "#df5360";
  context.beginPath();
  context.moveTo(layout.left - 1, layout.top - 8);
  context.lineTo(right + 1, layout.top - 8);
  context.stroke();

  for (let x = layout.left + 22; x < right; x += 62) {
    pixel(context, "#c84b59", x, layout.top - 15, 5, 5);
    pixel(context, "#541f3c", x + 5, layout.top - 15, 8, 5);
  }

  const bolt = (x: number, y: number, color: string): void => {
    pixel(context, "#160e2d", x - 5, y - 5, 10, 10);
    pixel(context, color, x - 3, y - 3, 6, 6);
    pixel(context, "#ffd67d", x - 1, y - 2, 2, 2);
  };
  bolt(layout.left - 14, layout.top - 14, "#e45762");
  bolt(right + 14, layout.top - 14, "#e45762");
  bolt(layout.left - 14, bottom + 14, "#e45762");
  bolt(right + 14, bottom + 14, "#e45762");

  if (projection.view !== "XY") {
    context.strokeStyle = "rgba(101, 246, 255, 0.38)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(layout.left, layout.top + layout.cellHeight * 0.32);
    context.lineTo(right, layout.top + layout.cellHeight * 0.32);
    context.stroke();
    context.strokeStyle = "#71d5d4";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(layout.left - 5, layout.top + layout.cellHeight * 0.32);
    context.lineTo(right + 5, layout.top + layout.cellHeight * 0.32);
    context.stroke();
  }
};

const screenPoint = (
  layout: CanvasLayout,
  horizontal: number,
  vertical: number,
): { x: number; y: number } => ({
  x: layout.left + (horizontal + 0.5) * layout.cellWidth,
  y: layout.top + (layout.bounds.vertical - vertical - 0.5) * layout.cellHeight,
});

const drawBear = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: Palette,
): void => {
  pixel(
    context,
    "rgba(10, 8, 29, 0.75)",
    x - size * 0.43,
    y + size * 0.34,
    size * 0.86,
    size * 0.15,
  );
  pixel(context, palette.shadow, x - size * 0.38, y - size * 0.25, size * 0.76, size * 0.55);
  pixel(context, palette.main, x - size * 0.32, y - size * 0.37, size * 0.64, size * 0.76);
  pixel(context, palette.main, x - size * 0.37, y - size * 0.43, size * 0.18, size * 0.2);
  pixel(context, palette.main, x + size * 0.19, y - size * 0.43, size * 0.18, size * 0.2);
  pixel(context, palette.highlight, x - size * 0.2, y - size * 0.21, size * 0.4, size * 0.23);
  pixel(context, "#241a3a", x - size * 0.17, y - size * 0.12, size * 0.08, size * 0.1);
  pixel(context, "#241a3a", x + size * 0.09, y - size * 0.12, size * 0.08, size * 0.1);
  pixel(context, palette.shadow, x - size * 0.08, y - size * 0.03, size * 0.16, size * 0.08);
};

const drawBlob = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: Palette,
): void => {
  pixel(
    context,
    "rgba(10, 8, 29, 0.75)",
    x - size * 0.43,
    y + size * 0.34,
    size * 0.86,
    size * 0.15,
  );
  pixel(context, palette.shadow, x - size * 0.39, y - size * 0.08, size * 0.78, size * 0.45);
  pixel(context, palette.main, x - size * 0.32, y - size * 0.33, size * 0.64, size * 0.62);
  pixel(context, palette.main, x - size * 0.22, y - size * 0.39, size * 0.44, size * 0.1);
  pixel(context, palette.highlight, x - size * 0.19, y - size * 0.23, size * 0.16, size * 0.11);
  pixel(context, "#173344", x + size * 0.05, y - size * 0.12, size * 0.08, size * 0.11);
  pixel(context, "#173344", x + size * 0.2, y - size * 0.12, size * 0.08, size * 0.11);
};

const drawCat = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: Palette,
): void => {
  pixel(
    context,
    "rgba(10, 8, 29, 0.75)",
    x - size * 0.43,
    y + size * 0.34,
    size * 0.86,
    size * 0.15,
  );
  pixel(context, palette.shadow, x - size * 0.36, y - size * 0.18, size * 0.72, size * 0.6);
  pixel(context, palette.main, x - size * 0.32, y - size * 0.34, size * 0.64, size * 0.65);
  pixel(context, palette.main, x - size * 0.29, y - size * 0.47, size * 0.15, size * 0.23);
  pixel(context, palette.main, x + size * 0.14, y - size * 0.47, size * 0.15, size * 0.23);
  pixel(context, palette.highlight, x - size * 0.2, y - size * 0.18, size * 0.38, size * 0.2);
  pixel(context, "#31203a", x - size * 0.15, y - size * 0.08, size * 0.07, size * 0.1);
  pixel(context, "#31203a", x + size * 0.1, y - size * 0.08, size * 0.07, size * 0.1);
};

const drawDuck = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: Palette,
): void => {
  pixel(
    context,
    "rgba(10, 8, 29, 0.75)",
    x - size * 0.43,
    y + size * 0.34,
    size * 0.86,
    size * 0.15,
  );
  pixel(context, palette.shadow, x - size * 0.37, y - size * 0.12, size * 0.74, size * 0.52);
  pixel(context, palette.main, x - size * 0.31, y - size * 0.35, size * 0.62, size * 0.66);
  pixel(context, palette.highlight, x - size * 0.2, y - size * 0.25, size * 0.37, size * 0.2);
  pixel(context, "#49363a", x - size * 0.14, y - size * 0.11, size * 0.07, size * 0.1);
  pixel(context, "#49363a", x + size * 0.1, y - size * 0.11, size * 0.07, size * 0.1);
  pixel(context, "#df8740", x - size * 0.12, y + size * 0.01, size * 0.28, size * 0.09);
};

const drawFrog = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: Palette,
): void => {
  pixel(
    context,
    "rgba(10, 8, 29, 0.75)",
    x - size * 0.43,
    y + size * 0.34,
    size * 0.86,
    size * 0.15,
  );
  pixel(context, palette.shadow, x - size * 0.39, y - size * 0.08, size * 0.78, size * 0.46);
  pixel(context, palette.main, x - size * 0.3, y - size * 0.34, size * 0.6, size * 0.62);
  pixel(context, palette.highlight, x - size * 0.24, y - size * 0.3, size * 0.17, size * 0.16);
  pixel(context, palette.highlight, x + size * 0.08, y - size * 0.3, size * 0.17, size * 0.16);
  pixel(context, "#1a3046", x - size * 0.18, y - size * 0.22, size * 0.07, size * 0.1);
  pixel(context, "#1a3046", x + size * 0.12, y - size * 0.22, size * 0.07, size * 0.1);
};

const drawRabbit = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: Palette,
): void => {
  pixel(
    context,
    "rgba(10, 8, 29, 0.75)",
    x - size * 0.43,
    y + size * 0.34,
    size * 0.86,
    size * 0.15,
  );
  pixel(context, palette.shadow, x - size * 0.36, y - size * 0.13, size * 0.72, size * 0.55);
  pixel(context, palette.main, x - size * 0.29, y - size * 0.41, size * 0.18, size * 0.38);
  pixel(context, palette.main, x + size * 0.1, y - size * 0.41, size * 0.18, size * 0.38);
  pixel(context, palette.main, x - size * 0.3, y - size * 0.25, size * 0.6, size * 0.6);
  pixel(context, palette.highlight, x - size * 0.18, y - size * 0.17, size * 0.36, size * 0.18);
  pixel(context, "#332044", x - size * 0.14, y - size * 0.09, size * 0.07, size * 0.1);
  pixel(context, "#332044", x + size * 0.09, y - size * 0.09, size * 0.07, size * 0.1);
};

const drawKey = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: Palette,
): void => {
  pixel(
    context,
    "rgba(10, 8, 29, 0.8)",
    x - size * 0.43,
    y + size * 0.34,
    size * 0.86,
    size * 0.15,
  );
  context.strokeStyle = palette.shadow;
  context.lineWidth = Math.max(3, size * 0.1);
  context.beginPath();
  context.arc(x - size * 0.08, y - size * 0.12, size * 0.2, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = palette.main;
  context.lineWidth = Math.max(2, size * 0.08);
  context.beginPath();
  context.arc(x - size * 0.08, y - size * 0.12, size * 0.16, 0, Math.PI * 2);
  context.stroke();
  pixel(context, palette.main, x + size * 0.05, y - size * 0.2, size * 0.42, size * 0.14);
  pixel(context, palette.main, x + size * 0.32, y - size * 0.2, size * 0.11, size * 0.26);
  pixel(context, palette.highlight, x + size * 0.1, y - size * 0.22, size * 0.2, size * 0.05);
};

const drawSprite = (
  context: CanvasRenderingContext2D,
  sprite: SpriteId,
  x: number,
  y: number,
  size: number,
): void => {
  const palette = spritePalette[sprite];
  switch (sprite) {
    case "bear":
      drawBear(context, x, y, size, palette);
      break;
    case "blob":
      drawBlob(context, x, y, size, palette);
      break;
    case "cat":
      drawCat(context, x, y, size, palette);
      break;
    case "duck":
      drawDuck(context, x, y, size, palette);
      break;
    case "frog":
      drawFrog(context, x, y, size, palette);
      break;
    case "key":
      drawKey(context, x, y, size, palette);
      break;
    case "rabbit":
      drawRabbit(context, x, y, size, palette);
      break;
  }
};

const drawItem = (
  context: CanvasRenderingContext2D,
  item: ProjectedItem,
  layout: CanvasLayout,
): void => {
  if (item.delivered || (!item.visible && !item.held)) return;
  const point = screenPoint(layout, item.horizontal, item.vertical);
  const size = Math.min(layout.cellWidth, layout.cellHeight) * (item.kind === "key" ? 0.64 : 0.9);
  drawSprite(context, item.sprite, point.x, point.y, size);
  if (item.held) {
    context.strokeStyle = "#e2b436";
    context.lineWidth = 1;
    context.strokeRect(point.x - size * 0.52, point.y - size * 0.58, size * 1.04, size * 0.82);
  }
};

const drawClaw = (
  context: CanvasRenderingContext2D,
  projection: Projection,
  layout: CanvasLayout,
): void => {
  const point = screenPoint(layout, projection.claw.horizontal, projection.claw.vertical);
  const sideView = projection.view !== "XY";
  if (sideView) {
    context.strokeStyle = "#d8e3e3";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(point.x, layout.top - 5);
    context.lineTo(point.x, point.y - 19);
    context.stroke();
    pixel(context, "#df5360", point.x - 10, layout.top - 12, 20, 5);
    pixel(context, "#71d5d4", point.x - 13, point.y - 20, 26, 4);
  } else {
    context.strokeStyle = "#71d5d4";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(point.x, point.y, 20, 0, Math.PI * 2);
    context.stroke();
    pixel(context, "#df5360", point.x - 9, point.y - 4, 18, 8);
  }

  context.strokeStyle = projection.claw.state === "OPEN" ? "#b6dfe2" : "#e2b436";
  context.lineWidth = 3;
  context.beginPath();
  if (sideView) {
    context.moveTo(point.x - 11, point.y - 14);
    context.lineTo(point.x - 6, point.y + 7);
    context.lineTo(point.x, point.y + 14);
    context.lineTo(point.x + 6, point.y + 7);
    context.lineTo(point.x + 11, point.y - 14);
  } else {
    context.arc(point.x, point.y, 13, 0.15, Math.PI - 0.15);
  }
  context.stroke();
};

const drawPrizeChute = (
  context: CanvasRenderingContext2D,
  projection: Projection,
  level: LevelDefinition,
  layout: CanvasLayout,
): void => {
  const chute = projectPosition(level.chutePosition, projection.view);
  const point = screenPoint(layout, chute.horizontal, chute.vertical);
  const width = Math.min(layout.cellWidth * 0.72, 64);
  const height = Math.min(layout.cellHeight * 0.52, 28);

  context.fillStyle = "#0b0819";
  context.fillRect(point.x - width / 2, point.y - height / 2, width, height);
  context.strokeStyle = "#c27dff";
  context.lineWidth = 2;
  context.strokeRect(point.x - width / 2, point.y - height / 2, width, height);
  pixel(context, "#65f6ff", point.x - width * 0.34, point.y - 2, width * 0.68, 4);
  pixel(context, "#df5360", point.x - width * 0.22, point.y + 6, width * 0.44, 3);
  drawText(context, "PRIZE HOLE", point.x, point.y - height * 0.95, "#f0c7ff", 8, "center");
};

/** Render projection data into the pixel-art machine viewport. */
export const drawProjection = (
  canvas: HTMLCanvasElement,
  projection: Projection,
  level: LevelDefinition,
): void => {
  const context = canvas.getContext("2d");
  if (!context) return;
  const width = canvas.width;
  const height = canvas.height;
  context.imageSmoothingEnabled = false;
  drawBackground(context, width, height);
  const layout = getLayout(projection, level, width, height);
  drawMachineFrame(context, layout, projection);
  drawPrizeChute(context, projection, level, layout);

  const items = [...projection.items].sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
  for (const item of items) drawItem(context, item, layout);
  drawClaw(context, projection, layout);
};

const drawDebugAxes = (context: CanvasRenderingContext2D): void => {
  context.strokeStyle = "#344765";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(140, 132);
  context.lineTo(250, 132);
  context.lineTo(194, 101);
  context.moveTo(140, 132);
  context.lineTo(140, 37);
  context.stroke();
  drawText(context, "X", 255, 132, "#65f6ff", 9);
  drawText(context, "Y", 195, 94, "#c27dff", 9);
  drawText(context, "Z", 140, 29, "#e2b436", 9, "center");
};

const debugPoint = (x: number, y: number, z: number): { x: number; y: number } => ({
  x: 140 + x * 13 - y * 7,
  y: 132 - z * 13 - y * 4,
});

/** Render the authoritative world as a small developer-only spatial aid. */
export const drawDebugWorld = (canvas: HTMLCanvasElement, state: ClawMachineState): void => {
  const context = canvas.getContext("2d");
  if (!context) return;
  const width = canvas.width;
  const height = canvas.height;
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#0a0d18";
  context.fillRect(0, 0, width, height);
  drawDebugAxes(context);

  for (const object of state.objects) {
    if (object.delivered) continue;
    const position = state.heldObjectId === object.id ? state.clawPosition : object.position;
    const point = debugPoint(position.x, position.y, position.z);
    const color = object.kind === "key" ? "#e2b436" : spritePalette[object.sprite].main;
    pixel(context, "rgba(0, 0, 0, 0.5)", point.x - 3, point.y + 4, 8, 3);
    pixel(context, color, point.x - 4, point.y - 4, 8, 8);
  }

  const claw = debugPoint(state.clawPosition.x, state.clawPosition.y, state.clawPosition.z);
  context.strokeStyle = "#65f6ff";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(claw.x, claw.y, 7, 0, Math.PI * 2);
  context.stroke();
  drawText(context, "AUTHORITATIVE WORLD", 12, height - 12, "#6e8190", 8);
};
