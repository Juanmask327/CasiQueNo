/**
 * wallet.js — Fábrica de saldo de fichas.
 * Cada juego (tragamonedas/blackjack/roulette) tiene su propia instancia
 * independiente en window.wallets — ganar o perder en uno no afecta a los otros.
 * Patrón pub/sub: los renderers se suscriben con onChange() para refrescar su UI.
 */

function createWallet(startingBalance) {
  let balance = startingBalance;
  const listeners = [];

  function getBalance() {
    return balance;
  }

  function setBalance(newBalance) {
    balance = Math.max(0, roundMoney(newBalance));
    listeners.forEach(fn => fn(balance));
    return balance;
  }

  function deposit(amount) {
    return setBalance(balance + amount);
  }

  function withdraw(amount) {
    if (amount > balance) throw new Error('Fichas insuficientes');
    return setBalance(balance - amount);
  }

  function reset() {
    return setBalance(startingBalance);
  }

  /** Suscribirse a cambios de balance. Devuelve función para des-suscribirse. */
  function onChange(fn) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }

  return { getBalance, setBalance, deposit, withdraw, reset, onChange, STARTING_BALANCE: startingBalance };
}

function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

if (typeof window !== 'undefined') {
  const startingBalance = (window.chips && window.chips.STARTING_BALANCE) || 10000;
  window.createWallet = createWallet;
  window.wallets = {
    tragamonedas: createWallet(startingBalance),
    blackjack: createWallet(startingBalance),
    roulette: createWallet(startingBalance),
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createWallet };
}
