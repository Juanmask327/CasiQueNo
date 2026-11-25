/**
 * renderer.js — Lógica de UI: eventos de botones, render de rodillos, estados de juego.
 * Se ejecuta en el renderer process de Electron (tiene acceso al DOM).
 */

// Soporte para Electron renderer con nodeIntegration Y para browser puro (testing)
let ipcRenderer = null;
try {
  if (typeof require !== 'undefined' && process && process.versions && process.versions.electron) {
    ipcRenderer = require('electron').ipcRenderer;
  }
} catch (e) {
  // No estamos en Electron — los controles de ventana no estarán disponibles
  console.warn('No Electron IPC disponible, corriendo en modo browser.');
}

const wallet = window.wallets.tragamonedas;

// ─── Estado del juego ───────────────────────────────────────────────────────
let isSpinning = false;
let currentBet = 0;

// ─── Referencias DOM ─────────────────────────────────────────────────────────
const balanceEl       = document.getElementById('balance-value');
const betAmountEl     = document.getElementById('bet-amount-display');
const chipRow         = document.getElementById('chip-row');
const betClearBtn     = document.getElementById('bet-clear-btn');
const spinBtn         = document.getElementById('spin-btn');
const resultMsg       = document.getElementById('result-message');
const payoutMsg       = document.getElementById('payout-message');
const paytableModal   = document.getElementById('paytable-modal');
const paytableBtn     = document.getElementById('paytable-btn');
const closeModalBtn   = document.getElementById('close-modal');
const restartBtn      = document.getElementById('restart-btn');
const gameOverScreen  = document.getElementById('game-over');
const winOverlay      = document.getElementById('win-overlay');
const historyList     = document.getElementById('history-list');

// ─── Controles de ventana ────────────────────────────────────────────────────
document.getElementById('btn-minimize').addEventListener('click', () => ipcRenderer && ipcRenderer.send('window-minimize'));
document.getElementById('btn-maximize').addEventListener('click', () => ipcRenderer && ipcRenderer.send('window-maximize'));
document.getElementById('btn-close').addEventListener('click', () => ipcRenderer && ipcRenderer.send('window-close'));


// ─── Inicialización ──────────────────────────────────────────────────────────
function init() {
  initReels(SYMBOLS);
  renderPaytable();
  renderRTPPanel();
  renderPrizesPanel();
  updateBalanceDisplay(wallet.getBalance(), false);
  window.chips.renderChipButtons(chipRow, addChipToBet);
  updateBetAmountDisplay();
}

// ─── Display de balance y apuesta ────────────────────────────────────────────
function updateBalanceDisplay(newBalance, animate = true) {
  if (animate) {
    animateBalance(balanceEl, wallet.getBalance(), newBalance);
  } else {
    balanceEl.textContent = newBalance.toLocaleString('es-ES');
  }
}

function updateBetAmountDisplay() {
  betAmountEl.textContent = window.chips.fmtChips(currentBet);
}

function addChipToBet(value) {
  if (isSpinning) return;
  if (currentBet + value > wallet.getBalance()) return;
  currentBet += value;
  updateBetAmountDisplay();
}

betClearBtn.addEventListener('click', () => {
  if (isSpinning) return;
  currentBet = 0;
  updateBetAmountDisplay();
});

