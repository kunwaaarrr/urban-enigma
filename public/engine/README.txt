Stockfish 10 (classical hand-crafted evaluation, ~3000 Elo), compiled to
WebAssembly. Single-threaded, so it needs no SharedArrayBuffer / COOP-COEP
headers and runs on static hosts like GitHub Pages.

Files:
  stockfish.wasm.js  - Emscripten loader, run as a Web Worker
  stockfish.wasm     - the engine binary (~559 KB)

Vendored from npm `stockfish.js@10.0.2` (https://github.com/niklasf/stockfish.js),
itself a build of the Stockfish engine (https://stockfishchess.org).

Stockfish is free software under the GNU General Public License v3.
Full text in COPYING.txt. Source: https://github.com/official-stockfish/Stockfish
