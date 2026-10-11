"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createKioskEngine } from "@/lib/kiosk/engine";
import { GiftBox } from "./GiftBox";
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
export function Kiosk({ preview = false }: { preview?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<DrawSettings>(DEFAULT_SETTINGS);
  const [available, setAvailable] = useState(true);
  const settingsRef = useRef(settings);
  const availableRef = useRef(true);
  // Admin "test mode": settings and the next prize arrive by postMessage; nothing is fetched, no stock is touched, nothing is recorded.
  const previewRef = useRef<{ prize: { name: string; tier: string; color: string } | null; soldOut: boolean }>({ prize: null, soldOut: false });

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const refreshConfig = useCallback(async () => {
    if (preview) return;
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
  }, [preview]);

  useEffect(() => {
    document.documentElement.classList.add("kiosk-page");
    return () => document.documentElement.classList.remove("kiosk-page");
  }, []);

  useEffect(() => {
    if (!preview) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "ld-preview") return;
      settingsRef.current = e.data.settings;
      setSettings(e.data.settings);
      previewRef.current = { prize: e.data.prize ?? null, soldOut: !!e.data.soldOut };
      availableRef.current = !e.data.soldOut;
      setAvailable(!e.data.soldOut);
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "ld-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [preview]);

  useEffect(() => {
    if (preview) return;
    const first = setTimeout(refreshConfig, 0);
    const timer = setInterval(refreshConfig, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refreshConfig, preview]);

  // Keep the iPad awake while the page is open (quietly does nothing where unsupported).
  useEffect(() => {
    if (preview) return;
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
  }, [preview]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let engine: Engine | null = null;

    async function requestPrize(): Promise<PrizeResult> {
      if (preview) {
        await new Promise((r) => setTimeout(r, 300));
        const p = previewRef.current;
        if (p.soldOut) return { kind: "sold_out" };
        return { kind: "prize", prize: p.prize ?? { name: "Sample Prize", tier: "LUCKY GIFT", color: "#E4E6EC" } };
      }
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
  }, [refreshConfig, preview]);

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
            <GiftBox />
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
