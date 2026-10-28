import WITH_DATA from '../data/addresses/index.js';

export const hasAddresses = (state) => WITH_DATA.includes(state);

// Loads one state's address points, so the popup reads about 50 KB instead of
// every state at once. The state is checked against the generated index before it
// becomes part of the path, and this dynamic import is the only one the no-network
// check allows: it can only reach files bundled under data/addresses/.
export async function loadAddresses(state) {
  if (!hasAddresses(state)) throw new Error(`No address data for ${state}. Run scripts/build-data.mjs.`);
  return (await import(`../data/addresses/${state}.js`)).default;
}
