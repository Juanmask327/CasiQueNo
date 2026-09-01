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


// ─── Estado del juego ───────────────────────────────────────────────────────
let balance = 1000;
let isSpinning = false;
let currentBet = 10;
const MIN_BET = 1;
const MAX_BET = 100;
const STARTING_BALANCE = 1000;

// ─── Referencias DOM ─────────────────────────────────────────────────────────
const balanceEl       = document.getElementById('balance-value');
const betInput        = document.getElementById('bet-input');
const betDecBtn       = document.getElementById('bet-dec');
const betIncBtn       = document.getElementById('bet-inc');
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
  // Inicializar rodillos con las imágenes de símbolos
  initReels(SYMBOLS);

  // Renderizar tabla de pagos
  renderPaytable();

  // Mostrar balance inicial
  updateBalanceDisplay(balance, false);

  // Configurar bet input
  betInput.value = currentBet;
  betInput.min = MIN_BET;
  betInput.max = MAX_BET;
}

// ─── Display de balance ──────────────────────────────────────────────────────
function updateBalanceDisplay(newBalance, animate = true) {
  if (animate) {
    animateBalance(balanceEl, balance, newBalance);
  } else {
    balanceEl.textContent = newBalance.toLocaleString('es-ES');
  }
  balance = newBalance;
  updateBetConstraints();
}

function updateBetConstraints() {
  const max = Math.min(MAX_BET, balance);
  betInput.max = max;
  if (currentBet > max) {
    currentBet = max;
    betInput.value = currentBet;
  }
  betDecBtn.disabled = currentBet <= MIN_BET;
  betIncBtn.disabled = currentBet >= max;
}

// ─── Control de apuesta ──────────────────────────────────────────────────────
betInput.addEventListener('input', () => {
  let val = parseInt(betInput.value, 10);
  if (isNaN(val) || val < MIN_BET) val = MIN_BET;
  if (val > Math.min(MAX_BET, balance)) val = Math.min(MAX_BET, balance);
  currentBet = val;
  betInput.value = val;
  updateBetConstraints();
});

betDecBtn.addEventListener('click', () => {
  if (currentBet > MIN_BET) {
    currentBet = Math.max(MIN_BET, currentBet - (currentBet >= 10 ? 5 : 1));
    betInput.value = currentBet;
    updateBetConstraints();
  }
});

betIncBtn.addEventListener('click', () => {
  const maxBet = Math.min(MAX_BET, balance);
  if (currentBet < maxBet) {
    currentBet = Math.min(maxBet, currentBet + (currentBet >= 10 ? 5 : 1));
    betInput.value = currentBet;
    updateBetConstraints();
  }
});

// ─── Giro principal ──────────────────────────────────────────────────────────
spinBtn.addEventListener('click', async () => {
  if (isSpinning) return;

  const bet = parseInt(betInput.value, 10);

  // Validaciones
  if (isNaN(bet) || bet < MIN_BET) {
    showError('Apuesta mínima: $' + MIN_BET);
    return;
  }
  if (bet > balance) {
    showError('Balance insuficiente');
    return;
  }
  if (bet > MAX_BET) {
    showError('Apuesta máxima: $' + MAX_BET);
    return;
  }

  // Iniciar tirada
  isSpinning = true;
  setUISpinning(true);
  clearWinGlow();
  hideMessages();

  // Descontar apuesta
  const balanceBefore = balance;
  balance -= bet;
  balanceEl.textContent = balance.toLocaleString('es-ES');

  // Calcular resultado (antes de animar para que la posición final sea correcta)
  const reels = spin();
  const result = evaluateResult(reels, bet);
  const targetIds = reels.map(r => r.id);

  // Animar rodillos
  await spinAllReels(targetIds, SYMBOLS);

  // Resultado: sumar pago
  const newBalance = balance + result.payout;
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
  if (newBalance < MIN_BET) {
    setTimeout(() => showGameOver(), 1500);
  }

  isSpinning = false;
  setUISpinning(false);
});

// ─── Helpers de UI ──────────────────────────────────────────────────────────
function setUISpinning(spinning) {
  spinBtn.disabled = spinning;
  spinBtn.classList.toggle('spinning', spinning);
  betDecBtn.disabled = spinning || currentBet <= MIN_BET;
  betIncBtn.disabled = spinning;
  betInput.disabled = spinning;

  if (spinning) {
    spinBtn.innerHTML = `<span class="spin-icon">⟳</span> Girando...`;
  } else {
    spinBtn.innerHTML = `<span class="spin-icon">▶</span> GIRAR`;
    updateBetConstraints();
  }
}

function showResult(result, bet) {
  resultMsg.className = 'result-message';
  payoutMsg.className = 'payout-message';

  if (result.type === 'triple') {
    resultMsg.textContent = `🎉 ¡TRÍO DE ${result.symbol.label.toUpperCase()}!`;
    resultMsg.classList.add('win-triple');
    payoutMsg.textContent = `+ $${result.payout.toLocaleString('es-ES')}`;
    payoutMsg.classList.add('show', 'payout-win');
  } else if (result.type === 'pair') {
    resultMsg.textContent = `✨ ¡PAR PREMIADO de ${result.symbol.label}!`;
    resultMsg.classList.add('win-pair');
    payoutMsg.textContent = `+ $${result.payout.toLocaleString('es-ES')}`;
    payoutMsg.classList.add('show', 'payout-win');
  } else {
    resultMsg.textContent = '😔 Sin premio esta vez';
    resultMsg.classList.add('no-win');
    payoutMsg.textContent = `- $${bet.toLocaleString('es-ES')}`;
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
  winOverlay.querySelector('.win-amount').textContent = `+ $${payout.toLocaleString('es-ES')}`;
  winOverlay.classList.add('visible');
  setTimeout(() => winOverlay.classList.remove('visible'), 3000);
}

function showGameOver() {
  gameOverScreen.classList.add('visible');
}

restartBtn.addEventListener('click', () => {
  balance = STARTING_BALANCE;
  currentBet = 10;
  betInput.value = currentBet;
  updateBalanceDisplay(STARTING_BALANCE, false);
  gameOverScreen.classList.remove('visible');
  hideMessages();
  clearWinGlow();
  historyList.innerHTML = '';
  initReels(SYMBOLS);
});

// ─── Historial ───────────────────────────────────────────────────────────────
function addHistory(reels, result, bet) {
  const item = document.createElement('div');
  item.className = 'history-item ' + (result.won ? 'history-win' : 'history-loss');

  const symbols = reels.map(r => r.label).join(' ');
  const payout = result.won ? `+$${result.payout}` : `-$${bet}`;

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

// ─── Arrancar ────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', init);
