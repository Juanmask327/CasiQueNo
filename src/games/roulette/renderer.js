/**
 * renderer.js — UI de la Ruleta (una sola bola, rueda europea).
 * El jugador arma el monto de cada apuesta clickeando fichas, elige un tipo de
 * apuesta (o un pleno), y puede colocar varias antes de girar. Wallet propio
 * (window.wallets.roulette) — independiente de los otros juegos.
 */

const rlWallet = window.wallets.roulette;
const WHEEL_SEGMENT_ANGLE = 360 / WHEEL_ORDER.length;
const SPIN_DURATION_MS = 4500;
const RESULT_HOLD_MS = 1800;

let rlBetAmount = 0;
let rlPlacedBets = []; // { type, number?, amount }
let rlDiscRotation = 0;
let rlBallRotation = 0;
let rlSpinning = false;

const rlEl = {
  balanceValue: document.getElementById('rl-balance-value'),
  betAmountDisplay: document.getElementById('rl-bet-amount-display'),
  chipRow: document.getElementById('rl-chip-row'),
  betClearBtn: document.getElementById('rl-bet-clear-btn'),
  placedBets: document.getElementById('rl-placed-bets'),
  spinBtn: document.getElementById('rl-spin-btn'),
  result: document.getElementById('rl-result'),
  history: document.getElementById('rl-history'),
  straightInput: document.getElementById('rl-straight-number'),
  ball: document.getElementById('rl-ball1'),
  wheel: document.getElementById('rl-wheel'),
  disc: document.getElementById('rl-wheel-disc'),
  ballOrbit: document.getElementById('rl-wheel-ball-orbit'),
  wheelOverlay: document.getElementById('rl-wheel-overlay'),
  wheelOverlaySlot: document.getElementById('rl-wheel-overlay-slot'),
};

function rlInit() {
  initWheel();
  updateRlBalanceDisplay(rlWallet.getBalance());
  rlWallet.onChange(updateRlBalanceDisplay);

  window.chips.renderChipButtons(rlEl.chipRow, addChipToAmount);
  rlEl.betClearBtn.addEventListener('click', () => {
    rlBetAmount = 0;
    updateRlBetAmountDisplay();
  });

  document.querySelectorAll('.rl-board .rl-bet-btn').forEach(btn => {
    btn.addEventListener('click', () => addBet({ type: btn.dataset.type, amount: rlBetAmount }));
  });

  document.getElementById('rl-straight-btn').addEventListener('click', () => {
    const n = parseInt(rlEl.straightInput.value, 10);
    if (isNaN(n) || n < 0 || n > 36) {
      rlEl.result.textContent = '⚠️ Ingresa un número entre 0 y 36';
      return;
    }
    addBet({ type: 'straight', number: n, amount: rlBetAmount });
  });

  rlEl.spinBtn.addEventListener('click', spinRoulette);
}

function updateRlBalanceDisplay(balance) {
  rlEl.balanceValue.textContent = balance.toLocaleString('es-ES');
}

function updateRlBetAmountDisplay() {
  rlEl.betAmountDisplay.textContent = window.chips.fmtChips(rlBetAmount);
}

function committedTotal() {
  return rlPlacedBets.reduce((s, b) => s + b.amount, 0);
}

function addChipToAmount(value) {
  const available = rlWallet.getBalance() - committedTotal() - rlBetAmount;
  if (value > available) return;
  rlBetAmount += value;
  updateRlBetAmountDisplay();
}

function addBet(bet) {
  if (bet.amount <= 0) {
    rlEl.result.textContent = '⚠️ Elige fichas para esta apuesta';
    return;
  }
  if (committedTotal() + bet.amount > rlWallet.getBalance()) {
    rlEl.result.textContent = '⚠️ Fichas insuficientes para esa apuesta';
    return;
  }
  rlPlacedBets.push(bet);
  renderPlacedBets();
}

function removeBet(index) {
  rlPlacedBets.splice(index, 1);
  renderPlacedBets();
}

function betLabel(bet) {
  const labels = {
    red: 'Rojo', black: 'Negro', even: 'Par', odd: 'Impar', low: '1-18', high: '19-36',
    dozen1: '1ª Docena', dozen2: '2ª Docena', dozen3: '3ª Docena',
    column1: 'Columna 1', column2: 'Columna 2', column3: 'Columna 3'
  };
  if (bet.type === 'straight') return `Pleno ${bet.number}`;
  return labels[bet.type] || bet.type;
}

