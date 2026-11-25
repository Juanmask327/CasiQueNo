/**
 * renderer.js — UI del Blackjack multijugador local (hotseat).
 * Usa engine.js (lógica pura) y dealers.js (personalidades) ya construidos,
 * y wallet propio (window.wallets.blackjack) — independiente de los otros juegos.
 */

const bjWallet = window.wallets.blackjack;

let bjShoe = createShoe(4);
let bjDealerHand = [];
let bjSelectedDealer = DEALERS.purista;
let bjNumPlayers = 1;
let bjBet = 0;
let bjPlayers = []; // [{ hands: [{cards, bet, done, result, isDoubled}], activeHandIdx }]
let bjCurrentPlayerIndex = 0;
let bjPhase = 'setup'; // setup | playerTurn | dealerTurn | settled

const bjEl = {
  setup: document.getElementById('bj-setup'),
  table: document.getElementById('bj-table'),
  dealerSelect: document.getElementById('bj-dealer-select'),
  playersCount: document.getElementById('bj-players-count'),
  startBtn: document.getElementById('bj-start-btn'),
  dealerName: document.getElementById('bj-dealer-name'),
  dealerHand: document.getElementById('bj-dealer-hand'),
  dealerTotal: document.getElementById('bj-dealer-total'),
  playersArea: document.getElementById('bj-players-area'),
  resultMsg: document.getElementById('bj-result-message'),
  balanceValue: document.getElementById('bj-balance-value'),
  betAmountDisplay: document.getElementById('bj-bet-amount-display'),
  chipRow: document.getElementById('bj-chip-row'),
  betClearBtn: document.getElementById('bj-bet-clear-btn'),
  dealBtn: document.getElementById('bj-deal-btn'),
  endBtn: document.getElementById('bj-end-btn'),
  actionButtons: document.getElementById('bj-action-buttons'),
  hitBtn: document.getElementById('bj-hit-btn'),
  standBtn: document.getElementById('bj-stand-btn'),
  doubleBtn: document.getElementById('bj-double-btn'),
  splitBtn: document.getElementById('bj-split-btn'),
};

function bjInit() {
  renderDealerSelect();
  updateBjBalanceDisplay(bjWallet.getBalance());
  bjWallet.onChange(updateBjBalanceDisplay);
  window.chips.renderChipButtons(bjEl.chipRow, addChipToBjBet);

  bjEl.startBtn.addEventListener('click', startBlackjackSession);
  document.getElementById('bj-players-dec').addEventListener('click', () => {
    bjNumPlayers = Math.max(1, bjNumPlayers - 1);
    bjEl.playersCount.textContent = bjNumPlayers;
  });
  document.getElementById('bj-players-inc').addEventListener('click', () => {
    const next = Math.min(4, bjNumPlayers + 1);
    if (bjBet * next > bjWallet.getBalance()) return;
    bjNumPlayers = next;
    bjEl.playersCount.textContent = bjNumPlayers;
  });
  bjEl.betClearBtn.addEventListener('click', () => {
    bjBet = 0;
    updateBjBetAmountDisplay();
  });
  bjEl.dealBtn.addEventListener('click', dealNewRound);
  bjEl.endBtn.addEventListener('click', endBlackjackSession);
  bjEl.hitBtn.addEventListener('click', () => playerAction('hit'));
  bjEl.standBtn.addEventListener('click', () => playerAction('stand'));
  bjEl.doubleBtn.addEventListener('click', () => playerAction('double'));
  bjEl.splitBtn.addEventListener('click', () => playerAction('split'));
}

function updateBjBalanceDisplay(balance) {
  bjEl.balanceValue.textContent = balance.toLocaleString('es-ES');
}

function updateBjBetAmountDisplay() {
  bjEl.betAmountDisplay.textContent = window.chips.fmtChips(bjBet);
}

function addChipToBjBet(value) {
  const newBet = bjBet + value;
  if (newBet * bjNumPlayers > bjWallet.getBalance()) return;
  bjBet = newBet;
  updateBjBetAmountDisplay();
}

function renderDealerSelect() {
  bjEl.dealerSelect.innerHTML = '';
  Object.values(DEALERS).forEach(d => {
    const card = document.createElement('div');
    card.className = 'bj-dealer-card' + (d.id === bjSelectedDealer.id ? ' selected' : '');
    card.innerHTML = `
      <div class="bj-dealer-title">${d.name}</div>
      <div class="bj-dealer-flavor">${d.flavor}</div>
      <div class="bj-dealer-stats">${d.hitSoft17 ? 'H17' : 'S17'} · BJ paga ${d.blackjackPayout === 1.5 ? '3:2' : '6:5'}</div>
    `;
    card.addEventListener('click', () => {
      bjSelectedDealer = d;
      renderDealerSelect();
    });
    bjEl.dealerSelect.appendChild(card);
  });
}

