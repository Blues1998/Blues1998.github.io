// Coarse device-capability tiering for the cosmos environment. Not exact
// science - hardwareConcurrency/deviceMemory are heuristics, not
// guarantees - but good enough to keep the effect scoped to what a
// device can plausibly sustain, without a runtime FPS-probing dance.
export type DeviceTier = "high" | "medium" | "low";

export interface StarfieldTierProfile {
  tier: DeviceTier;
  // [distant, mid, foreground] point counts.
  starCounts: [number, number, number];
  pixelRatioCap: number;
  parallax: boolean;
}

export function detectDeviceTier(): DeviceTier {
  if (typeof navigator === "undefined") return "medium";

  const cores = navigator.hardwareConcurrency || 4;
  // deviceMemory isn't on the Navigator type in lib.dom yet on some TS
  // targets, and Safari never implements it at all - treat as unknown.
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const coarsePointer = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const smallViewport = typeof window !== "undefined" && window.innerWidth < 900;

  if (coarsePointer || smallViewport) {
    return (mem !== undefined && mem <= 3) || cores <= 4 ? "low" : "medium";
  }

  return (mem !== undefined && mem <= 4) || cores <= 4 ? "medium" : "high";
}

export function getStarfieldProfile(tier: DeviceTier): StarfieldTierProfile {
  switch (tier) {
    case "high":
      return { tier, starCounts: [900, 400, 120], pixelRatioCap: 2, parallax: true };
    case "medium":
      return { tier, starCounts: [500, 220, 70], pixelRatioCap: 1.5, parallax: true };
    case "low":
      return { tier, starCounts: [220, 90, 0], pixelRatioCap: 1, parallax: false };
  }
}
