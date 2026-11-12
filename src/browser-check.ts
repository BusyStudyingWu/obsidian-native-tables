import {Grid} from './grid';
import {Component} from './obsidian-stub';
import {fresh,merge,type Table} from './model';
const host=document.querySelector('#table-host')!;
const results=document.querySelector('#results')!;
let table:Table={from:0,to:0,cells:[['类别','水果','备注'],['仁果类','苹果','常温保存'],['仁果类','梨','清脆']],align:[],meta:fresh([['类别','水果','备注'],['仁果类','苹果','常温保存'],['仁果类','梨','清脆']])};
let grid:any;const session:any={};
function mount(){grid?.destroy();grid=new Grid({app:{} as any,source:'test.md',component:new Component() as any,table,session,commit:next=>{table=next;mount();}});host.replaceChildren(grid.el);}
const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
let passed=0;
function check(ok:boolean,name:string){if(!ok)throw Error(name);passed++;results.textContent+=`✓ ${name}\n`;}
function cell(r=1,c=1){return grid.el.querySelector(`[data-r="${r}"][data-c="${c}"]`) as HTMLElement;}
function dims(){return {width:grid.table.getBoundingClientRect().width,height:grid.table.getBoundingClientRect().height,cell:cell().getBoundingClientRect().height};}
function same(a:number,b:number){return Math.abs(a-b)<1;}
try{mount();await frame();const before=dims();grid.active=true;grid.mark();await frame();const toolbar=grid.toolbar.getBoundingClientRect();check(toolbar.top>=grid.el.getBoundingClientRect().top&&toolbar.bottom<=grid.table.getBoundingClientRect().top-8,'工具栏位于预留空间内');
 grid.edit(1,1);await frame();check(same(dims().width,before.width),'进入编辑不改变表宽');check(same(dims().cell,before.cell),'短文本编辑不增加行高');
 grid.el.querySelector('textarea').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await frame();check(same(dims().height,before.height),'退出编辑不残留额外行高');
 grid.edit(1,1);await frame();const input=grid.el.querySelector('textarea');input.value='较长的测试内容'.repeat(30);input.dispatchEvent(new Event('input',{bubbles:true}));await frame();check(same(dims().width,before.width),'长文本编辑仍保持表宽');check(dims().height>before.height,'长内容可撑开高度');
 input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await frame();check(same(dims().height,before.height),'取消长内容后恢复高度');
 grid.active=true;grid.mark();document.querySelector('#outside')!.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true}));await frame();grid.el.querySelector('.nt-resize-col').dispatchEvent(new MouseEvent('pointerenter'));check(grid.el.querySelectorAll('.nt-selected,.nt-resize-preview').length===0,'外部点击与后续悬停不残留高亮');check(grid.controls.hidden&&grid.toolbar.hidden,'退出后灰条和工具栏收起');
 table=structuredClone(table);merge(table,{r:1,c:0,er:2,ec:0});mount();await frame();const mergedHeight=cell(1,0).getBoundingClientRect().height;grid.edit(1,0);await frame();check(same(cell(1,0).getBoundingClientRect().height,mergedHeight),'合并格进入编辑不跳高');grid.el.querySelector('textarea').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await frame();check(same(cell(1,0).getBoundingClientRect().height,mergedHeight),'合并格退出编辑恢复原尺寸');
 results.textContent+=`\nPASS ${passed} checks`;document.title=`PASS ${passed} — Native Tables`;
}catch(error){results.textContent+='\nFAIL '+(error as Error).message;document.title='FAIL — Native Tables';}
