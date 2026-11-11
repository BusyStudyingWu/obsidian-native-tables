export type Style = { background?: string; highlight?:string; fontSize?:number; comment?:string; diagonalDown?:boolean; diagonalUp?:boolean; borderRules?:Record<string,{color:string;width:number;style:string}>; color?:string; bold?:boolean; italic?:boolean; underline?:boolean; strike?:boolean; align?: string; verticalAlign?: 'top'|'middle'|'bottom'; borderColor?: string; borderWidth?: number; borderEdges?: string[] };
export type Merge = {r:number;c:number;rs:number;cs:number;original:string[][];joined:string};
export type Meta = {version:1;id:string;rows:number;cols:number;merges:Merge[];styles:Record<string,Style>;widths:number[];heights:number[]};
export type Table = {from:number;to:number;cells:string[][];align:string[];meta:Meta;error?:string};
export type Rect = {r:number;c:number;er:number;ec:number};
export const key=(r:number,c:number)=>`${r}:${c}`;
export const rect=(a:{r:number;c:number},b:{r:number;c:number}):Rect=>({r:Math.min(a.r,b.r),c:Math.min(a.c,b.c),er:Math.max(a.r,b.r),ec:Math.max(a.c,b.c)});
export function split(line:string):string[]{
 let s=line.trim();if(s.startsWith('|'))s=s.slice(1);if(s.endsWith('|')&&!s.endsWith('\\|'))s=s.slice(0,-1);
 const out:string[]=[];let value='',ticks=0;
 for(let i=0;i<s.length;i++){const ch=s[i];if(ch==='\\'&&i+1<s.length){value+=ch+s[++i];continue;}if(ch==='`'){let n=1;while(s[i+1]==='`'){n++;i++;}ticks=ticks===n?0:ticks===0?n:ticks;value+='`'.repeat(n);continue;}if(ch==='|'&&!ticks){out.push(value.trim());value='';}else value+=ch;}out.push(value.trim());return out;
}
export function fresh(cells:string[][]):Meta{return {version:1,id:globalThis.crypto.randomUUID(),rows:cells.length,cols:cells[0].length,merges:[],styles:{},widths:[],heights:[]};}
export function scan(text:string):Table[]{
 const lines=text.split('\n'), offsets:number[]=[];let n=0;for(const l of lines){offsets.push(n);n+=l.length+1;}const tables:Table[]=[];
 const start=lines[0]==='---'?Math.max(0,lines.findIndex((l,i)=>i>0&&(l==='---'||l==='...'))+1):0;
 for(let i=start,fence='';i<lines.length-1;i++){
 const f=lines[i].match(/^\s{0,3}(`{3,}|~{3,})/);if(f){if(!fence)fence=f[1][0];else if(f[1][0]===fence)fence='';continue;}if(fence||/^\s/.test(lines[i])||!lines[i].includes('|'))continue;
 const sep=split(lines[i+1]);if(!sep.length||!sep.every(v=>/^:?-{3,}:?$/.test(v)))continue;
 const head=split(lines[i]);if(head.length!==sep.length)continue;const cells=[head];let j=i+2;while(j<lines.length&&lines[j].includes('|')&&!/^\s/.test(lines[j])&&lines[j].trim()&&!lines[j].startsWith('<!--')){const row=split(lines[j]);if(row.length!==head.length)break;cells.push(row);j++;}
 let meta=fresh(cells),error:string|undefined;meta.id='plain-'+offsets[i];const comment=lines[j]?.match(/^<!-- native-tables:(.*?) -->$/);
 if(comment){try{meta=JSON.parse(comment[1]);error=validate(meta,cells);}catch{error='表格元数据损坏';}j++;}
 tables.push({from:offsets[i],to:j<lines.length?offsets[j]-1:text.length,cells,align:sep.map(v=>v.startsWith(':')?v.endsWith(':')?'center':'left':v.endsWith(':')?'right':'left'),meta,error});i=j-1;
 }return tables;
}
export function validate(m:Meta,cells:string[][]):string|undefined{
 if(m.version!==1)return '不支持的表格元数据版本';if(m.rows!==cells.length||m.cols!==cells[0].length)return '源码结构已改变，请重置格式';
 if(!Array.isArray(m.merges)||!Array.isArray(m.widths)||!Array.isArray(m.heights)||!m.styles||typeof m.id!=='string')return '表格元数据不完整';
 const occupied=new Set<string>();for(const g of m.merges){if(![g.r,g.c,g.rs,g.cs].every(Number.isInteger)||g.r<0||g.c<0||g.rs<1||g.cs<1||g.r+g.rs>m.rows||g.c+g.cs>m.cols||!Array.isArray(g.original))return '无效的合并区域';for(let r=g.r;r<g.r+g.rs;r++)for(let c=g.c;c<g.c+g.cs;c++){const k=key(r,c);if(occupied.has(k))return '合并区域重叠';occupied.add(k);if((r!==g.r||c!==g.c)&&cells[r][c])return '合并区域源码已改变，请重置格式';}}
}
export function serialize(t:Table):string{
 t.meta.rows=t.cells.length;t.meta.cols=t.cells[0].length;
 const clean=(s:string)=>s.replace(/\r?\n/g,'<br>').replace(/(?<!\\)\|/g,'\\|');
 const row=(r:string[])=>'| '+r.map(clean).join(' | ')+' |';
 const separator=t.cells[0].map((_,c)=>t.align[c]==='center'?':---:':t.align[c]==='right'?'---:':'---');
 return [row(t.cells[0]),row(separator),...t.cells.slice(1).map(row),'<!-- native-tables:'+JSON.stringify(t.meta).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')+' -->'].join('\n');
}
export function owner(t:Table,r:number,c:number):Merge|undefined{return t.meta.merges.find(g=>r>=g.r&&r<g.r+g.rs&&c>=g.c&&c<g.c+g.cs);}
export function merge(t:Table,a:Rect){if(a.r===a.er&&a.c===a.ec)return;if(t.meta.merges.some(g=>g.r<=a.er&&g.r+g.rs>a.r&&g.c<=a.ec&&g.c+g.cs>a.c))throw Error('请先拆分已有合并格');const original=t.cells.slice(a.r,a.er+1).map(r=>r.slice(a.c,a.ec+1));const joined=original.flat().filter(Boolean).join('<br>');for(let r=a.r;r<=a.er;r++)for(let c=a.c;c<=a.ec;c++)t.cells[r][c]='';t.cells[a.r][a.c]=joined;t.meta.merges.push({r:a.r,c:a.c,rs:a.er-a.r+1,cs:a.ec-a.c+1,original,joined});}
export function unmerge(t:Table,a:Rect){const matches=t.meta.merges.filter(g=>g.r<=a.er&&g.r+g.rs>a.r&&g.c<=a.ec&&g.c+g.cs>a.c);for(const g of matches){if(t.cells[g.r][g.c]===g.joined)for(let r=0;r<g.rs;r++)for(let c=0;c<g.cs;c++)t.cells[g.r+r][g.c+c]=g.original[r]?.[c]??'';}t.meta.merges=t.meta.merges.filter(g=>!matches.includes(g));}
export function assertSortable(t:Table){if(t.meta.merges.some(g=>g.rs>1))throw Error('请先拆分跨行合并格，再排序或筛选');}
export function sort(t:Table,c:number,descending=false){assertSortable(t);const ids=t.cells.slice(1).map((_,i)=>i+1);const values=ids.map(r=>t.cells[r][c]).filter(v=>v.trim());const numeric=values.length>0&&values.every(v=>Number.isFinite(Number(v)));ids.sort((a,b)=>{const x=t.cells[a][c],y=t.cells[b][c];if(!x.trim())return y.trim()?1:0;if(!y.trim())return -1;return (numeric?Number(x)-Number(y):x.localeCompare(y,'zh-CN'))*(descending?-1:1);});const map=new Map<number,number>([[0,0],...ids.map((old,i)=>[old,i+1] as [number,number])]);t.cells=[t.cells[0],...ids.map(r=>t.cells[r])];const styles:Record<string,Style>={};for(const [k,v]of Object.entries(t.meta.styles)){const [r,c]=k.split(':').map(Number);styles[key(map.get(r)!,c)]=v;}t.meta.styles=styles;t.meta.heights=[t.meta.heights[0],...ids.map(r=>t.meta.heights[r])];t.meta.merges.forEach(g=>g.r=map.get(g.r)!);}
export function structure(t:Table,axis:'row'|'col',index:number,remove=false){
 if(t.meta.merges.length)throw Error('增删行列前请先拆分合并单元格');if(remove&&((axis==='row'&&index===0)||(axis==='col'&&t.cells[0].length===1)))throw Error('必须保留表头和至少一列');
 const styles:Record<string,Style>={};for(const[k,v]of Object.entries(t.meta.styles)){let[r,c]=k.split(':').map(Number);let p=axis==='row'?r:c;if(remove&&p===index)continue;if(p>=index)p+=remove?-1:1;if(axis==='row')r=p;else c=p;styles[key(r,c)]=v;}t.meta.styles=styles;
 if(axis==='row'){t.cells.splice(index,remove?1:0,...remove?[]:[Array(t.cells[0].length).fill('')]);t.meta.heights.splice(index,remove?1:0,...remove?[]:[32]);}else{t.cells.forEach(r=>r.splice(index,remove?1:0,...remove?[]:['']));t.align.splice(index,remove?1:0,...remove?[]:['left']);t.meta.widths.splice(index,remove?1:0,...remove?[]:[140]);}
}