function startBlackjackSession() {
  bjEl.setup.classList.add('hidden');
  bjEl.table.classList.remove('hidden');
  bjEl.dealerName.textContent = bjSelectedDealer.name;
  bjEl.actionButtons.classList.add('hidden');
}

function dealNewRound() {
  if (bjBet <= 0) {
    bjEl.resultMsg.textContent = '⚠️ Elige tus fichas antes de repartir';
    return;
  }
  const totalNeeded = bjBet * bjNumPlayers;
  if (totalNeeded > bjWallet.getBalance()) {
    bjEl.resultMsg.textContent = '⚠️ Fichas insuficientes para todos los jugadores';
    return;
  }
  if (needsReshuffle(bjShoe, 4)) bjShoe = createShoe(4);

  bjWallet.withdraw(totalNeeded);
  bjEl.resultMsg.textContent = '';

  const { playerHands, dealerHand } = dealRound(bjShoe, bjNumPlayers);
  bjDealerHand = dealerHand;
  bjPlayers = playerHands.map(cards => ({
    hands: [{ cards, bet: bjBet, done: isBlackjack(cards), result: null, isDoubled: false }],
    activeHandIdx: 0
  }));
  bjCurrentPlayerIndex = 0;
  bjPhase = 'playerTurn';

  bjEl.dealBtn.classList.add('hidden');
  renderTable(true);
  advanceToNextPendingHand();
}

function getActivePlayer() { return bjPlayers[bjCurrentPlayerIndex]; }
function getActiveHand() {
  const p = getActivePlayer();
  return p ? p.hands[p.activeHandIdx] : null;
}

function advanceToNextPendingHand() {
  while (bjCurrentPlayerIndex < bjPlayers.length) {
    const p = bjPlayers[bjCurrentPlayerIndex];
    while (p.activeHandIdx < p.hands.length && p.hands[p.activeHandIdx].done) {
      p.activeHandIdx++;
    }
    if (p.activeHandIdx < p.hands.length) {
      bjEl.actionButtons.classList.remove('hidden');
      updateActionButtonsAvailability();
      renderTable(true);
      return;
    }
    bjCurrentPlayerIndex++;
  }
  // Todos los jugadores terminaron → turno del dealer
  bjEl.actionButtons.classList.add('hidden');
  playDealerTurn();
}

function updateActionButtonsAvailability() {
  const hand = getActiveHand();
  const canDouble = hand.cards.length === 2 && bjWallet.getBalance() >= hand.bet;
  const canSplit = isPair(hand.cards) && getActivePlayer().hands.length === 1 && bjWallet.getBalance() >= hand.bet;
  bjEl.doubleBtn.disabled = !canDouble;
  bjEl.splitBtn.disabled = !canSplit;
}

function playerAction(action) {
  const hand = getActiveHand();
  if (!hand || hand.done) return;

  if (action === 'hit') {
    hand.cards = hit(hand.cards, bjShoe);
    if (handValue(hand.cards).isBust) hand.done = true;
  } else if (action === 'stand') {
    hand.done = true;
  } else if (action === 'double') {
    bjWallet.withdraw(hand.bet);
    hand.bet *= 2;
    hand.isDoubled = true;
    hand.cards = hit(hand.cards, bjShoe);
    hand.done = true;
  } else if (action === 'split') {
    bjWallet.withdraw(hand.bet);
    const { handA, handB, autoStand } = split(hand.cards, bjShoe);
    const p = getActivePlayer();
    p.hands = [
      { cards: handA, bet: hand.bet, done: autoStand, result: null, isDoubled: false },
      { cards: handB, bet: hand.bet, done: autoStand, result: null, isDoubled: false }
    ];
  }

  renderTable(true);
  const stillHand = getActiveHand();
  if (!stillHand || stillHand.done) {
    advanceToNextPendingHand();
  } else {
    updateActionButtonsAvailability();
  }
}

function playDealerTurn() {
  bjPhase = 'dealerTurn';
  bjDealerHand = dealerPlay(bjDealerHand, bjShoe, bjSelectedDealer);
  renderTable(false);
  settleRound();
}

