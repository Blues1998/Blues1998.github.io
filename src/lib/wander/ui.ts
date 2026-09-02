import { SEASON_EMOJI, SEASON_NAMES } from "./seasons";
import type { CarState, EnvState, WanderState, WeatherState } from "./types";

/*
 * The DOM layer: settings panel, HUD, start screen.
 *
 * All markup is rendered by the React component; this only queries inside the
 * container and wires it up. Nothing here reaches for `document`, so two
 * instances on a page would not fight, and teardown is just discarding the
 * container.
 */

export interface UICallbacks {
  onStart(): void;
  onQualityChange(): void;
  onVolumeChange(): void;
}

export function createUI(
  container: HTMLElement,
  state: WanderState,
  car: CarState,
  env: EnvState,
  wx: WeatherState,
  seed: number,
  getBiomeName: () => string,
  cb: UICallbacks,
) {
  const q = <T extends Element>(sel: string) => container.querySelector(sel) as T;

  const panelEl = q<HTMLDivElement>(".wander-panel");
  function togglePanel() {
    panelEl.classList.toggle("wander-hidden");
  }
  q<HTMLButtonElement>(".wander-gear-btn").addEventListener("click", togglePanel);
  q<HTMLButtonElement>(".wander-close-panel").addEventListener("click", togglePanel);

  /* Buttons in a row are a radio group keyed by a data attribute; `markOn`
     is the only thing that decides which one looks active. */
  function markOn(group: Element, attr: string, val: string | number) {
    for (const b of group.querySelectorAll("button")) b.classList.toggle("wander-on", (b as HTMLElement).dataset[attr] === String(val));
  }

  const autoChipEl = q<HTMLDivElement>(".wander-auto-chip");
  function setAuto(on: boolean) {
    state.auto = on;
    autoChipEl.classList.toggle("wander-off", !on);
    autoChipEl.textContent = on ? "AUTO-DRIVE" : "AUTO-DRIVE OFF";
  }
  autoChipEl.addEventListener("click", () => setAuto(!state.auto));

  const camBtnsEl = q<HTMLDivElement>(".wander-cam-btns");
  function setCam(m: number) {
    state.camMode = m;
    markOn(camBtnsEl, "c", m);
  }
  camBtnsEl.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.dataset.c !== undefined) setCam(+t.dataset.c);
  });

  const wiperBtnsEl = q<HTMLDivElement>(".wander-wiper-btns");
  function setWiper(v: number) {
    state.wiperMode = v;
    if (wiperBtnsEl) markOn(wiperBtnsEl, "v", v);
  }
  if (wiperBtnsEl) {
    wiperBtnsEl.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.dataset.v !== undefined) setWiper(+t.dataset.v);
    });
  }

  const seasonBtnsEl = q<HTMLDivElement>(".wander-season-btns");
  function setSeason(s: string) {
    if (s === "auto") state.seasonMode = "auto";
    else {
      state.seasonMode = "manual";
      state.seasonTarget = +s;
    }
    markOn(seasonBtnsEl, "s", s);
  }
  seasonBtnsEl.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.dataset.s !== undefined) setSeason(t.dataset.s);
  });

  const wxBtnsEl = q<HTMLDivElement>(".wander-wx-btns");
  wxBtnsEl.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.dataset.w !== undefined) {
      state.weatherMode = t.dataset.w;
      markOn(wxBtnsEl, "w", state.weatherMode);
    }
  });

  const qualBtnsEl = q<HTMLDivElement>(".wander-qual-btns");
  qualBtnsEl.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.dataset.q !== undefined) {
      state.quality = +t.dataset.q;
      markOn(qualBtnsEl, "q", state.quality);
      cb.onQualityChange();
    }
  });

  const timeScaleEl = q<HTMLInputElement>(".wander-time-scale");
  const timeScaleValEl = q<HTMLSpanElement>(".wander-time-scale-val");
  timeScaleEl.addEventListener("input", (e) => {
    state.timeScale = +(e.target as HTMLInputElement).value;
    timeScaleValEl.textContent = state.timeScale + "×";
  });

  const volEl = q<HTMLInputElement>(".wander-vol");
  const volValEl = q<HTMLSpanElement>(".wander-vol-val");
  volEl.addEventListener("input", (e) => {
    state.vol = +(e.target as HTMLInputElement).value;
    /* moving the slider is an unmute: otherwise it does nothing and looks
       broken */
    state.muted = false;
    volValEl.textContent = String(Math.round(state.vol * 100));
    cb.onVolumeChange();
  });

  const seedValEl = q<HTMLSpanElement>(".wander-seed-val");
  seedValEl.textContent = String(seed);
  q<HTMLAnchorElement>(".wander-new-seed").addEventListener("click", () => {
    window.location.search = "?seed=" + ((Math.random() * 1e9) | 0);
  });

  const speedEl = q<HTMLDivElement>(".wander-speed"),
    seasonChipEl = q<HTMLDivElement>(".wander-season-chip"),
    clockChipEl = q<HTMLDivElement>(".wander-clock-chip"),
    wxChipEl = q<HTMLDivElement>(".wander-wx-chip"),
    biomeChipEl = q<HTMLDivElement>(".wander-biome-chip"),
    driftChipEl = q<HTMLDivElement>(".wander-drift-chip");

  /* HUD text is rewritten at ~8 Hz, not per frame: a speed readout that
     changes 144 times a second is unreadable, and each write is layout. */
  let hudNext = 0;
  function updateHUD(t: number) {
    if (t < hudNext) return;
    hudNext = t + 0.12;
    speedEl.textContent = String(Math.round(Math.abs(car.speed) * 3.6));

    if (driftChipEl) {
      if (car.isDrifting) {
        driftChipEl.style.display = "inline-block";
        driftChipEl.textContent = `DRIFT ${Math.round(Math.abs(car.slipAngle || 0))}°`;
      } else {
        driftChipEl.style.display = "none";
      }
    }

    /* the dominant biome, not a blend: this is a label, and "62% Badlands"
       is not a thing anyone wants to read at 200 km/h */
    const bn = getBiomeName();
    if (biomeChipEl.textContent !== bn) biomeChipEl.textContent = bn;
    const si = Math.floor(state.phase) % 4;
    seasonChipEl.textContent = SEASON_EMOJI[si] + " " + SEASON_NAMES[si];
    const hrs = state.tod * 24;
    const h = Math.floor(hrs),
      m = Math.floor((hrs - h) * 60);
    clockChipEl.textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
    /* most specific condition wins */
    let icon = "☀️";
    if (env.night > 0.5) icon = "🌙";
    if (wx.cloud > 0.5) icon = "⛅";
    if (wx.fog > 0.5) icon = "🌫️";
    if (wx.rain > 0.25) icon = wx.snowMode ? "❄️" : "🌧️";
    wxChipEl.textContent = icon;
  }

  const startEl = q<HTMLDivElement>(".wander-start");
  const coverEl = q<HTMLDivElement>(".wander-cover");
  const helpEl = q<HTMLDivElement>(".wander-help");

  function wireStart(setT: (fn: () => void, ms: number) => void) {
    q<HTMLButtonElement>(".wander-start-btn").addEventListener("click", () => {
      state.started = true;
      cb.onStart();
      setAuto(true);
      setCam(0);
      startEl.style.transition = "opacity .8s ease";
      startEl.style.opacity = "0";
      setT(() => startEl.classList.add("wander-hidden"), 850);
      setT(() => {
        helpEl.style.opacity = "0";
      }, 14000);
    });
    /* the cover is a plain black sheet over the first frames, so the scene
       is never seen mid-warm-up */
    setT(() => {
      coverEl.style.opacity = "0";
    }, 700);
    setT(() => coverEl.classList.add("wander-hidden"), 2500);
  }

  return { setAuto, setCam, setSeason, setWiper, togglePanel, updateHUD, wireStart };
}

export type UI = ReturnType<typeof createUI>;
