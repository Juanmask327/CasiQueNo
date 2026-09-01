/**
 * paytable.js — Definición de símbolos, pesos y tabla de pagos.
 * RTP teórico calculado: 94.48% (house edge 5.52%)
 * NO modificar pesos ni pagos sin recalcular el RTP.
 */

const SYMBOLS = [
  { id: 'cereza',   label: '🍒', weight: 10, payTriple: 5,   payPair: 0.6, color: '#e74c3c' },
  { id: 'limon',    label: '🍋', weight: 8,  payTriple: 7,   payPair: 0.8, color: '#f1c40f' },
  { id: 'campana',  label: '🔔', weight: 6,  payTriple: 12,  payPair: 1.2, color: '#e67e22' },
  { id: 'estrella', label: '⭐', weight: 4,  payTriple: 25,  payPair: 1.8, color: '#9b59b6' },
  { id: 'diamante', label: '💎', weight: 2,  payTriple: 60,  payPair: 3.5, color: '#3498db' },
  { id: 'siete',    label: '7',  weight: 1,  payTriple: 120, payPair: 7,   color: '#e74c3c' },
];

// Derivar TOTAL_WEIGHT de SYMBOLS — no hardcodear en otro módulo
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0); // 31

/**
 * Calcula el RTP teórico dado el conjunto de símbolos.
 * Útil para verificación matemática.
 */
function calculateTheoreticalRTP() {
  let expectedReturn = 0;
  const n = SYMBOLS.length;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        const si = SYMBOLS[i];
        const sj = SYMBOLS[j];
        const sk = SYMBOLS[k];
        const prob = (si.weight / TOTAL_WEIGHT) * (sj.weight / TOTAL_WEIGHT) * (sk.weight / TOTAL_WEIGHT);

        if (si.id === sj.id && sj.id === sk.id) {
          // Triple
          expectedReturn += prob * si.payTriple;
        } else if (si.id === sj.id && si.payPair && si.id !== sk.id) {
          expectedReturn += prob * si.payPair;
        } else if (si.id === sk.id && si.payPair && si.id !== sj.id) {
          expectedReturn += prob * si.payPair;
        } else if (sj.id === sk.id && sj.payPair && sj.id !== si.id) {
          expectedReturn += prob * sj.payPair;
        }
      }
    }
  }

  return expectedReturn; // ~0.9448 por apuesta unitaria
}

// Exportar para Node.js (engine.js) y para uso directo en browser via require
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SYMBOLS, TOTAL_WEIGHT, calculateTheoreticalRTP };
}