// ─── Giro principal ──────────────────────────────────────────────────────────
spinBtn.addEventListener('click', async () => {
  if (isSpinning) return;

  const bet = currentBet;

  // Validaciones
  if (bet <= 0) {
    showError('Elige tus fichas antes de girar');
    return;
  }
  if (bet > wallet.getBalance()) {
    showError('Fichas insuficientes');
    return;
  }

  // Iniciar tirada
  isSpinning = true;
  setUISpinning(true);
  clearWinGlow();
  hideMessages();

  // Descontar apuesta
  wallet.withdraw(bet);
  balanceEl.textContent = wallet.getBalance().toLocaleString('es-ES');

  // Calcular resultado (antes de animar para que la posición final sea correcta)
  const reels = spin();
  const result = evaluateResult(reels, bet);
  const targetIds = reels.map(r => r.id);

  // Animar rodillos
  await spinAllReels(targetIds, SYMBOLS);

  // Resultado: sumar pago
  const newBalance = wallet.deposit(result.payout);
  updateBalanceDisplay(newBalance, result.won);

  // Mostrar resultado
  showResult(result, bet);

  // Agregar al historial
  addHistory(reels, result, bet);

  // Efectos visuales si ganó
  if (result.won) {
    const winIndices = getWinningIndices(result, reels);
    applyWinGlow(winIndices);

    if (result.type === 'triple') {
      showWinOverlay(result.payout);
    }
  }

  // Verificar game over
  if (newBalance <= 0) {
    setTimeout(() => showGameOver(), 1500);
  }

  isSpinning = false;
  setUISpinning(false);
});

// ─── Helpers de UI ──────────────────────────────────────────────────────────
function setUISpinning(spinning) {
  spinBtn.disabled = spinning;
  spinBtn.classList.toggle('spinning', spinning);
  betClearBtn.disabled = spinning;
  chipRow.classList.toggle('disabled', spinning);

  if (spinning) {
    spinBtn.innerHTML = `<span class="spin-icon">⟳</span> Girando...`;
  } else {
    spinBtn.innerHTML = `<span class="spin-icon">▶</span> GIRAR`;
  }
}

function showResult(result, bet) {
  resultMsg.className = 'result-message';
  payoutMsg.className = 'payout-message';

  if (result.type === 'triple') {
    resultMsg.textContent = `🎉 ¡TRÍO DE ${result.symbol.label.toUpperCase()}!`;
    resultMsg.classList.add('win-triple');
    payoutMsg.textContent = `+ ${window.chips.fmtChips(result.payout)}`;
    payoutMsg.classList.add('show', 'payout-win');
  } else if (result.type === 'pair') {
    resultMsg.textContent = `✨ ¡PAR PREMIADO de ${result.symbol.label}!`;
    resultMsg.classList.add('win-pair');
    payoutMsg.textContent = `+ ${window.chips.fmtChips(result.payout)}`;
    payoutMsg.classList.add('show', 'payout-win');
  } else {
    resultMsg.textContent = '😔 Sin premio esta vez';
    resultMsg.classList.add('no-win');
    payoutMsg.textContent = `- ${window.chips.fmtChips(bet)}`;
    payoutMsg.classList.add('show', 'payout-loss');
  }

  resultMsg.classList.add('show');
}

function hideMessages() {
  resultMsg.classList.remove('show', 'win-triple', 'win-pair', 'no-win');
  payoutMsg.classList.remove('show', 'payout-win', 'payout-loss');
  winOverlay.classList.remove('visible');
}

function showError(msg) {
  resultMsg.className = 'result-message error show';
  resultMsg.textContent = '⚠️ ' + msg;
  setTimeout(() => {
    resultMsg.classList.remove('show');
  }, 2500);
}

function getWinningIndices(result, reels) {
  if (result.type === 'triple') return [0, 1, 2];
  if (result.type === 'pair' && result.pairPositions) return result.pairPositions;
  return [];
}

function showWinOverlay(payout) {
  winOverlay.querySelector('.win-amount').textContent = `+ ${window.chips.fmtChips(payout)}`;
  winOverlay.classList.add('visible');
  setTimeout(() => winOverlay.classList.remove('visible'), 3000);
}

function showGameOver() {
  gameOverScreen.classList.add('visible');
}

function resetTragamonedasGame() {
  wallet.reset();
  currentBet = 0;
  updateBetAmountDisplay();
  updateBalanceDisplay(wallet.getBalance(), false);
  gameOverScreen.classList.remove('visible');
  hideMessages();
  clearWinGlow();
  historyList.innerHTML = '';
  initReels(SYMBOLS);
}

restartBtn.addEventListener('click', resetTragamonedasGame);