function renderPlacedBets() {
  rlEl.placedBets.innerHTML = rlPlacedBets.map((b, i) =>
    `<span class="rl-chip" data-idx="${i}">${betLabel(b)} · ${window.chips.fmtChips(b.amount)} ✕</span>`
  ).join('');
  rlEl.placedBets.querySelectorAll('.rl-chip').forEach(chip => {
    chip.addEventListener('click', () => removeBet(parseInt(chip.dataset.idx, 10)));
  });
}

// ─── Rueda: construcción visual y animación ─────────────────────────────────
function initWheel() {
  const stops = WHEEL_ORDER.map((num, i) => {
    const c = colorOf(num);
    const color = c === 'red' ? '#c0392b' : c === 'black' ? '#111318' : '#1e8449';
    const start = (i * WHEEL_SEGMENT_ANGLE).toFixed(3);
    const end = ((i + 1) * WHEEL_SEGMENT_ANGLE).toFixed(3);
    return `${color} ${start}deg ${end}deg`;
  }).join(', ');
  rlEl.disc.style.background = `conic-gradient(from ${(-WHEEL_SEGMENT_ANGLE / 2).toFixed(3)}deg, ${stops})`;

  // El radio se calcula a partir del tamaño real del disco (que cambia entre
  // la rueda chica acoplada y la rueda grande a pantalla completa), así los
  // números siempre quedan bien ubicados sin importar el tamaño actual.
  const radius = rlEl.disc.clientWidth * 0.4;

  rlEl.disc.querySelectorAll('.rl-wheel-number').forEach(el => el.remove());
  WHEEL_ORDER.forEach((num, i) => {
    const angle = i * WHEEL_SEGMENT_ANGLE;
    const span = document.createElement('span');
    span.className = 'rl-wheel-number';
    // El span en sí solo ubica el punto (rotar + empujar al radio); el texto
    // adentro se centra sobre ese punto con translate(-50%,-50%) para que no
    // "arrastre" hacia una esquina y se mezcle con el número vecino.
    span.style.transform = `rotate(${angle}deg) translate(0, -${radius}px)`;
    const text = document.createElement('span');
    text.className = 'rl-wheel-number-text';
    text.textContent = num;
    span.appendChild(text);
    rlEl.disc.appendChild(span);
  });
}

/** Traslada la rueda al overlay de pantalla completa y la agranda. */
function expandWheelFullscreen() {
  rlEl.wheel.classList.add('rl-wheel--big');
  rlEl.wheelOverlaySlot.appendChild(rlEl.wheel);
  rlEl.wheelOverlay.classList.add('visible');
  // Esperar a que el nuevo tamaño se aplique (2 frames) antes de recalcular
  // la posición de los números para el radio más grande.
  requestAnimationFrame(() => requestAnimationFrame(initWheel));
}

/** Devuelve la rueda a su lugar normal, junto al marcador numérico. */
function collapseWheelFullscreen() {
  rlEl.wheelOverlay.classList.remove('visible');
  setTimeout(() => {
    rlEl.wheel.classList.remove('rl-wheel--big');
    rlEl.ball.parentElement.insertBefore(rlEl.wheel, rlEl.ball);
    initWheel();
  }, 500);
}

function mod360(deg) { return ((deg % 360) + 360) % 360; }

function nextRotation(current, targetDeg, extraTurns) {
  const adjust = mod360(mod360(current) - mod360(targetDeg));
  return current - extraTurns * 360 - adjust;
}

function spinWheelTo(winningNumber) {
  return new Promise(resolve => {
    const idx = WHEEL_ORDER.indexOf(winningNumber);
    const targetSliceAngle = idx * WHEEL_SEGMENT_ANGLE;

    rlDiscRotation = nextRotation(rlDiscRotation, -targetSliceAngle, 9);
    rlBallRotation = nextRotation(rlBallRotation, 0, 13);

    rlEl.disc.style.transform = `rotate(${rlDiscRotation}deg)`;
    rlEl.ballOrbit.style.transform = `rotate(${rlBallRotation}deg)`;

    setTimeout(resolve, SPIN_DURATION_MS);
  });
}

