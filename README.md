# 🎰 CasiQueNo

Casino de **tres juegos** hecho con **HTML, CSS y JavaScript**: tragamonedas, blackjack y ruleta. Se juega en el navegador y también se empaqueta como app de escritorio para Windows con **Electron**.

🔗 **Jugar en línea:** https://juanmask327.github.io/CasiQueNo/

Cada juego arranca con **10.000 fichas** (4 de 500, 3 de 1.000, 2 de 1.500 y 1 de 2.000) y la apuesta se arma haciendo clic en las fichas.

---

## 🍒 Tragamonedas

Tres rodillos con **probabilidad ponderada**: los símbolos que más pagan son los que menos salen.

| Símbolo | Peso | 3 iguales | 2 iguales |
|---|---|---|---|
| 🍉 Sandía | 14 | ×12 | ×0,2 |
| 🍊 Naranja | 12 | ×14 | ×0,25 |
| 🍒 Cereza | 10 | ×15 | ×0,3 |
| 🍋 Limón | 8 | ×21 | ×0,4 |
| 🔔 Campana | 6 | ×44 | ×4 |
| 🍀 Trébol | 5 | ×58 | ×5 |
| ⭐ Estrella | 4 | ×90 | ×6 |
| 💎 Diamante | 2 | ×220 | ×12 |
| 7 Siete | 1 | ×460 | ×24 |

Las frutas comunes pagan un par por debajo de la apuesta: el clásico **"casi gano"** que le da nombre al juego.

**Matemática verificada.** El RTP (porcentaje de lo apostado que vuelve al jugador) se calcula de forma exacta recorriendo todas las combinaciones, y se comprueba con una simulación de **1.000.000 de tiradas** (`pnpm run sim`):

| | Valor |
|---|---|
| RTP teórico | 85,08 % |
| Ventaja de la casa | 14,92 % |
| Tiradas con premio | ≈ 40 % |

## 🃏 Blackjack

Mesa con **zapato de 4 barajas** y **varios jugadores en el mismo equipo** (por turnos). Se puede pedir, plantarse, doblar y dividir. Antes de jugar eliges al dealer, y cada uno tiene sus propias reglas:

| Dealer | Estilo | Pide con 17 blando | Paga el blackjack |
|---|---|---|---|
| **El Purista** | Las reglas más justas | No | 3 a 2 |
| **El Estratega** | Calculador y frío | Sí | 3 a 2 |
| **El Tiburón** | Todo a favor de la casa | Sí | 6 a 5 |

## 🎡 Ruleta

**Ruleta europea** (un solo cero) con pagos estándar de casino y animación de la rueda con el orden real de los números.

- Apuestas externas: rojo/negro, par/impar, 1-18/19-36, docenas y columnas.
- Pleno a un número del 0 al 36.
- RTP de **97,30 %**, el de una ruleta europea real.

---

## 🗂️ Estructura

```
src/
  index.html            # lobby y pantallas de los tres juegos
  shared/               # fichas, billetera y navegación entre juegos
  games/
    tragamonedas/       # pesos, pagos, motor, animación e interfaz
    blackjack/          # zapato, reglas, dealers e interfaz
    roulette/           # rueda, pagos e interfaz
  styles/main.css
sim.js                  # simulación de 1.000.000 de tiradas del tragamonedas
main.js                 # ventana de Electron
```

La lógica de cada juego (`engine.js`) está separada de la interfaz (`renderer.js`), así que se puede probar con Node sin abrir el navegador.

## ▶️ Ejecutarlo en local

```bash
pnpm install
pnpm start          # abre la app de escritorio
pnpm run sim        # corre la simulación del tragamonedas
pnpm run build      # genera el ejecutable portable para Windows
```

---

Es un juego de simulación: no usa dinero real.
