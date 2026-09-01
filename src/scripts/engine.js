/**
 * engine.js — Lógica pura del juego.
 * Funciones puras, sin referencias a DOM ni a UI.
 * Importable desde Node.js para simulaciones y tests.
 */

// En Electron renderer con nodeIntegration, 'require' existe pero SYMBOLS ya está
// en el scope global porque paytable.js se cargó vía <script> antes que este archivo.
// Para Node.js puro (npm run sim), usamos require().
//
// Estrategia: si SYMBOLS ya existe globalmente (browser/renderer), usarlo;
// si no, intentar require (Node.js puro).
let _SYMBOLS, _TOTAL_WEIGHT;
if (typeof SYMBOLS !== 'undefined' && typeof TOTAL_WEIGHT !== 'undefined') {
  // Renderer process: las variables ya están globales por el <script> de paytable.js
  _SYMBOLS = SYMBOLS;
  _TOTAL_WEIGHT = TOTAL_WEIGHT;
} else if (typeof require !== 'undefined') {
  // Node.js puro (simulación por consola)
  const pt = require('./paytable.js');
  _SYMBOLS = pt.SYMBOLS;
  _TOTAL_WEIGHT = pt.TOTAL_WEIGHT;
}

/**
 * Selecciona un símbolo respetando los pesos acumulados.
 * Genera un número entre 1 y TOTAL_WEIGHT y mapea al símbolo correspondiente.
 * @returns {Object} símbolo seleccionado (referencia al objeto en SYMBOLS)
 */
function weightedRandomSymbol() {
  const roll = Math.floor(Math.random() * _TOTAL_WEIGHT) + 1; // 1..31
  let cumulative = 0;
  for (const symbol of _SYMBOLS) {
    cumulative += symbol.weight;
    if (roll <= cumulative) {
      return symbol;
    }
  }
  // Fallback (no debería alcanzarse)
  return _SYMBOLS[_SYMBOLS.length - 1];
}

/**
 * Realiza una tirada de 3 rodillos.
 * @returns {Object[]} array de 3 símbolos
 */
function spin() {
  return [
    weightedRandomSymbol(),
    weightedRandomSymbol(),
    weightedRandomSymbol()
  ];
}

/**
 * Evalúa el resultado de una tirada.
 * @param {Object[]} reels - Array de 3 símbolos (resultado de spin())
 * @param {number} bet - Monto apostado
 * @returns {{ won: boolean, payout: number, type: 'triple'|'pair'|'none', symbol: Object|null }}
 */
function evaluateResult(reels, bet) {
  const [r0, r1, r2] = reels;

  // 3 iguales → triple
  if (r0.id === r1.id && r1.id === r2.id) {
    return {
      won: true,
      payout: r0.payTriple * bet,
      type: 'triple',
      symbol: r0
    };
  }

  // Par (2 símbolos iguales, cualquier símbolo)
  // Verificar los 3 posibles pares
  const pairCandidates = [
    { sym: r0, positions: [0, 1], other: 2, match: r0.id === r1.id },
    { sym: r0, positions: [0, 2], other: 1, match: r0.id === r2.id },
    { sym: r1, positions: [1, 2], other: 0, match: r1.id === r2.id },
  ];

  for (const candidate of pairCandidates) {
    if (candidate.match && candidate.sym.payPair !== null && candidate.sym.payPair !== undefined) {
      return {
        won: true,
        payout: candidate.sym.payPair * bet,
        type: 'pair',
        symbol: candidate.sym,
        pairPositions: candidate.positions
      };
    }
  }

  // Sin premio
  return {
    won: false,
    payout: 0,
    type: 'none',
    symbol: null
  };
}

/**
 * Simulación de N tiradas para verificar el RTP empírico.
 * No forma parte de la UI final; usar en consola o tests.
 *
 * Ejemplo de uso:
 *   node -e "const {runSimulation} = require('./src/scripts/engine.js'); console.log(runSimulation(1000000))"
 *
 * @param {number} iterations - Número de tiradas a simular
 * @param {number} [bet=1] - Apuesta por tirada (afecta payout, no el RTP)
 * @returns {{ rtp: number, iterations: number, wins: number, totalWagered: number, totalPayout: number }}
 */
function runSimulation(iterations = 1_000_000, bet = 1) {
  let totalWagered = 0;
  let totalPayout = 0;
  let wins = 0;
  let triples = 0;
  let pairs = 0;

  for (let i = 0; i < iterations; i++) {
    const reels = spin();
    const result = evaluateResult(reels, bet);
    totalWagered += bet;
    totalPayout += result.payout;
    if (result.won) {
      wins++;
      if (result.type === 'triple') triples++;
      if (result.type === 'pair') pairs++;
    }
  }

  return {
    rtp: totalPayout / totalWagered,
    iterations,
    wins,
    triples,
    pairs,
    totalWagered,
    totalPayout,
    houseEdge: 1 - (totalPayout / totalWagered)
  };
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { weightedRandomSymbol, spin, evaluateResult, runSimulation };
}
