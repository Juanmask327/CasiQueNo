// dealers.js
const DEALERS = {
  purista: {
    id: 'purista', name: 'El Purista',
    flavor: 'Juega con las reglas más justas del libro. Se planta en 17, sin trucos.',
    hitSoft17: false, blackjackPayout: 1.5, doubleAfterSplit: true, surrenderAllowed: true,
  },
  estratega: {
    id: 'estratega', name: 'El Estratega',
    flavor: 'Pide carta hasta con un As blando en 17. Calculador y frío.',
    hitSoft17: true, blackjackPayout: 1.5, doubleAfterSplit: true, surrenderAllowed: false,
  },
  tiburon: {
    id: 'tiburon', name: 'El Tiburón',
    flavor: 'Todas las reglas a su favor. Con este dealer, la casa se lleva más.',
    hitSoft17: true, blackjackPayout: 1.2, doubleAfterSplit: false, surrenderAllowed: false,
  },
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEALERS };
}