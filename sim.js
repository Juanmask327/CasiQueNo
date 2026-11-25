// sim.js — Ejecutar simulación de RTP y mostrar resultados
const { runSimulation } = require('./src/games/tragamonedas/engine.js');
const { calculateTheoreticalRTP } = require('./src/games/tragamonedas/paytable.js');

const iterations = 1_000_000;
console.log(`\n=== SIMULACIÓN DE RTP — ${iterations.toLocaleString('es-ES')} tiradas ===\n`);

const theoreticalRTP = calculateTheoreticalRTP();
console.log(`RTP teórico:        ${(theoreticalRTP * 100).toFixed(4)}%`);
console.log(`House edge teórico: ${((1 - theoreticalRTP) * 100).toFixed(4)}%\n`);

console.log('Ejecutando simulación...');
const r = runSimulation(iterations, 1);

console.log(`\nRTP empírico:       ${(r.rtp * 100).toFixed(2)}%`);
console.log(`House edge:         ${(r.houseEdge * 100).toFixed(2)}%`);
console.log(`Tiradas ganadoras:  ${r.wins.toLocaleString('es-ES')}`);
console.log(`  Tríos:            ${r.triples.toLocaleString('es-ES')}`);
console.log(`  Pares premiados:  ${r.pairs.toLocaleString('es-ES')}`);
console.log(`Total apostado:     ${r.totalWagered.toLocaleString('es-ES')}`);
console.log(`Total pagado:       ${r.totalPayout.toLocaleString('es-ES')}`);

const diff = Math.abs(r.rtp - theoreticalRTP);
const OK = diff < 0.005 ? '✓ OK (varianza <0.5%)' : '✗ FUERA DE RANGO';
console.log(`\nDiferencia teórico/empírico: ${(diff * 100).toFixed(3)}% — ${OK}`);

const winFreq = (r.wins / iterations) * 100;
console.log(`Frecuencia de victoria empírica: ${winFreq.toFixed(2)}%\n`);
