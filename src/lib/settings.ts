import { rgbTriplet, shade } from "./color";

export interface DrawSettings {
  titleLine1: string;
  titleLine2: string;
  titleLine1Color: string;
  titleLine2Color: string;
  description: string;
  descriptionColor: string;
  buttonText: string;
  buttonColor: string;
  buttonTextColor: string;
  popupHint: string;
  soldOutMessage: string;
  bgColor1: string;
  bgColor2: string;
  bgColor3: string | null;
  bgAngle: number;
  boxColor: string;
  // Detail colours of the box; null = worked out automatically from the main colours.
  boxSideColor: string | null;
  lidColor: string | null;
  ribbonColor: string;
  ribbonAccentColor: string | null;
  soundEnabled: boolean;
  choirEnabled: boolean;
  choirAudioUrl: string | null;
  lowStockThreshold: number;
  // A draw needs a bill above this amount (RM).
  minAmount: number;
  // Shows the "reset test draws" tool on the Prizes page. Keep OFF on the live site.
  allowTestReset: boolean;
}

export const DEFAULT_SETTINGS: DrawSettings = {
  titleLine1: "YTK",
  titleLine2: "LUCKY DRAW",
  titleLine1Color: "#E14B4B",
  titleLine2Color: "#F5C242",
  description: "Spend over RM{amount} in one bill to draw once",
  descriptionColor: "#D8DBE3",
  buttonText: "TAP TO OPEN",
  buttonColor: "#F5C242",
  buttonTextColor: "#1E2430",
  popupHint: "Show this screen to the cashier",
  soldOutMessage: "All prizes have been given out. Thank you for your support!",
  bgColor1: "#141A26",
  bgColor2: "#1E2430",
  bgColor3: null,
  bgAngle: 180,
  boxColor: "#F5C242",
  boxSideColor: null,
  lidColor: null,
  ribbonColor: "#E14B4B",
  ribbonAccentColor: null,
  soundEnabled: true,
  choirEnabled: true,
  choirAudioUrl: null,
  lowStockThreshold: 5,
  minAmount: 800,
  allowTestReset: false,
};

// The description may contain {amount}; it is replaced by the current minimum bill amount
// (e.g. "Spend over RM{amount} in one bill" -> "Spend over RM800 in one bill").
export function renderDescription(s: Pick<DrawSettings, "description" | "minAmount">): string {
  const amount = s.minAmount.toLocaleString("en-MY", { maximumFractionDigits: 2 });
  return s.description.replace(/\{amount\}/gi, amount);
}

export interface DrawSettingsRow {
  title_line1: string;
  title_line2: string;
  title_line1_color: string;
  title_line2_color: string;
  description: string;
  description_color?: string | null;
  button_text: string;
  button_color?: string | null;
  button_text_color?: string | null;
  popup_hint: string;
  sold_out_message: string;
  bg_color_1: string;
  bg_color_2: string;
  bg_color_3: string | null;
  bg_angle: number;
  box_color: string;
  box_side_color?: string | null;
  lid_color?: string | null;
  ribbon_color: string;
  ribbon_accent_color?: string | null;
  sound_enabled: boolean;
  choir_enabled: boolean;
  choir_audio_url: string | null;
  low_stock_threshold: number;
  min_amount?: number | string | null;
  allow_test_reset?: boolean | null;
}

export function settingsFromRow(r: DrawSettingsRow): DrawSettings {
  return {
    titleLine1: r.title_line1,
    titleLine2: r.title_line2,
    titleLine1Color: r.title_line1_color,
    titleLine2Color: r.title_line2_color,
    description: r.description,
    descriptionColor: r.description_color || DEFAULT_SETTINGS.descriptionColor,
    buttonText: r.button_text,
    buttonColor: r.button_color || DEFAULT_SETTINGS.buttonColor,
    buttonTextColor: r.button_text_color || DEFAULT_SETTINGS.buttonTextColor,
    popupHint: r.popup_hint,
    soldOutMessage: r.sold_out_message,
    bgColor1: r.bg_color_1,
    bgColor2: r.bg_color_2,
    bgColor3: r.bg_color_3,
    bgAngle: r.bg_angle,
    boxColor: r.box_color,
    boxSideColor: r.box_side_color || null,
    lidColor: r.lid_color || null,
    ribbonColor: r.ribbon_color,
    ribbonAccentColor: r.ribbon_accent_color || null,
    soundEnabled: r.sound_enabled,
    choirEnabled: r.choir_enabled,
    choirAudioUrl: r.choir_audio_url,
    lowStockThreshold: r.low_stock_threshold,
    minAmount: r.min_amount == null ? DEFAULT_SETTINGS.minAmount : Number(r.min_amount),
    allowTestReset: r.allow_test_reset === true,
  };
}

