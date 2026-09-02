import { GEAR_TOPS, MAX_SPEED } from "./config";
import { clamp } from "./math";
import type { CarState, EnvState, WanderState, WeatherState } from "./types";

/*
 * All sound is synthesised. There are no audio files anywhere in this project.
 *
 * The engine is three detuned oscillators through a lowpass whose cutoff
 * tracks rpm, which is the cheap trick that makes a sawtooth read as an
 * engine instead of a buzzer. Rpm itself comes from an 8-speed gearbox
 * mapped over road speed, so the pitch resets on each shift the way a real
 * one does. Wind and rain are the same white-noise buffer through different
 * filters.
 *
 * Nothing starts until the user clicks: browsers suspend an AudioContext
 * created without a gesture, and a suspended context that is never resumed is
 * silent forever.
 */
export function createAudio(
  state: WanderState,
  car: CarState,
  wx: WeatherState,
  env: EnvState,
  getThrottle: () => number,
  isWiperSweep?: () => boolean
) {
  let AC: AudioContext | null = null;
  let master: GainNode | null = null;
  let cabinFilter: BiquadFilterNode | null = null;
  let engOsc: OscillatorNode | null = null,
    engOsc2: OscillatorNode | null = null,
    engSub: OscillatorNode | null = null,
    engFil: BiquadFilterNode | null = null,
    engGain: GainNode | null = null;
  let exhFil: BiquadFilterNode | null = null,
    exhGain: GainNode | null = null;
  let windGain: GainNode | null = null,
    rainGain: GainNode | null = null;
  let engShiftT = 0,
    engGearPrev = 0,
    birdNext = 0,
    rainClickNext = 0;

  function init() {
    if (AC) return;
    try {
      AC = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return;
    }
    master = AC.createGain();
    master.gain.value = state.muted ? 0 : state.vol * 0.9;
    /* compressor on the bus: the engine, wind and a bird chirp can all peak
       together and the sum clips without it */
    const comp = AC.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(AC.destination);

    engFil = AC.createBiquadFilter();
    engFil.type = "lowpass";
    engFil.frequency.value = 260;
    engFil.Q.value = 0.6;
    engGain = AC.createGain();
    engGain.gain.value = 0;
    engOsc = AC.createOscillator();
    engOsc.type = "sawtooth";
    engOsc.frequency.value = 62;
    engOsc2 = AC.createOscillator();
    engOsc2.type = "sawtooth";
    engOsc2.frequency.value = 93;
    const o2G = AC.createGain();
    o2G.gain.value = 0.45;
    engSub = AC.createOscillator();
    engSub.type = "sine";
    engSub.frequency.value = 31;
    const subG = AC.createGain();
    subG.gain.value = 0.7;
    engOsc.connect(engFil);
    engOsc2.connect(o2G);
    o2G.connect(engFil);
    engSub.connect(subG);
    subG.connect(engFil);
    cabinFilter = AC.createBiquadFilter();
    cabinFilter.type = "lowpass";
    cabinFilter.frequency.value = 20000;
    cabinFilter.Q.value = 0.7;
    cabinFilter.connect(master);

    engFil.connect(engGain);
    engGain.connect(cabinFilter);
    engOsc.start();
    engOsc2.start();
    engSub.start();

    /* one 2 s noise buffer, shared by wind, rain and exhaust at different
       playback rates and through different filters */
    const len = AC.sampleRate * 2;
    const buf = AC.createBuffer(1, len, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const windSrc = AC.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;
    const windFil = AC.createBiquadFilter();
    windFil.type = "bandpass";
    windFil.frequency.value = 420;
    windFil.Q.value = 0.35;
    windGain = AC.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFil);
    windFil.connect(windGain);
    windGain.connect(cabinFilter);
    windSrc.start();

    const rainSrc = AC.createBufferSource();
    rainSrc.buffer = buf;
    rainSrc.loop = true;
    rainSrc.playbackRate.value = 0.86;
    const rainFil = AC.createBiquadFilter();
    rainFil.type = "highpass";
    rainFil.frequency.value = 2600;
    rainGain = AC.createGain();
    rainGain.gain.value = 0;
    rainSrc.connect(rainFil);
    rainFil.connect(rainGain);
    rainGain.connect(master);
    rainSrc.start();

    const exhSrc = AC.createBufferSource();
    exhSrc.buffer = buf;
    exhSrc.loop = true;
    exhSrc.playbackRate.value = 0.6;
    exhFil = AC.createBiquadFilter();
    exhFil.type = "bandpass";
    exhFil.frequency.value = 760;
    exhFil.Q.value = 0.9;
    exhGain = AC.createGain();
    exhGain.gain.value = 0;
    exhSrc.connect(exhFil);
    exhFil.connect(exhGain);
    exhGain.connect(cabinFilter);
    exhSrc.start();
  }

  /* A short burst of pitch-bent sines, panned randomly. Not a recording of a
     bird; just enough contour that the ear files it as one. */
  function chirp() {
    if (!AC || !master) return;
    const t0 = AC.currentTime + 0.02;
    const notes = 2 + ((Math.random() * 4) | 0);
    const pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
    const out = pan || master;
    if (pan) {
      pan.pan.value = Math.random() * 1.6 - 0.8;
      pan.connect(master);
    }
    for (let i = 0; i < notes; i++) {
      const t = t0 + i * (0.12 + Math.random() * 0.06);
      const o = AC.createOscillator(),
        g = AC.createGain();
      o.type = "sine";
      const f = 2100 + Math.random() * 1700;
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * (1.12 + Math.random() * 0.3), t + 0.05);
      o.frequency.exponentialRampToValueAtTime(f * 0.88, t + 0.1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.035, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + 0.14);
    }
  }

  /* Cozy, tactile rain clicks on glass and roof when inside the cockpit */
  function rainClick() {
    if (!AC || !master || state.muted) return;
    const t = AC.currentTime;
    const o = AC.createOscillator();
    const g = AC.createGain();
    const f = 1600 + Math.random() * 1400;
    o.type = "sine";
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.35, t + 0.015);
    g.gain.setValueAtTime(0.014 + Math.random() * 0.018, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
    const pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
    if (pan) {
      pan.pan.value = Math.random() * 1.4 - 0.7;
      o.connect(g);
      g.connect(pan);
      pan.connect(master);
    } else {
      o.connect(g);
      g.connect(master);
    }
    o.start(t);
    o.stop(t + 0.022);
  }

  /* Wiper blade glide on glass with soft mechanical motor thud */
  function wiperSweepSound() {
    if (!AC || !master || state.muted) return;
    const t = AC.currentTime;
    const len = (AC.sampleRate * 0.16) | 0;
    const buf = AC.createBuffer(1, len, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = AC.createBufferSource();
    src.buffer = buf;
    const fil = AC.createBiquadFilter();
    fil.type = "bandpass";
    fil.frequency.value = 650;
    fil.Q.value = 1.8;
    const g = AC.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.035);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    src.connect(fil);
    fil.connect(g);
    g.connect(master);
    src.start(t);

    const thump = AC.createOscillator();
    const tg = AC.createGain();
    thump.type = "triangle";
    thump.frequency.setValueAtTime(52, t);
    thump.frequency.exponentialRampToValueAtTime(28, t + 0.045);
    tg.gain.setValueAtTime(0.03, t);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    thump.connect(tg);
    tg.connect(master);
    thump.start(t);
    thump.stop(t + 0.05);
  }

  function update() {
    if (!AC || AC.state !== "running" || !engOsc || !engOsc2 || !engSub || !engFil || !engGain || !exhFil || !exhGain || !windGain || !rainGain) return;
    const t = AC.currentTime,
      sp = Math.abs(car.speed),
      th = Math.max(getThrottle(), state.auto ? 0.4 : 0);

    /* Acoustic cabin filter: warm, insulated lowpass when in cockpit (mode 2) */
    const inCockpit = state.camMode === 2;
    if (cabinFilter) {
      cabinFilter.frequency.setTargetAtTime(inCockpit ? 880 : 20000, t, 0.08);
    }

    /* Trigger wiper squeak sound if cue popped from windshield */
    if (isWiperSweep && isWiperSweep()) {
      wiperSweepSound();
    }

    /* Cabin rain clicks */
    if (inCockpit && wx.rain > 0.04 && t > rainClickNext) {
      rainClick();
      rainClickNext = t + (0.02 + Math.random() * (0.08 / Math.max(wx.rain, 0.1)));
    }

    /* rpm follows an 8-speed gearbox; shifts briefly dip the throttle */
    let g = 0;
    while (g < GEAR_TOPS.length - 1 && sp > GEAR_TOPS[g]) g++;
    const lo = g === 0 ? 0 : GEAR_TOPS[g - 1];
    const rpm = 1050 + clamp((sp - lo) / (GEAR_TOPS[g] - lo), 0, 1) * 5300;
    if (g !== engGearPrev) {
      engShiftT = t;
      engGearPrev = g;
    }
    const shiftDip = Math.max(0, 1 - (t - engShiftT) / 0.13);
    const fire = (rpm / 60) * 4; // V8 firing frequency
    /* setTargetAtTime everywhere, never setValueAtTime: an instant frequency
       jump on a running oscillator is an audible click */
    engOsc.frequency.setTargetAtTime(fire, t, 0.04);
    engOsc2.frequency.setTargetAtTime(fire * 1.5 + 2, t, 0.04);
    engSub.frequency.setTargetAtTime(fire * 0.5, t, 0.04);
    engFil.frequency.setTargetAtTime(320 + rpm * 0.42 + th * 260, t, 0.08);
    const moving = sp > 0.3 || th > 0;
    const load = 0.35 + 0.65 * Math.abs(th);
    let eg = moving ? 0.03 + 0.05 * (rpm / 6350) + 0.045 * load * Math.min(sp / 12, 1) : 0.03;
    eg *= 1 - shiftDip * 0.4;
    engGain.gain.setTargetAtTime(eg, t, 0.12);
    /* overrun burble: noise on a closed throttle at high rpm */
    const burble = th < 0.05 && rpm > 3000 ? 0.018 + 0.014 * Math.random() : 0;
    exhGain.gain.setTargetAtTime(0.012 * load * Math.min(sp / 10, 1) + burble, t, 0.1);
    exhFil.frequency.setTargetAtTime(500 + rpm * 0.22, t, 0.1);

    const windMul = inCockpit ? 0.35 : 1.0;
    const rainMul = inCockpit ? 0.4 : 1.0;
    windGain.gain.setTargetAtTime((Math.pow(sp / MAX_SPEED, 2) * 0.42 + wx.rain * 0.02) * windMul, t, 0.2);
    rainGain.gain.setTargetAtTime(wx.rain * (wx.snowMode ? 0.015 : 0.2) * rainMul, t, 0.4);
    /* birds in spring and summer daylight only */
    const si = Math.floor(state.phase) % 4;
    if ((si === 0 || si === 1) && env.daylight > 0.55 && state.simT > birdNext) {
      if (Math.random() < 0.65) chirp();
      birdNext = state.simT + 2.5 + Math.random() * 7;
    }
  }

  function setVolume() {
    if (master && AC) master.gain.setTargetAtTime(state.muted ? 0 : state.vol * 0.9, AC.currentTime, 0.05);
  }

  function toggleMute() {
    state.muted = !state.muted;
    setVolume();
  }

  function resume() {
    if (AC && AC.state === "suspended") AC.resume();
  }

  return {
    init,
    update,
    setVolume,
    toggleMute,
    resume,
    dispose() {
      if (AC) AC.close();
      AC = null;
    },
  };
}

export type Audio = ReturnType<typeof createAudio>;
