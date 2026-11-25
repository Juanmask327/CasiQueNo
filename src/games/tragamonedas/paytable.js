/**
 * paytable.js — Definición de símbolos, pesos y tabla de pagos.
 * RTP teórico calculado: 85.08% (house edge 14.92%) — ver npm run sim.
 * Las frutas comunes (sandía/naranja/cereza/limón) SÍ pagan por par, pero muy
 * poco (0.2×–0.4×, menos que la apuesta) — un "casi gano" frecuente que se
 * siente como victoria sin devolver mucho dinero. El RTP difícil (~85%) se
 * mantiene bajando los tríos de esas mismas frutas; los símbolos altos
 * (campana en adelante) no cambiaron. Frecuencia de victoria ~40%.
 * NO modificar pesos ni pagos sin recalcular el RTP (ver runSimulation en engine.js / sim.js).
 */

const SYMBOLS = [
  { id: 'sandia',    label: '🍉', weight: 14, payTriple: 12,  payPair: 0.2, color: '#2ecc71' },
  { id: 'naranja',   label: '🍊', weight: 12, payTriple: 14,  payPair: 0.25, color: '#e67e22' },
  { id: 'cereza',    label: '🍒', weight: 10, payTriple: 15,  payPair: 0.3, color: '#e74c3c' },
  { id: 'limon',     label: '🍋', weight: 8,  payTriple: 21,  payPair: 0.4, color: '#f1c40f' },
  { id: 'campana',   label: '🔔', weight: 6,  payTriple: 44,  payPair: 4,   color: '#e67e22' },
  { id: 'herradura', label: '🍀', weight: 5,  payTriple: 58,  payPair: 5,   color: '#27ae60' },
  { id: 'estrella',  label: '⭐', weight: 4,  payTriple: 90,  payPair: 6,   color: '#9b59b6' },
  { id: 'diamante',  label: '💎', weight: 2,  payTriple: 220, payPair: 12,  color: '#3498db' },
  { id: 'siete',     label: '7',  weight: 1,  payTriple: 460, payPair: 24,  color: '#e74c3c' },
];

// Derivar TOTAL_WEIGHT de SYMBOLS — no hardcodear en otro módulo
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0); // 62

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

  return expectedReturn; // ~0.9358 por apuesta unitaria
}

// Exportar para Node.js (engine.js) y para uso directo en browser via require
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SYMBOLS, TOTAL_WEIGHT, calculateTheoreticalRTP };
}