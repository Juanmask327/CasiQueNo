// Some terminals (notably VS Code's integrated terminal, which is itself an Electron
// app) leak ELECTRON_RUN_AS_NODE into spawned shells. If that's set, `electron .` just
// runs main.js as plain Node instead of opening a window — no error, no window, nothing.
// Clear it before spawning the real binary so `pnpm start`/`pnpm dev` always open a window.
delete process.env.ELECTRON_RUN_AS_NODE;

const { spawn } = require('child_process');
const electronPath = require('electron');

const child = spawn(electronPath, ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

child.on('close', (code) => process.exit(code ?? 0));
