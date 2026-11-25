// engine.js — Blackjack (multijugador local / hotseat)
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS = ['♠','♥','♦','♣'];

function createShoe(numDecks = 4) {
  const shoe = [];
  for (let d = 0; d < numDecks; d++)
    for (const suit of SUITS)
      for (const rank of RANKS) shoe.push({ rank, suit });
  return shuffle(shoe);
}

function shuffle(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function needsReshuffle(shoe, numDecks = 4) { return shoe.length < (numDecks * 52 * 0.25); }
function drawCard(shoe) { return shoe.pop(); }

function rankValue(rank) {
  if (rank === 'A') return 11;
  if (['J','Q','K'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

function handValue(cards) {
  let total = cards.reduce((sum, c) => sum + rankValue(c.rank), 0);
  let aces = cards.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0, isBust: total > 21 };
}

function isBlackjack(cards) { return cards.length === 2 && handValue(cards).total === 21; }
function isPair(cards) { return cards.length === 2 && rankValue(cards[0].rank) === rankValue(cards[1].rank); }

// Reparto para N jugadores (multijugador local) + dealer
function dealRound(shoe, numPlayers) {
  const playerHands = Array.from({ length: numPlayers }, () => []);
  const dealerHand = [];
  for (let round = 0; round < 2; round++) {
    for (let p = 0; p < numPlayers; p++) playerHands[p].push(drawCard(shoe));
    dealerHand.push(drawCard(shoe));
  }
  return { playerHands, dealerHand, shoe };
}

function hit(hand, shoe) { return [...hand, drawCard(shoe)]; }

function split(hand, shoe) {
  const isAceSplit = hand[0].rank === 'A';
  return {
    handA: [hand[0], drawCard(shoe)],
    handB: [hand[1], drawCard(shoe)],
    isAceSplit, autoStand: isAceSplit,
  };
}

function dealerPlay(dealerHand, shoe, rules) {
  let hand = [...dealerHand];
  while (true) {
    const { total, soft } = handValue(hand);
    if (total > 21) break;
    if (total < 17) { hand = hit(hand, shoe); continue; }
    if (total === 17 && soft && rules.hitSoft17) { hand = hit(hand, shoe); continue; }
    break;
  }
  return hand;
}

function settleHand(playerHand, dealerHand, bet, rules, surrendered = false) {
  if (surrendered) return { result: 'surrender', payout: roundMoney(bet * 0.5) };

  const player = handValue(playerHand), dealer = handValue(dealerHand);
  const playerBJ = isBlackjack(playerHand), dealerBJ = isBlackjack(dealerHand);

  if (player.isBust) return { result: 'bust', payout: 0 };
  if (playerBJ && dealerBJ) return { result: 'push', payout: bet };
  if (playerBJ) return { result: 'blackjack', payout: roundMoney(bet * (1 + rules.blackjackPayout)) };
  if (dealerBJ) return { result: 'lose', payout: 0 };
  if (dealer.isBust || player.total > dealer.total) return { result: 'win', payout: roundMoney(bet * 2) };
  if (player.total < dealer.total) return { result: 'lose', payout: 0 };
  return { result: 'push', payout: bet };
}

function roundMoney(n) { return Math.round(n * 100) / 100; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createShoe, needsReshuffle, drawCard, rankValue, handValue, isBlackjack, isPair, dealRound, hit, split, dealerPlay, settleHand };
}