export function settingsToRow(s: DrawSettings): DrawSettingsRow {
  return {
    title_line1: s.titleLine1,
    title_line2: s.titleLine2,
    title_line1_color: s.titleLine1Color,
    title_line2_color: s.titleLine2Color,
    description: s.description,
    description_color: s.descriptionColor,
    button_text: s.buttonText,
    button_color: s.buttonColor,
    button_text_color: s.buttonTextColor,
    popup_hint: s.popupHint,
    sold_out_message: s.soldOutMessage,
    bg_color_1: s.bgColor1,
    bg_color_2: s.bgColor2,
    bg_color_3: s.bgColor3,
    bg_angle: s.bgAngle,
    box_color: s.boxColor,
    box_side_color: s.boxSideColor,
    lid_color: s.lidColor,
    ribbon_color: s.ribbonColor,
    ribbon_accent_color: s.ribbonAccentColor,
    sound_enabled: s.soundEnabled,
    choir_enabled: s.choirEnabled,
    choir_audio_url: s.choirAudioUrl,
    low_stock_threshold: s.lowStockThreshold,
    min_amount: s.minAmount,
    allow_test_reset: s.allowTestReset,
  };
}

// CSS custom properties the kiosk stylesheet and the box artwork read. Every
// shade is derived from the two colours the admin picks.
export function themeVars(s: DrawSettings): Record<string, string> {
  const box = s.boxColor;
  const rib = s.ribbonColor;
  const side = s.boxSideColor ?? shade(box, -0.22);
  const lid = s.lidColor ?? shade(box, 0.32);
  const acc = s.ribbonAccentColor ?? shade(rib, 0.5);
  const stops = [s.bgColor1, s.bgColor2, s.bgColor3].filter(Boolean) as string[];
  const gradient =
    stops.length === 1 ? stops[0] : `linear-gradient(${s.bgAngle}deg, ${stops.map((c, i) => `${c} ${Math.round((i / (stops.length - 1)) * (i === stops.length - 1 ? 100 : 75))}%`).join(", ")})`;
  return {
    "--bg-gradient": gradient,
    "--bg-0": s.bgColor1,
    "--gold": box,
    "--gold-light": shade(box, 0.4),
    "--gold-mid": shade(box, -0.1),
    "--gold-deep": shade(box, -0.3),
    "--gold-pale-rgb": rgbTriplet(shade(box, 0.55)),
    "--glow-rgb": rgbTriplet(shade(box, 0.85)),
    "--gold-rgb": rgbTriplet(box),
    "--glow": shade(box, 0.85),
    "--red": rib,
    "--red-deep": shade(rib, -0.18),
    "--red-rgb": rgbTriplet(rib),
    "--title1": s.titleLine1Color,
    "--title1-deep": shade(s.titleLine1Color, -0.18),
    "--title1-rgb": rgbTriplet(s.titleLine1Color),
    "--title2": s.titleLine2Color,
    "--title2-deep": shade(s.titleLine2Color, -0.3),
    "--title2-rgb": rgbTriplet(s.titleLine2Color),
    // box artwork (isometric cube, lid, satin ribbon, bow)
    "--face-l": box,
    "--face-l-hi": shade(box, 0.3),
    "--face-r": side,
    "--face-r-hi": shade(side, 0.18),
    "--lid-top": lid,
    "--lid-top-hi": shade(lid, 0.4),
    "--lid-l": shade(box, 0.14),
    "--lid-l-lo": box,
    "--lid-r": shade(side, 0.16),
    "--lid-r-lo": side,
    "--edge-hi": shade(box, 0.85),
    "--box-shadow-edge": shade(side, -0.45),
    "--rib": rib,
    "--rib-hi": shade(rib, 0.4),
    "--rib-lo": shade(rib, -0.28),
    "--acc": acc,
    "--inner-a": shade(box, 0.9),
    "--inner-b": shade(box, 0.4),
    "--inner-c": shade(rib, 0.35),
    "--inner-wall-l": shade(box, -0.5),
    "--inner-wall-r": shade(side, -0.55),
    "--desc": s.descriptionColor,
    "--btn": s.buttonColor,
    "--btn-light": shade(s.buttonColor, 0.4),
    "--btn-mid": shade(s.buttonColor, -0.1),
    "--btn-deep": shade(s.buttonColor, -0.3),
    "--btn-rgb": rgbTriplet(s.buttonColor),
    "--btn-text": s.buttonTextColor,
    "--ink": "#1e2430",
  };
}
