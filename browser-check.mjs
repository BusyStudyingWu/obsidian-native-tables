import {build} from 'esbuild';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
await mkdir('.browser-check',{recursive:true});
await build({entryPoints:['src/browser-check.ts'],bundle:true,format:'esm',outfile:'.browser-check/check.js',alias:{obsidian:'./src/obsidian-stub.ts'}});
await copyFile('styles.css','.browser-check/styles.css');
await writeFile('.browser-check/index.html',`<!doctype html><meta charset="utf-8"><title>Native Tables checks</title><link rel="stylesheet" href="styles.css"><style>:root{--background-primary:white;--background-secondary:#f4f4f4;--background-modifier-border:#ddd;--text-normal:#222;--text-muted:#777;--font-text:Arial;--font-interface:Arial;--font-text-size:16px}body{padding:30px;font:16px/24px Arial}#table-host{width:700px}.nt-grid{font-size:16px;line-height:24px}#results{font:14px/22px monospace;white-space:pre-wrap}</style><button id="outside">外部区域</button><div id="table-host"></div><pre id="results"></pre><script type="module" src="check.js"></script>`);