// ─── Historial ───────────────────────────────────────────────────────────────
function addHistory(reels, result, bet) {
  const item = document.createElement('div');
  item.className = 'history-item ' + (result.won ? 'history-win' : 'history-loss');

  const symbols = reels.map(r => r.label).join(' ');
  const amount = result.won ? result.payout : bet;
  const payout = result.won ? `+${window.chips.fmtChips(amount)}` : `-${window.chips.fmtChips(amount)}`;
  item.innerHTML = `
    <span class="history-symbols">${symbols}</span>
    <span class="history-result ${result.won ? 'pos' : 'neg'}">${payout}</span>
  `;

  historyList.insertBefore(item, historyList.firstChild);

  // Mantener máximo 8 entradas
  while (historyList.children.length > 8) {
    historyList.removeChild(historyList.lastChild);
  }
}

// ─── Tabla de pagos ──────────────────────────────────────────────────────────
paytableBtn.addEventListener('click', () => {
  paytableModal.classList.add('visible');
});

closeModalBtn.addEventListener('click', () => {
  paytableModal.classList.remove('visible');
});

paytableModal.addEventListener('click', (e) => {
  if (e.target === paytableModal) paytableModal.classList.remove('visible');
});

function renderPaytable() {
  const tbody = document.getElementById('paytable-body');
  tbody.innerHTML = '';

  SYMBOLS.forEach(sym => {
    const prob = ((sym.weight / TOTAL_WEIGHT) * 100).toFixed(1);
    const tripleProb = Math.pow(sym.weight / TOTAL_WEIGHT, 3) * 100;
    const tripleStr = tripleProb < 0.01 ? '<0.01' : tripleProb.toFixed(2);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="pt-symbol ${sym.id === 'siete' ? 'seven' : ''}">${sym.label}</span> ${sym.id.charAt(0).toUpperCase() + sym.id.slice(1)}</td>
      <td>${prob}%</td>
      <td>${sym.payTriple}×</td>
      <td>${sym.payPair !== null ? sym.payPair + '×' : '—'}</td>
      <td>${tripleStr}%</td>
    `;
       tbody.appendChild(row);
  });
}

// ─── Panel de RTP (lateral derecho) ─────────────────────────────────────────
function renderRTPPanel() {
  const rtp = calculateTheoreticalRTP();
  const houseEdge = 1 - rtp;

  document.getElementById('rtp-value').textContent = (rtp * 100).toFixed(2) + '%';
  document.getElementById('rtp-sub').textContent = `House edge: ${(houseEdge * 100).toFixed(2)}%`;
}

// ─── Panel de Premios (lateral derecho) ─────────────────────────────────────
function renderPrizesPanel() {
  const list = document.getElementById('prize-list');
  list.innerHTML = '';

  SYMBOLS.forEach((sym, idx) => {
    const item = document.createElement('div');
    const isJackpot = idx === SYMBOLS.length - 1;
    item.className = 'prize-item' + (isJackpot ? ' highlight' : '');
    item.innerHTML = `
      <span>${sym.label}${sym.label}${sym.label}</span>
      <span class="prize-mult${isJackpot ? ' jackpot' : ''}">×${sym.payTriple}</span>
    `;
    list.appendChild(item);
  });

  const divider = document.createElement('div');
  divider.className = 'prize-divider';
  list.appendChild(divider);

  const pairItem = document.createElement('div');
  pairItem.className = 'prize-item';
  pairItem.innerHTML = `<span>Cualquier Par</span><span class="prize-mult">Varía</span>`;
  list.appendChild(pairItem);
}

// ─── Atajos de teclado ───────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !isSpinning) {
    e.preventDefault();
    spinBtn.click();
  }
  if (e.code === 'Escape') {
    paytableModal.classList.remove('visible');
  }
});

// ─── Reinicio al salir al lobby ──────────────────────────────────────────────
document.addEventListener('screen-changed', (e) => {
  if (e.detail.previousScreen === 'tragamonedas' && e.detail.screen === 'lobby') {
    resetTragamonedasGame();
  }
});

// ─── Arrancar ────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', init);