function settleRound() {
  bjPhase = 'settled';
  let totalPayout = 0;
  bjPlayers.forEach(p => {
    p.hands.forEach(hand => {
      const r = settleHand(hand.cards, bjDealerHand, hand.bet, bjSelectedDealer);
      hand.result = r.result;
      totalPayout += r.payout;
    });
  });
  bjWallet.deposit(totalPayout);
  renderTable(false);
  bjEl.resultMsg.textContent = `Ronda terminada. Fichas: ${window.chips.fmtChips(bjWallet.getBalance())}`;
  bjEl.dealBtn.classList.remove('hidden');
}

// ─── Terminar partida / cambiar dealer ──────────────────────────────────────
function backToDealerSelect() {
  bjPlayers = [];
  bjDealerHand = [];
  bjCurrentPlayerIndex = 0;
  bjPhase = 'setup';
  bjBet = 0;
  updateBjBetAmountDisplay();
  bjEl.table.classList.add('hidden');
  bjEl.setup.classList.remove('hidden');
  bjEl.actionButtons.classList.add('hidden');
  bjEl.dealBtn.classList.remove('hidden');
  bjEl.resultMsg.textContent = '';
  renderDealerSelect();
}

function endBlackjackSession() {
  // Si hay manos sin resolver, se devuelve la apuesta (no se pierde por salir).
  if (bjPhase === 'playerTurn' || bjPhase === 'dealerTurn') {
    let refund = 0;
    bjPlayers.forEach(p => p.hands.forEach(hand => { if (hand.result === null) refund += hand.bet; }));
    if (refund > 0) bjWallet.deposit(refund);
  }
  backToDealerSelect();
}

function resetBlackjackGame() {
  bjShoe = createShoe(4);
  bjNumPlayers = 1;
  bjEl.playersCount.textContent = bjNumPlayers;
  bjSelectedDealer = DEALERS.purista;
  bjWallet.reset();
  backToDealerSelect();
}

// ─── Render ──────────────────────────────────────────────────────────────
function cardLabel(card, index = 0) {
  const redSuit = card.suit === '♥' || card.suit === '♦';
  const delay = (index * 0.15).toFixed(2);
  return `<div class="bj-card${redSuit ? ' red-suit' : ''}" style="animation-delay:${delay}s">${card.rank}${card.suit}</div>`;
}

function renderTable(hideHoleCard) {
  const cardsToShow = hideHoleCard ? [bjDealerHand[0]] : bjDealerHand;
  bjEl.dealerHand.innerHTML = cardsToShow.map((c, i) => cardLabel(c, i)).join('') +
    (hideHoleCard ? `<div class="bj-card back" style="animation-delay:${(cardsToShow.length * 0.15).toFixed(2)}s">?</div>` : '');
  bjEl.dealerTotal.textContent = hideHoleCard ? '' : `Total: ${handValue(bjDealerHand).total}`;

  bjEl.playersArea.innerHTML = '';
  bjPlayers.forEach((p, idx) => {
    p.hands.forEach((hand, hIdx) => {
      const box = document.createElement('div');
      const isActive = bjPhase === 'playerTurn' && idx === bjCurrentPlayerIndex && hIdx === p.activeHandIdx;
      box.className = 'bj-player-box' + (isActive ? ' active-turn' : '') +
        (hand.result === 'win' || hand.result === 'blackjack' ? ' player-result-win' : '') +
        (hand.result === 'lose' || hand.result === 'bust' ? ' player-result-lose' : '');
      const { total } = handValue(hand.cards);
      box.innerHTML = `
        <div class="bj-player-title">Jugador ${idx + 1}${p.hands.length > 1 ? ` (mano ${hIdx + 1})` : ''}</div>
        <div class="bj-hand">${hand.cards.map((c, i) => cardLabel(c, i)).join('')}</div>
        <div class="bj-total">Total: ${total} · Apuesta: ${window.chips.fmtChips(hand.bet)}</div>
        ${hand.result ? `<div class="bj-player-result">${resultLabel(hand.result)}</div>` : ''}
      `;
      bjEl.playersArea.appendChild(box);
    });
  });
}

function resultLabel(result) {
  const map = {
    win: '✅ Ganó', blackjack: '🎉 ¡Blackjack!', push: '➖ Empate',
    lose: '❌ Perdió', bust: '💥 Se pasó', surrender: '🏳️ Rendición'
  };
  return map[result] || result;
}

document.addEventListener('screen-changed', (e) => {
  if (e.detail.screen === 'blackjack' && !bjEl.startBtn.dataset.initialized) {
    bjInit();
    bjEl.startBtn.dataset.initialized = 'true';
  }
  if (e.detail.previousScreen === 'blackjack' && e.detail.screen === 'lobby') {
    resetBlackjackGame();
  }
});
