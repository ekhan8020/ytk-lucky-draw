"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createKioskEngine } from "@/lib/kiosk/engine";
import { DEFAULT_SETTINGS, DrawSettings, themeVars } from "@/lib/settings";
import "@/app/kiosk.css";

type PrizeResult = { kind: "prize"; prize: { name: string; tier: string; color: string } } | { kind: "sold_out" } | { kind: "error" };

interface Engine {
  newToken: () => string;
  destroy: () => void;
  applySettings: () => void;
}

const REFRESH_MS = 5 * 60 * 1000;

// The customer-facing iPad screen. Look-and-feel comes from the admin
// settings (fetched on load, every 5 minutes, and each time the screen goes
// back to standby); the prize is always decided by the server.
export function Kiosk() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<DrawSettings>(DEFAULT_SETTINGS);
  const [available, setAvailable] = useState(true);
  const settingsRef = useRef(settings);
  const availableRef = useRef(true);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const refreshConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/config", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { settings: DrawSettings; available: boolean };
      settingsRef.current = data.settings;
      availableRef.current = data.available;
      setSettings(data.settings);
      setAvailable(data.available);
    } catch {
      // offline: keep showing what we have
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("kiosk-page");
    return () => document.documentElement.classList.remove("kiosk-page");
  }, []);

  useEffect(() => {
    const first = setTimeout(refreshConfig, 0);
    const timer = setInterval(refreshConfig, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refreshConfig]);

  // Keep the iPad awake while the page is open (quietly does nothing where unsupported).
  useEffect(() => {
    type WakeLockSentinelLike = { release: () => Promise<void> };
    let lock: WakeLockSentinelLike | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } };
    const acquire = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === "visible") lock = await nav.wakeLock.request("screen");
      } catch {
        lock = null;
      }
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let engine: Engine | null = null;

    async function requestPrize(): Promise<PrizeResult> {
      const token = engine!.newToken();
      // Same token on every retry: the server returns the same result and takes stock once.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch("/api/draw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.status === "ok") return { kind: "prize", prize: data.prize };
          if (res.ok && data?.status === "sold_out") return { kind: "sold_out" };
          if (res.status === 400 || res.status === 429) break;
        } catch {
          // network hiccup — retry with the same token
        }
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
      return { kind: "error" };
    }

    engine = createKioskEngine(root, {
      getSettings: () => settingsRef.current,
      isAvailable: () => availableRef.current,
      requestPrize,
      onIdle: () => {
        refreshConfig();
      },
    }) as Engine;
    return () => engine?.destroy();
  }, [refreshConfig]);

  const style = themeVars(settings) as CSSProperties;

  return (
    <div className="kiosk" ref={rootRef} style={style} onContextMenu={(e) => e.preventDefault()}>
      <div className="bg" />
      <canvas id="fx" />
      <div className="flash" id="flash" />

      <main className="app">
        <header className="head">
          <h1>
            <span className="y">{settings.titleLine1}</span>
            <span className="l">{settings.titleLine2}</span>
          </h1>
          <p className="rule">{settings.description}</p>
        </header>

        <section className="stage-wrap">
          <div className="stage" id="stage">
            <div className="rays" id="rays" />
            <svg viewBox="0 0 400 420" aria-hidden="true">
              <defs>
                <linearGradient id="gBody" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" style={{ stopColor: "var(--box-a)" }} />
                  <stop offset=".45" style={{ stopColor: "var(--box-b)" }} />
                  <stop offset="1" style={{ stopColor: "var(--box-c)" }} />
                </linearGradient>
                <linearGradient id="gLid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style={{ stopColor: "var(--lid-a)" }} />
                  <stop offset="1" style={{ stopColor: "var(--lid-b)" }} />
                </linearGradient>
                <linearGradient id="gRib" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" style={{ stopColor: "var(--rib-a)" }} />
                  <stop offset=".5" style={{ stopColor: "var(--rib-b)" }} />
                  <stop offset="1" style={{ stopColor: "var(--rib-c)" }} />
                </linearGradient>
                <radialGradient id="gIn" cx=".5" cy=".5" r=".5">
                  <stop offset="0" style={{ stopColor: "var(--inner-a)" }} />
                  <stop offset=".55" style={{ stopColor: "var(--inner-b)" }} />
                  <stop offset="1" style={{ stopColor: "var(--inner-c)" }} />
                </radialGradient>
                <radialGradient id="gShadow" cx=".5" cy=".5" r=".5">
                  <stop offset="0" stopColor="#05070c" stopOpacity=".55" />
                  <stop offset="1" stopColor="#05070c" stopOpacity="0" />
                </radialGradient>
              </defs>
              <ellipse cx="200" cy="374" rx="140" ry="17" fill="url(#gShadow)" />
              <g id="box">
                <g id="base">
                  <ellipse cx="200" cy="215" rx="90" ry="22" fill="#2a1d1d" />
                  <ellipse id="inner" cx="200" cy="215" rx="90" ry="22" fill="url(#gIn)" opacity="0" />
                  <path d="M110 215 A90 22 0 0 0 290 215 L290 333 Q290 345 278 345 L122 345 Q110 345 110 333 Z" fill="url(#gBody)" />
                  <path d="M188 237 Q200 238.5 212 237 L212 345 L188 345 Z" fill="url(#gRib)" />
                  <path d="M110 215 A90 22 0 0 0 290 215" fill="none" style={{ stroke: "var(--box-rim)" }} strokeWidth="2" />
                </g>
                <g id="lid">
                  <path d="M198 172 C168 112 112 126 138 162 C150 178 182 180 198 172 Z" fill="url(#gRib)" style={{ stroke: "var(--rib-stroke)" }} strokeWidth="2" />
                  <path d="M202 172 C232 112 288 126 262 162 C250 178 218 180 202 172 Z" fill="url(#gRib)" style={{ stroke: "var(--rib-stroke)" }} strokeWidth="2" />
                  <path d="M150 152 C158 140 172 140 184 160" fill="none" style={{ stroke: "var(--rib-hi)" }} strokeWidth="3" strokeLinecap="round" opacity=".8" />
                  <rect x="96" y="176" width="208" height="44" rx="10" fill="url(#gLid)" />
                  <rect x="96" y="208" width="208" height="12" rx="6" style={{ fill: "var(--box-shadow-edge)" }} />
                  <rect x="188" y="176" width="24" height="44" fill="url(#gRib)" />
                  <ellipse cx="200" cy="172" rx="15" ry="11" fill="url(#gRib)" style={{ stroke: "var(--rib-stroke)" }} strokeWidth="2" />
                </g>
              </g>
            </svg>
            <div className="halo" id="halo" />
            <div className="beam" id="beam" />
          </div>
        </section>

        <footer className="foot">
          <button className="cta" id="open" type="button" style={available ? undefined : { display: "none" }}>
            <b>{settings.buttonText}</b>
          </button>
          {!available && <p className="rule soldout">{settings.soldOutMessage}</p>}
        </footer>
      </main>

      <div className="popup" id="popup" hidden role="dialog" aria-modal="true" aria-labelledby="pz-name">
        <div className="burst-wrap">
          <div className="burst" />
        </div>
        <div className="card" id="card">
          <div className="chip" id="pz-tier" />
          <p className="congrats" id="pz-congrats">
            You won
          </p>
          <h2 id="pz-name" />
          <p className="cashier" id="pz-hint" />
          <button className="done" id="done" type="button">
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}
