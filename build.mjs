import {build} from 'esbuild';
import {copyFile,mkdir} from 'node:fs/promises';
const output=process.env.NATIVE_TABLES_OUTPUT||'dist';
await mkdir(output,{recursive:true});
await build({entryPoints:['src/main.ts'],bundle:true,external:['obsidian','@codemirror/state','@codemirror/view','@codemirror/commands'],format:'cjs',target:'es2022',outfile:`${output}/main.js`});
for(const name of ['manifest.json','styles.css']) await copyFile(name,`${output}/${name}`);
