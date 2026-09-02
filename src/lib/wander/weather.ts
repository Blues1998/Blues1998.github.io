import type { Climate } from "./biomes";
import type { CarState, EnvState, Uniforms, WanderState, WeatherState } from "./types";

/*
 * Weather is a slow random walk between four states, with per-season odds.
 *
 * Nothing here is instantaneous: `rollWeather` only moves the *targets*, and
 * `update` approaches them at a rate that takes tens of seconds. Snow is not
 * its own state; it is rain re-labelled when the season is cold enough, which
 * is why a spring shower can turn to sleet without a transition.
 */
export function createWeather(state: WanderState, env: EnvState, U: Uniforms, climate: Climate, car: CarState) {
  const wx: WeatherState = { cloud: 0.28, rain: 0, fog: 0, tCloud: 0.28, tRain: 0, tFog: 0.04, next: 25, snowMode: false };
  const odds = [0, 0, 0, 0];
  /* Its own probe, sampled only when a roll happens (every 35-100 s), which
     is why weather can own this rather than depending on the environment
     module and creating a cycle between them. */
  const bio = climate.probe();

  function roll() {
    const si = Math.floor(state.phase) % 4;
    /* clear, cloudy, precip, fog — summer is mostly clear and almost never
       wet; autumn is the foggiest */
    const season = [
      [0.4, 0.24, 0.24, 0.12], // spring
      [0.6, 0.26, 0.04, 0.1], // summer
      [0.32, 0.26, 0.24, 0.18], // autumn
      [0.34, 0.24, 0.32, 0.1], // winter
    ][si];
    /* Season and biome each get a vote, multiplied then renormalised. Product
       rather than average because it takes both to agree: a desert winter is
       still dry, where averaging would have made it merely half wet. */
    const b = bio.at(car.x, car.z).weather;
    let total = 0;
    for (let i = 0; i < 4; i++) {
      odds[i] = season[i] * b[i];
      total += odds[i];
    }
    /* if the two vetoed everything (a salt-flat autumn wants both precip and
       fog at zero), fall back to the biome alone rather than dividing by 0 */
    if (total < 1e-6) {
      for (let i = 0; i < 4; i++) odds[i] = b[i];
      total = b[0] + b[1] + b[2] + b[3] || 1;
    }
    for (let i = 0; i < 4; i++) odds[i] /= total;

    let r = Math.random(),
      pick = 0;
    for (let i = 0; i < 4; i++) {
      r -= odds[i];
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    const q = Math.random();
    if (pick === 0) {
      wx.tCloud = 0.1 + 0.18 * q;
      wx.tRain = 0;
      wx.tFog = 0.03;
    } else if (pick === 1) {
      wx.tCloud = 0.52 + 0.3 * q;
      wx.tRain = 0;
      wx.tFog = 0.1;
    } else if (pick === 2) {
      wx.tCloud = 0.88;
      wx.tRain = 0.45 + 0.5 * q;
      wx.tFog = 0.3;
    } else {
      wx.tCloud = 0.45;
      wx.tRain = 0;
      wx.tFog = 0.6 + 0.35 * q;
    }
    wx.next = state.simT + 35 + Math.random() * 70;
  }

  function update(dt: number) {
    if (state.weatherMode === "clear") {
      wx.tCloud = 0.12;
      wx.tRain = 0;
      wx.tFog = 0.03;
    } else if (state.simT > wx.next) roll();
    const k = Math.min(1, dt * state.timeScale * 0.045);
    wx.cloud += (wx.tCloud - wx.cloud) * k;
    wx.rain += (wx.tRain - wx.rain) * k;
    wx.fog += (wx.tFog - wx.fog) * k;
    wx.snowMode = env.snow > 0.45;
    /* Road wetness lags the rain badly on purpose: tarmac stays shiny for a
       while after a shower stops, and never gets wet under snow. */
    const wet = wx.rain * (wx.snowMode ? 0 : 1);
    U.uWet.value += (wet - U.uWet.value) * Math.min(1, dt * 0.5);
  }

  return { wx, roll, update };
}

export type Weather = ReturnType<typeof createWeather>;
