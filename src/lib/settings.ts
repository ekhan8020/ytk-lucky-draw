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
  ribbonColor: string;
  soundEnabled: boolean;
  choirEnabled: boolean;
  choirAudioUrl: string | null;
  lowStockThreshold: number;
}

export const DEFAULT_SETTINGS: DrawSettings = {
  titleLine1: "YTK",
  titleLine2: "LUCKY DRAW",
  titleLine1Color: "#E14B4B",
  titleLine2Color: "#F5C242",
  description: "Spend RM100 or more in one bill to draw once",
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
  ribbonColor: "#E14B4B",
  soundEnabled: true,
  choirEnabled: true,
  choirAudioUrl: null,
  lowStockThreshold: 5,
};

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
  ribbon_color: string;
  sound_enabled: boolean;
  choir_enabled: boolean;
  choir_audio_url: string | null;
  low_stock_threshold: number;
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
    ribbonColor: r.ribbon_color,
    soundEnabled: r.sound_enabled,
    choirEnabled: r.choir_enabled,
    choirAudioUrl: r.choir_audio_url,
    lowStockThreshold: r.low_stock_threshold,
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
    ribbon_color: s.ribbonColor,
    sound_enabled: s.soundEnabled,
    choir_enabled: s.choirEnabled,
    choir_audio_url: s.choirAudioUrl,
    low_stock_threshold: s.lowStockThreshold,
  };
}

// CSS custom properties the kiosk stylesheet and the box artwork read. Every
// shade is derived from the two colours the admin picks.
export function themeVars(s: DrawSettings): Record<string, string> {
  const box = s.boxColor;
  const rib = s.ribbonColor;
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
    // box artwork
    "--box-a": shade(box, -0.06),
    "--box-b": shade(box, 0.38),
    "--box-c": shade(box, -0.12),
    "--lid-a": shade(box, 0.55),
    "--lid-b": shade(box, -0.02),
    "--box-shadow-edge": shade(box, -0.22),
    "--box-rim": shade(box, 0.75),
    "--rib-a": shade(rib, -0.25),
    "--rib-b": rib,
    "--rib-c": shade(rib, -0.35),
    "--rib-stroke": shade(rib, -0.38),
    "--rib-hi": shade(rib, 0.4),
    "--inner-a": shade(box, 0.9),
    "--inner-b": shade(box, 0.4),
    "--inner-c": shade(rib, 0.35),
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
