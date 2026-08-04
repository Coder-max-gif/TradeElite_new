/**
 * Returns the live value driven by the shared price engine tick.
 *
 * Historically this hook overlaid a random offset on a per-widget timer to make
 * static values look alive. Financial values are now genuinely recomputed from
 * the single price cycle, so every widget must display the exact same number —
 * no per-widget offsets or extra timers. The signature is kept so call sites
 * are unchanged.
 */
export function useAnimatedValue(baseValue: number, _range = 4, _interval = 1800) {
  return baseValue;
}
