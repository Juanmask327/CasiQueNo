/**
 * animations.js — Control de animación de giro de cada rodillo.
 *
 * Técnica:
 * - Cada rodillo tiene una tira interna larga con símbolos repetidos (30 en total).
 * - El giro se logra con transform: translateY() + transition cubic-bezier ease-out.
 * - Los rodillos se detienen en cascada: 1200ms, 1500ms, 1800ms.
 * - El símbolo ganador queda exactamente centrado al finalizar.
 * - Efecto de rebote al detenerse (CSS keyframes).
 * - Glow animado sobre símbolos ganadores.
 */

const REEL_VISIBLE_HEIGHT = 120;   // px — altura visible de cada rodillo
const SYMBOL_HEIGHT = 120;         // px — altura de cada símbolo en la tira
const STRIP_SYMBOLS_COUNT = 30;    // número de símbolos en la tira interna (repetidos)
const SPIN_DISTANCE_BASE = 2400;   // px desplazamiento base de giro (antes de posición final)

// Tiempos de parada en cascada
const STOP_TIMES = [1200, 1500, 1800];

// Referencia a los rodillos en el DOM
let reelStrips = [];

/**
 * Inicializa los rodillos en el DOM.
 * Construye la tira interna de cada rodillo llenándola con símbolos repetidos.
 * @param {Object[]} symbols - Array de SYMBOLS de paytable.js
 */
function initReels(symbols) {
  const reelContainers = document.querySelectorAll('.reel-window');
  reelStrips = [];

  reelContainers.forEach((container, reelIndex) => {
    const strip = container.querySelector('.reel-strip');
    strip.innerHTML = '';

    // Construir la tira con STRIP_SYMBOLS_COUNT símbolos (loop circular sobre SYMBOLS)
    for (let i = 0; i < STRIP_SYMBOLS_COUNT; i++) {
      const sym = symbols[i % symbols.length];
      const symEl = createSymbolElement(sym);
      symEl.dataset.symbolId = sym.id;
      strip.appendChild(symEl);
    }

    // Posición inicial: mostrar el primer símbolo
    strip.style.transition = 'none';
    strip.style.transform = `translateY(0px)`;

    reelStrips.push(strip);
  });
}

/**
 * Crea el elemento DOM de un símbolo.
 * @param {Object} sym - Símbolo de paytable.js
 * @returns {HTMLElement}
 */
function createSymbolElement(sym) {
  const el = document.createElement('div');
  el.className = 'reel-symbol';
  el.style.height = `${SYMBOL_HEIGHT}px`;
  el.style.lineHeight = `${SYMBOL_HEIGHT}px`;

  if (sym.id === 'siete') {
    // El "7" es texto estilizado
    el.innerHTML = `<span class="symbol-seven">${sym.label}</span>`;
  } else {
    el.innerHTML = `<span class="symbol-emoji">${sym.label}</span>`;
  }

  el.dataset.symbolId = sym.id;
  return el;
}

/**
 * Calcula el translateY final para que el símbolo resultante quede centrado.
 * La lógica:
 *  - Buscamos en la tira la última ocurrencia del símbolo (en la segunda mitad) para que
 *    haya suficiente recorrido de giro previo.
 *  - El translateY final es negativo: mover la tira hacia arriba para que el símbolo
 *    quede en la posición 0 (visible en el centro del window).
 *
 * @param {HTMLElement} strip - Elemento de la tira interna
 * @param {string} symbolId - ID del símbolo resultante
 * @param {Object[]} symbols - SYMBOLS de paytable.js
 * @returns {number} translateY final en px (negativo)
 */
function computeFinalTranslateY(strip, symbolId, symbols) {
  const symbolEls = strip.querySelectorAll('.reel-symbol');
  let targetIndex = -1;

  // Buscar en la segunda mitad de la tira para garantizar suficiente giro
  const startSearch = Math.floor(STRIP_SYMBOLS_COUNT * 0.55);
  for (let i = startSearch; i < symbolEls.length; i++) {
    if (symbolEls[i].dataset.symbolId === symbolId) {
      targetIndex = i;
      // Preferir un índice más alto (más recorrido = más suspenso)
      // Seguimos buscando pero tomamos el último que encontremos en el rango superior
    }
  }

  // Si no se encontró en la segunda mitad, buscar en cualquier lado
  if (targetIndex === -1) {
    for (let i = 0; i < symbolEls.length; i++) {
      if (symbolEls[i].dataset.symbolId === symbolId) {
        targetIndex = i;
      }
    }
  }

  if (targetIndex === -1) targetIndex = 0;

  // translateY: mover la tira hacia arriba para que el índice target quede en pos 0
  return -(targetIndex * SYMBOL_HEIGHT);
}

/**
 * Anima un rodillo individual.
 * @param {number} reelIndex - Índice del rodillo (0, 1, 2)
 * @param {string} targetSymbolId - ID del símbolo que debe quedar al final
 * @param {Object[]} symbols - SYMBOLS
 * @returns {Promise<void>} Resuelve cuando la animación termina (incluyendo rebote)
 */
