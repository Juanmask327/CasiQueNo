/**
 * chips.js — Fichas de casino compartidas por los 3 juegos.
 * Cada juego arranca con una cuota de 10.000 compuesta por estas fichas:
 * 4×500 + 3×1000 + 2×1500 + 1×2000. El jugador arma su apuesta clickeando
 * fichas (no hay input numérico de apuesta).
 */

const CHIP_VALUES = [500, 1000, 1500, 2000];
const STARTING_CHIP_COUNTS = { 500: 4, 1000: 3, 1500: 2, 2000: 1 };
const STARTING_BALANCE = Object.entries(STARTING_CHIP_COUNTS)
  .reduce((sum, [value, count]) => sum + Number(value) * count, 0); // 10.000

function fmtChips(n) {
  return '🪙 ' + Math.round(n).toLocaleString('es-ES');
}

/**
 * Renderiza los botones de fichas dentro de `container`.
 * Cada click en una ficha llama a onPick(value).
 */
function renderChipButtons(container, onPick) {
  container.innerHTML = '';
  CHIP_VALUES.forEach(value => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chip-btn chip-${value}`;
    btn.textContent = value >= 1000 ? (value / 1000) + 'K' : String(value);
    btn.setAttribute('aria-label', `Ficha de ${value}`);
    btn.addEventListener('click', () => onPick(value));
    container.appendChild(btn);
  });
}

if (typeof window !== 'undefined') {
  window.chips = { CHIP_VALUES, STARTING_CHIP_COUNTS, STARTING_BALANCE, fmtChips, renderChipButtons };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CHIP_VALUES, STARTING_CHIP_COUNTS, STARTING_BALANCE, fmtChips };
}
