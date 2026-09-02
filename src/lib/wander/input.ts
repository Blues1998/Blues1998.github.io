/*
 * Keyboard input.
 *
 * Held keys live in a Set polled by the simulation; one-shot keys fire
 * callbacks on keydown. Any steering or throttle key also drops autopilot,
 * because reaching for the controls is unambiguous intent to drive. Space is
 * excluded from that rule: braking is something you want to do *while* the
 * car drives itself.
 */
export interface InputActions {
  toggleAuto(): void;
  cycleCamera(): void;
  toggleMute(): void;
  resetCar(): void;
  togglePanel(): void;
  setSeason(s: string): void;
  disableAuto(): void;
  isAuto(): boolean;
  toggleWipers?(): void;
}

const DRIVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "];

export function createInput(actions: InputActions) {
  const keys = new Set<string>();

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === " ") e.preventDefault(); // or the page scrolls under the canvas
    keys.add(k);
    if (k === "t") actions.toggleAuto();
    if (k === "c") actions.cycleCamera();
    if (k === "v" && actions.toggleWipers) actions.toggleWipers();
    if (k === "m") actions.toggleMute();
    if (k === "r") actions.resetCar();
    if (k === "escape") actions.togglePanel();
    if (k >= "1" && k <= "4") actions.setSeason(String(+k - 1));
    if (k === "0") actions.setSeason("auto");
    if (DRIVE_KEYS.includes(k) && actions.isAuto() && k !== " ") actions.disableAuto();
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return {
    throttle: () => (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0),
    steer: () => (keys.has("a") || keys.has("arrowleft") ? 1 : 0) - (keys.has("d") || keys.has("arrowright") ? 1 : 0),
    braking: () => keys.has(" "),
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      keys.clear();
    },
  };
}

export type Input = ReturnType<typeof createInput>;
