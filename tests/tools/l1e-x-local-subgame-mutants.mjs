/* §7.1 正對照專用的突變鏈（只改測試副本引擎的 CHAINS 項目，不改產品檔）。
   winnerPaysZero：把該鏈的效果整組換成「持有者得標時實付 0」；inert：換成不做任何事的空鏈（用來示範拿掉突變）。 */
const ZERO_KEYS = ['flags', 'traits', 'hooks', 'army'];

function replaceEffects(G, chainId, effects) {
  const chain = G.CHAINS[chainId];
  if (!chain) throw new Error(`unknown chain ${chainId}`);
  for (const key of ZERO_KEYS) delete chain[key];
  Object.assign(chain, effects);
}

export function winnerPaysZero(G, chainId) {
  replaceEffects(G, chainId, { hooks: { onBidSettle(ctx) { if (ctx.isWinner) ctx.cost = 0; } } });
}

export function inert(G, chainId) {
  replaceEffects(G, chainId, { hooks: { onBidSettle() {} } });
}
