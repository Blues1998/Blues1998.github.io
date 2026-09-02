import { useEffect, useRef } from "react";
import { mountWander } from "../../lib/wander";

/*
 * "Wander": a procedural, endless scenic drive.
 *
 * This component is only the shell. It owns the markup that the HUD, settings
 * panel and start screen are wired into, and one effect that mounts the
 * engine and tears it down again. The simulation itself lives in
 * `src/lib/wander/` - see that directory's index.ts for how the pieces fit
 * together.
 *
 * The markup stays declarative here rather than being built imperatively by
 * the engine, so the chrome is React's to render and `ui.ts` only has to find
 * elements and bind to them. That split is what keeps the engine free of JSX
 * and the component free of three.js.
 */
export default function EndlessDrive() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    return mountWander(container);
  }, []);

  return (
    <div ref={containerRef} className="wander-shell">
      <div className="wander-vignette" />
      <div className="wander-cover" />

      <div className="wander-hud">
        <div className="wander-speed">0</div>
        <div className="wander-speed-unit">KM/H</div>
        <div className="wander-auto-chip">AUTO-DRIVE</div>
      </div>

      <div className="wander-chips">
        <div className="wander-chip wander-biome-chip">Woodland</div>
        <div className="wander-chip wander-season-chip">Spring</div>
        <div className="wander-chip wander-clock-chip">08:40</div>
        <div className="wander-chip wander-wx-chip">☀️</div>
        <div className="wander-chip wander-gear-btn">⚙︎</div>
      </div>

      <div className="wander-help">
        <b>W/S</b> drive · <b>A/D</b> steer · <b>Space</b> brake · <b>T</b> auto-drive · <b>C</b> camera · <b>V</b> wipers · <b>R</b> reset · <b>M</b> sound · <b>Esc</b> settings
      </div>

      <div className="wander-panel wander-hidden">
        <h2>
          SETTINGS <button className="wander-close-panel">×</button>
        </h2>
        <div className="wander-row">
          <label>Time speed</label>
          <input className="wander-time-scale" type="range" min="0" max="8" step="0.25" defaultValue="1" />
          <span className="wander-val wander-time-scale-val">1×</span>
        </div>
        <div className="wander-row">
          <label>Season</label>
          <div className="wander-btns wander-season-btns">
            <button data-s="auto" className="wander-on">
              Auto
            </button>
            <button data-s="0">Spring</button>
            <button data-s="1">Summer</button>
            <button data-s="2">Autumn</button>
            <button data-s="3">Winter</button>
          </div>
        </div>
        <div className="wander-row">
          <label>Weather</label>
          <div className="wander-btns wander-wx-btns">
            <button data-w="auto" className="wander-on">
              Auto
            </button>
            <button data-w="clear">Clear</button>
          </div>
        </div>
        <div className="wander-row">
          <label>Wipers</label>
          <div className="wander-btns wander-wiper-btns">
            <button data-v="0" className="wander-on">
              Auto
            </button>
            <button data-v="1">Slow</button>
            <button data-v="2">Fast</button>
            <button data-v="3">Off</button>
          </div>
        </div>
        <div className="wander-row">
          <label>Camera</label>
          <div className="wander-btns wander-cam-btns">
            <button data-c="0" className="wander-on">
              Chase
            </button>
            <button data-c="1">Hood</button>
            <button data-c="2">Cockpit</button>
            <button data-c="3">Cinematic</button>
          </div>
        </div>
        <div className="wander-row">
          <label>Quality</label>
          <div className="wander-btns wander-qual-btns">
            <button data-q="0">Low</button>
            <button data-q="1" className="wander-on">
              Medium
            </button>
            <button data-q="2">High</button>
          </div>
        </div>
        <div className="wander-row">
          <label>Volume</label>
          <input className="wander-vol" type="range" min="0" max="1" step="0.05" defaultValue="0.8" />
          <span className="wander-val wander-vol-val">80</span>
        </div>
        <div className="wander-row-small">
          world seed <span className="wander-seed-val" />
          &nbsp;·&nbsp;
          <a className="wander-new-seed">new world ↻</a>
        </div>
      </div>

      <div className="wander-start">
        <div className="wander-start-card">
          <h1>WANDER</h1>
          <p>an endless scenic drive through the seasons</p>
          <button className="wander-start-btn">BEGIN DRIVE</button>
          <div className="wander-tiny">procedural &amp; infinite · sound on 🎧</div>
        </div>
      </div>
    </div>
  );
}