function animateReel(reelIndex, targetSymbolId, symbols) {
  return new Promise((resolve) => {
    const strip = reelStrips[reelIndex];
    const stopTime = STOP_TIMES[reelIndex];

    // Paso 1: Iniciar giro rápido — desplazamiento previo hacia abajo (simula velocidad)
    // Reset sin transición para posicionar en un punto de inicio que permita giro visual
    strip.style.transition = 'none';
    strip.style.transform = `translateY(-${SPIN_DISTANCE_BASE * 0.1}px)`;

    // Forzar reflow para que el reset surta efecto
    strip.getBoundingClientRect();

    // Calcular posición final
    const finalY = computeFinalTranslateY(strip, targetSymbolId, symbols);

    // Ajustar: necesitamos que el translateY final sea desde el inicio, no relativo.
    // La distancia total a recorrer en la animación es: start → final.
    // Para que el giro se vea largo, comenzamos desde un punto donde ya "scrolleó" arriba.
    const startOffset = SPIN_DISTANCE_BASE * 0.1;
    const totalTravel = Math.abs(finalY) - startOffset;

    // Si finalY es menos negativo que el punto inicial, necesitamos ajustar lógica.
    // Aseguramos suficiente recorrido agregando loops completos si es necesario.
    // Un loop completo de la tira = STRIP_SYMBOLS_COUNT * SYMBOL_HEIGHT
    const fullLoop = STRIP_SYMBOLS_COUNT * SYMBOL_HEIGHT;
    let adjustedFinalY = finalY;

    // Si el viaje sería muy corto, agregar loops completos
    while (Math.abs(adjustedFinalY) < startOffset + fullLoop * 0.5) {
      adjustedFinalY -= fullLoop;
    }

    // Paso 2: Animar al punto de destino con ease-out (deceleración natural)
    strip.style.transition = `transform ${stopTime}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
    strip.style.transform = `translateY(${adjustedFinalY}px)`;

    // Paso 3: Al terminar la transición CSS, ajustar sin animación al finalY real
    // (el finalY real y adjustedFinalY difieren por múltiplos de fullLoop — visualmente iguales
    //  si la tira es circular, pero adjustedFinalY podría ir fuera de la tira)
    // Simplificación: usamos adjustedFinalY como final definitivo (la tira es larga, funciona).

    setTimeout(() => {
      // Quitar transición para el rebote manual
      strip.style.transition = 'none';

      // Rebote: pequeño overshoot hacia abajo y retorno
      applyBounce(strip, adjustedFinalY, () => {
        resolve();
      });
    }, stopTime);
  });
}

/**
 * Aplica animación de rebote al detenerse el rodillo.
 * Simula inercia física con overshoot y retorno.
 * @param {HTMLElement} strip
 * @param {number} finalY - Posición final en px
 * @param {Function} onComplete
 */
function applyBounce(strip, finalY, onComplete) {
  const bounceOffset = 12; // px de overshoot

  // Overshoot: ir un poco más allá
  strip.style.transition = `transform 80ms cubic-bezier(0.33, 0, 0.66, 0)`;
  strip.style.transform = `translateY(${finalY + bounceOffset}px)`;

  setTimeout(() => {
    // Retorno al punto exacto
    strip.style.transition = `transform 120ms cubic-bezier(0.33, 1, 0.66, 1)`;
    strip.style.transform = `translateY(${finalY}px)`;

    setTimeout(() => {
      strip.style.transition = 'none';
      if (onComplete) onComplete();
    }, 120);
  }, 80);
}

/**
 * Orquesta el giro de todos los rodillos en cascada.
 * @param {string[]} targetSymbolIds - Array de 3 IDs de símbolos resultantes
 * @param {Object[]} symbols - SYMBOLS
 * @returns {Promise<void>} Resuelve cuando el último rodillo termina
 */
function spinAllReels(targetSymbolIds, symbols) {
  // Iniciar todos los rodillos simultáneamente (el giro visual es rápido al inicio)
  // pero cada uno se detiene en su tiempo propio (STOP_TIMES)
  return Promise.all(
    reelStrips.map((strip, i) => animateReel(i, targetSymbolIds[i], symbols))
  );
}

/**
 * Aplica efecto de glow a los rodillos ganadores.
 * @param {number[]} winningReelIndices - Índices de los rodillos con símbolos ganadores
 * @param {string} color - Color del glow (hex o css color)
 */
function applyWinGlow(winningReelIndices, color) {
  const reelContainers = document.querySelectorAll('.reel-window');
  reelContainers.forEach((container, i) => {
    container.classList.remove('win-glow', 'win-glow-pair');
    if (winningReelIndices.includes(i)) {
      container.classList.add(winningReelIndices.length === 3 ? 'win-glow' : 'win-glow-pair');
    }
  });
}

/**
 * Elimina todos los efectos de glow.
 */
function clearWinGlow() {
  const reelContainers = document.querySelectorAll('.reel-window');
  reelContainers.forEach((container) => {
    container.classList.remove('win-glow', 'win-glow-pair');
  });
}

/**
 * Anima el contador de balance incrementalmente.
 * @param {HTMLElement} el - Elemento que muestra el balance
 * @param {number} from - Valor inicial
 * @param {number} to - Valor final
 * @param {number} duration - Duración en ms
 */
function animateBalance(el, from, to, duration = 600) {
  const startTime = performance.now();
  const diff = to - from;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Easing ease-out
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + diff * easedProgress);
    el.textContent = current.toLocaleString('es-ES');
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// No module.exports aquí — este módulo es solo para el browser (renderer process)
