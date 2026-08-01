import {
  getInitials,
  getPlayerDisplayName,
  getTeamInitials,
  safeSocialColor,
  type SocialBranding,
  type SocialContent,
} from "./model";

export const SOCIAL_EXPORT_SIZE = 1080;

export type SocialExportPayload = {
  branding: SocialBranding;
  content: SocialContent;
  opponentLogoUrl?: string | null;
  highlightPhotoUrl?: string | null;
  labels: {
    competition: string;
    venue: string;
    goalScorers: string;
    topScorer: string;
    playerOfMatch: string;
    lineup: string;
    noScorers: string;
  };
};

function loadImage(url: string | null | undefined) {
  if (!url || typeof Image === "undefined") return Promise.resolve(null);
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function drawText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 700,
) {
  context.fillStyle = color;
  context.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
  context.fillText(value, x, y);
}

function drawFallbackBadge(
  context: CanvasRenderingContext2D,
  initials: string,
  x: number,
  y: number,
  radius: number,
  background: string,
  foreground: string,
) {
  context.beginPath();
  context.fillStyle = background;
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.textAlign = "center";
  context.textBaseline = "middle";
  drawText(
    context,
    initials,
    x,
    y,
    Math.max(18, radius * 0.46),
    foreground,
    900,
  );
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
}

function drawImageBadge(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  fallback: string,
  x: number,
  y: number,
  radius: number,
  background: string,
  foreground: string,
) {
  if (!image) {
    drawFallbackBadge(context, fallback, x, y, radius, background, foreground);
    return;
  }
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.clip();
  const scale = Math.max(
    (radius * 2) / image.width,
    (radius * 2) / image.height,
  );
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(image, x - width / 2, y - height / 2, width, height);
  context.restore();
}

export async function renderSocialCardToCanvas(
  canvas: HTMLCanvasElement,
  payload: SocialExportPayload,
) {
  canvas.width = SOCIAL_EXPORT_SIZE;
  canvas.height = SOCIAL_EXPORT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("social_canvas_unavailable");

  const primary = safeSocialColor(payload.branding.primary_color, "#00a331");
  const secondary = safeSocialColor(
    payload.branding.secondary_color,
    "#071a36",
  );
  const [teamLogo, opponentLogo, highlightPhoto] = await Promise.all([
    loadImage(payload.branding.logo_url),
    loadImage(payload.opponentLogoUrl),
    loadImage(payload.highlightPhotoUrl),
  ]);

  context.fillStyle = "#f6f9f7";
  context.fillRect(0, 0, SOCIAL_EXPORT_SIZE, SOCIAL_EXPORT_SIZE);
  context.fillStyle = secondary;
  context.fillRect(0, 0, SOCIAL_EXPORT_SIZE, 240);
  context.fillStyle = primary;
  context.fillRect(0, 240, SOCIAL_EXPORT_SIZE, 18);

  drawImageBadge(
    context,
    teamLogo,
    getTeamInitials(payload.branding),
    110,
    112,
    64,
    primary,
    "#ffffff",
  );
  drawText(context, payload.branding.name, 200, 105, 32, "#ffffff", 900);
  drawText(context, payload.content.title, 200, 151, 24, "#cce2cf", 700);

  drawText(context, payload.content.eyebrow, 110, 360, 26, secondary, 900);
  drawText(
    context,
    payload.content.opponent || "—",
    970,
    360,
    26,
    secondary,
    900,
  );
  context.textAlign = "right";
  context.textAlign = "left";
  if (payload.content.score) {
    context.textAlign = "center";
    drawText(context, payload.content.score, 540, 500, 132, primary, 900);
    context.textAlign = "left";
  } else {
    context.textAlign = "center";
    drawText(context, "VS", 540, 500, 72, primary, 900);
    context.textAlign = "left";
  }

  drawImageBadge(
    context,
    opponentLogo,
    getInitials(payload.content.opponent, "OP"),
    900,
    420,
    48,
    "#dfece3",
    secondary,
  );

  let y = 610;
  const details = [payload.content.competition, payload.content.venue]
    .filter(Boolean)
    .join(" · ");
  if (details) {
    drawText(context, details, 110, y, 22, "#607086", 700);
    y += 54;
  }
  if (payload.content.kind === "result" && payload.content.score) {
    drawText(context, payload.labels.goalScorers, 110, y, 22, secondary, 900);
    y += 40;
    const scorerText = payload.content.goalScorers.length
      ? payload.content.goalScorers
          .map(
            ({ player, goals }) => `${getPlayerDisplayName(player)} ${goals}×`,
          )
          .join("  ·  ")
      : payload.labels.noScorers;
    drawText(context, scorerText, 110, y, 24, "#607086", 700);
    y += 58;
  }
  if (payload.content.kind === "topScorer" && payload.content.topScorer) {
    drawText(context, payload.labels.topScorer, 110, y, 22, secondary, 900);
    y += 42;
    drawText(
      context,
      getPlayerDisplayName(payload.content.topScorer),
      110,
      y,
      34,
      primary,
      900,
    );
    drawText(
      context,
      `${payload.content.topScorer.goals} goals`,
      110,
      y + 38,
      22,
      "#607086",
      700,
    );
    y += 92;
  }
  if (
    payload.content.kind === "playerOfMatch" &&
    payload.content.playerOfMatch
  ) {
    drawImageBadge(
      context,
      highlightPhoto,
      getInitials(getPlayerDisplayName(payload.content.playerOfMatch)),
      145,
      y + 5,
      46,
      primary,
      "#ffffff",
    );
    drawText(context, payload.labels.playerOfMatch, 220, y, 22, secondary, 900);
    drawText(
      context,
      getPlayerDisplayName(payload.content.playerOfMatch),
      220,
      y + 42,
      34,
      primary,
      900,
    );
    y += 110;
  }
  if (payload.content.kind === "lineup") {
    drawText(context, payload.labels.lineup, 110, y, 22, secondary, 900);
    y += 42;
    drawText(
      context,
      `${payload.content.lineup.length} players`,
      110,
      y,
      34,
      primary,
      900,
    );
  }

  drawText(
    context,
    payload.content.season ?? "",
    110,
    1018,
    22,
    "#607086",
    700,
  );
  return canvas;
}

export async function exportSocialCardAsPng(
  payload: SocialExportPayload,
  filename: string,
) {
  if (typeof document === "undefined")
    throw new Error("social_export_unavailable");
  const canvas = document.createElement("canvas");
  await renderSocialCardToCanvas(canvas, payload);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("social_png_unavailable");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
