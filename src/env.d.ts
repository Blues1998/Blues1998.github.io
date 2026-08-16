/// <reference types="astro/client" />

interface Window {
  // Set by the inline head guard and the module that binds it, so the
  // failsafe in BaseLayout can tell "the reveal never loaded" from "the
  // reveal loaded and chose not to run". See lib/arrive.ts.
  __arriveReady?: boolean;
  __arriveBound?: boolean;
  __terminalShortcutBound?: boolean;
}