function resetWheelVisual() {
  rlDiscRotation = 0;
  rlBallRotation = 0;
  rlEl.disc.style.transition = 'none';
  rlEl.ballOrbit.style.transition = 'none';
  rlEl.disc.style.transform = 'rotate(0deg)';
  rlEl.ballOrbit.style.transform = 'rotate(0deg)';
  // Forzar reflow antes de restaurar la transición para el próximo giro
  rlEl.disc.getBoundingClientRect();
  rlEl.disc.style.transition = '';
  rlEl.ballOrbit.style.transition = '';

  // Por si se sale al lobby a mitad de un giro: devolver la rueda a su lugar
  // y ocultar el overlay de inmediato, sin transición.
  rlEl.wheelOverlay.classList.remove('visible');
  rlEl.wheel.classList.remove('rl-wheel--big');
  rlEl.ball.parentElement.insertBefore(rlEl.wheel, rlEl.ball);
  initWheel();
}

function ballColorClass(n) {
  const c = colorOf(n);
  return c === 'red' ? 'result-red' : c === 'black' ? 'result-black' : 'result-green';
}

async function spinRoulette() {
  if (rlSpinning) return;
  if (rlPlacedBets.length === 0) {
    rlEl.result.textContent = '⚠️ Coloca al menos una apuesta antes de girar';
    return;
  }
  const totalWagered = committedTotal();
  rlWallet.withdraw(totalWagered);
  rlSpinning = true;
  rlEl.spinBtn.disabled = true;
  rlEl.ball.classList.remove('result-red', 'result-black', 'result-green', 'settled');
  rlEl.ball.textContent = '–';

  expandWheelFullscreen();
  await new Promise(r => setTimeout(r, 60)); // dejar que el tamaño grande aplique antes de girar

  const result = spinWheel();
  await spinWheelTo(result.number);

  rlEl.ball.textContent = result.number;
  rlEl.ball.classList.add(ballColorClass(result.number), 'settled');

  let totalPayout = 0;
  const breakdown = rlPlacedBets.map(bet => {
    const r = evaluateBet(bet, bet.amount, result);
    totalPayout += r.payout;
    return { bet, r };
  });
  rlWallet.deposit(totalPayout);

  rlEl.result.innerHTML = `
    ${totalPayout > totalWagered ? '🎉' : totalPayout > 0 ? '➖' : '😔'}
    Total apostado: ${window.chips.fmtChips(totalWagered)} · Total recibido: ${window.chips.fmtChips(totalPayout)}
  `;

  addRouletteHistory(result, totalWagered, totalPayout);
  rlPlacedBets = [];
  renderPlacedBets();

  await new Promise(r => setTimeout(r, RESULT_HOLD_MS)); // mostrar el resultado en grande antes de volver
  collapseWheelFullscreen();

  rlEl.spinBtn.disabled = false;
  rlSpinning = false;
}

function addRouletteHistory(result, wagered, payout) {
  const item = document.createElement('div');
  item.className = 'history-item ' + (payout >= wagered ? 'history-win' : 'history-loss');
  const net = payout - wagered;
  item.innerHTML = `
    <span class="history-symbols">🎱${result.number}</span>
    <span class="history-result ${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+' : ''}${window.chips.fmtChips(net)}</span>
  `;
  rlEl.history.insertBefore(item, rlEl.history.firstChild);
  while (rlEl.history.children.length > 8) rlEl.history.removeChild(rlEl.history.lastChild);
}

function resetRouletteGame() {
  rlWallet.reset();
  rlBetAmount = 0;
  rlPlacedBets = [];
  rlSpinning = false;
  updateRlBetAmountDisplay();
  renderPlacedBets();
  rlEl.result.textContent = '';
  rlEl.history.innerHTML = '';
  rlEl.ball.classList.remove('result-red', 'result-black', 'result-green', 'settled');
  rlEl.ball.textContent = '–';
  rlEl.spinBtn.disabled = false;
  resetWheelVisual();
}

document.addEventListener('screen-changed', (e) => {
  if (e.detail.screen === 'roulette' && !rlEl.spinBtn.dataset.initialized) {
    rlInit();
    rlEl.spinBtn.dataset.initialized = 'true';
  }
  if (e.detail.previousScreen === 'roulette' && e.detail.screen === 'lobby') {
    resetRouletteGame();
  }
});
