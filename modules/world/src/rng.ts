/**
 * Small deterministic PRNG (Park-Miller). Used anywhere a visual needs a
 * "random-looking" but stable layout (particle field, dust burst spread)
 * so nothing pops or reshuffles across re-renders / hot reload.
 */
export function makeSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
