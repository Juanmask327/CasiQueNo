/**
 * router.js — Cambia entre pantallas del casino (lobby / tragamonedas / blackjack / roulette)
 * mostrando/ocultando divs. Dispara 'screen-changed' con { screen, previousScreen } para que
 * cada juego sepa cuándo entra en pantalla (refrescar su UI) y cuándo la abandona hacia el
 * lobby (reiniciar partida y fichas).
 */

const SCREENS = ['lobby', 'tragamonedas', 'blackjack', 'roulette'];
let currentScreen = 'lobby';

function showScreen(screenId) {
  const previousScreen = currentScreen;
  SCREENS.forEach(id => {
    const el = document.getElementById('screen-' + id);
    if (el) el.classList.toggle('active-screen', id === screenId);
  });
  currentScreen = screenId;
  document.dispatchEvent(new CustomEvent('screen-changed', { detail: { screen: screenId, previousScreen } }));
}

function goToLobby() {
  showScreen('lobby');
}

/** Muestra en cada card del lobby las fichas actuales de ese juego, en vivo. */
function initLobbyBalances() {
  document.querySelectorAll('.game-card-balance[data-balance-for]').forEach(badge => {
    const wallet = window.wallets[badge.dataset.balanceFor];
    if (!wallet) return;
    const update = (balance) => { badge.textContent = window.chips.fmtChips(balance); };
    update(wallet.getBalance());
    wallet.onChange(update);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => showScreen(card.dataset.game));
  });
  document.querySelectorAll('.back-to-lobby').forEach(btn => {
    btn.addEventListener('click', goToLobby);
  });
  initLobbyBalances();
  showScreen('lobby');
});
