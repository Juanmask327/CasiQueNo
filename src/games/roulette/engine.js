// engine.js — Ruleta europea (una sola bola, pagos estándar de casino)
const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

// Orden real de los números en la rueda europea (usado para la animación).
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

function colorOf(n) { return n === 0 ? 'green' : (RED_NUMBERS.has(n) ? 'red' : 'black'); }
function isEven(n) { return n !== 0 && n % 2 === 0; }
function isOdd(n)  { return n !== 0 && n % 2 !== 0; }
function isLow(n)  { return n >= 1 && n <= 18; }
function isHigh(n) { return n >= 19 && n <= 36; }
function dozenOf(n) { if (n === 0) return null; return n <= 12 ? 1 : n <= 24 ? 2 : 3; }
function columnOf(n) { if (n === 0) return null; const m = n % 3; return m === 1 ? 1 : m === 2 ? 2 : 3; }

// Pagos estándar de ruleta europea (bola única): "payout" incluye la apuesta devuelta.
const PAYTABLE = {
  red:     { payout: 2,  matches: n => colorOf(n) === 'red' },
  black:   { payout: 2,  matches: n => colorOf(n) === 'black' },
  even:    { payout: 2,  matches: n => isEven(n) },
  odd:     { payout: 2,  matches: n => isOdd(n) },
  low:     { payout: 2,  matches: n => isLow(n) },
  high:    { payout: 2,  matches: n => isHigh(n) },
  dozen1:  { payout: 3,  matches: n => dozenOf(n) === 1 },
  dozen2:  { payout: 3,  matches: n => dozenOf(n) === 2 },
  dozen3:  { payout: 3,  matches: n => dozenOf(n) === 3 },
  column1: { payout: 3,  matches: n => columnOf(n) === 1 },
  column2: { payout: 3,  matches: n => columnOf(n) === 2 },
  column3: { payout: 3,  matches: n => columnOf(n) === 3 },
};

const STRAIGHT_PAYOUT = 36; // pleno: paga 35:1 (36x incluyendo la apuesta devuelta)

function spinWheel() {
  return { number: Math.floor(Math.random() * 37) };
}

function evaluateBet(bet, amount, result) {
  const { number } = result;

  if (bet.type === 'straight') {
    if (number === bet.number) return { won: true, payout: roundMoney(amount * STRAIGHT_PAYOUT), detail: 'pleno' };
    return { won: false, payout: 0, detail: 'sin-acierto' };
  }

  const entry = PAYTABLE[bet.type];
  if (entry.matches(number)) return { won: true, payout: roundMoney(amount * entry.payout), detail: 'acierto' };
  return { won: false, payout: 0, detail: 'sin-acierto' };
}

function roundMoney(n) { return Math.round(n * 100) / 100; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { colorOf, isEven, isOdd, isLow, isHigh, dozenOf, columnOf, PAYTABLE, WHEEL_ORDER, spinWheel, evaluateBet };
}
