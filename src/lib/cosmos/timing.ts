// The scene was written against a fixed 60Hz step: every easing in it was
// a bare per-frame constant like `x += (target - x) * 0.08`, and `clock`
// advanced by a hardcoded 0.016 regardless of how long the frame actually
// took. That is only correct on exactly one display. On a 120Hz ProMotion
// panel every one of those lerps ran twice as often, so the whole scene -
// orbits, the pulsar's beat, the camera's approach - played at double
// speed; on a loaded machine dropping to 30fps it played at half.
//
// The fix is the standard one: measure the real frame time and reshape
// each constant around it.
//
// REFERENCE_STEP is the step those constants were originally tuned at, and
// is the unit `easeFactor` converts *from* - so an existing 0.08 keeps
// meaning exactly what it always meant at 60Hz, and now means the same
// thing everywhere else too.
export const REFERENCE_STEP = 1 / 60;

// Longest frame the scene will believe. A backgrounded tab, a stalled
// shader compile or a breakpoint can hand back a delta of seconds, and
// every consumer here integrates it - so without a ceiling, returning to
// the tab would teleport the camera and jump the planets through days of
// orbit in a single frame. Three frames' worth is enough headroom for an
// ordinary hitch and short enough that a real stall reads as a pause
// rather than a jump.
export const MAX_STEP = REFERENCE_STEP * 3;

// Converts a per-frame lerp constant into the equivalent for this frame's
// actual duration.
//
// An exponential lerp applied n times leaves (1-k)^n of the original
// error, so the amount that survives a given span of *time* is what has to
// stay fixed, not the amount that survives a frame. Solving
// (1-k')^1 = (1-k)^(dt/step) for k' gives this. At dt exactly equal to the
// reference step it returns k unchanged, which is what makes it a safe
// drop-in for every existing constant.
export function easeFactor(perFrame: number, dt: number): number {
  if (dt <= 0) return 0;
  if (perFrame <= 0) return 0;
  if (perFrame >= 1) return 1;
  return 1 - Math.pow(1 - perFrame, dt / REFERENCE_STEP);
}
