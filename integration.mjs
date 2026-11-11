import {build} from 'esbuild';import {JSDOM} from 'jsdom';import assert from 'node:assert/strict';
const dom=new JSDOM('<!DOCTYPE html><body></body>',{pretendToBeVisual:true});
for(const name of ['window','document','navigator','HTMLElement','HTMLTableElement','MutationObserver','DOMParser','KeyboardEvent','MouseEvent','Event','getComputedStyle'])Object.defineProperty(globalThis,name,{value:name==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[name],configurable:true});
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
await build({entryPoints:['src/integration.ts'],bundle:true,platform:'node',format:'esm',outfile:'integration-bundle.mjs',alias:{obsidian:'./src/obsidian-stub.ts'},external:['node:assert/strict']});
await import('./integration-bundle.mjs');
