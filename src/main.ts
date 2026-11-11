import {undo,redo} from '@codemirror/commands';
import {Plugin,PluginSettingTab,Setting,MarkdownRenderChild,MarkdownView,Notice,editorLivePreviewField,editorInfoField,Component} from 'obsidian';
import {StateField,StateEffect,Prec} from '@codemirror/state';
import {Decoration,EditorView,WidgetType,type DecorationSet} from '@codemirror/view';
import {scan,serialize,fresh,type Table} from './model';
import {Grid} from './grid';
const refresh=StateEffect.define<void>();
class TableWidget extends WidgetType{
 constructor(private plugin:NativeTables,private table:Table,private path:string){super();}
 eq(other:TableWidget){return this.path===other.path&&this.table.from===other.table.from&&JSON.stringify(this.table)===JSON.stringify(other.table);}
 toDOM(view:EditorView){const t=this.table,p=this.plugin;let grid:Grid;const component=new Component();component.load();const commit=(next:Table)=>{const current=scan(view.state.doc.toString()).find(x=>x.from===t.from);if(!current||view.state.doc.sliceString(current.from,current.to)!==serializeOriginal){new Notice('表格已被修改，请重新选择后操作');return;}if(next.meta.id.startsWith('plain-')){const oldKey=this.path+':'+next.meta.id+':'+t.from;next.meta.id=globalThis.crypto.randomUUID();const session=p.sessions.get(oldKey);if(session)p.sessions.set(this.path+':'+next.meta.id+':'+t.from,session);p.sessions.delete(oldKey);}const insert=serialize(next);view.dispatch({changes:{from:current.from,to:current.to,insert},selection:{anchor:current.from},userEvent:'input'});view.focus();};const serializeOriginal=view.state.doc.sliceString(t.from,t.to);
 grid=new Grid({app:p.app,source:this.path,component,table:t,session:p.sessions.get(this.path+':'+t.meta.id+':'+t.from)??(()=>{const s={};p.sessions.set(this.path+':'+t.meta.id+':'+t.from,s);return s;})(),commit,history:forward=>{(forward?redo:undo)(view);},fallback:()=>{p.native.add(`${this.path}:${t.from}`);view.dispatch({effects:refresh.of()});view.focus();},reset:()=>{const next=structuredClone(t);next.meta=fresh(next.cells);next.error=undefined;commit(next);}});p.grids.set(grid.el,grid);p.components.set(grid.el,component);return grid.el;}
 destroy(dom:HTMLElement){this.plugin.grids.get(dom)?.destroy();this.plugin.grids.delete(dom);this.plugin.components.get(dom)?.unload();this.plugin.components.delete(dom);}
 ignoreEvent(){return true;}
}
export default class NativeTables extends Plugin{
 settings={enabled:true};native=new Set<string>();grids=new Map<HTMLElement,Grid>();components=new Map<HTMLElement,Component>();sessions=new Map<string,any>();
 async onload(){Object.assign(this.settings,await this.loadData());const p=this;
 const field=StateField.define<DecorationSet>({create:state=>decorate(state),update:(v,tr)=>tr.docChanged||tr.effects.length?decorate(tr.state):v,provide:f=>EditorView.decorations.from(f)});
 const decorate=(state:any):DecorationSet=>{if(!p.settings.enabled||!state.field(editorLivePreviewField,false))return Decoration.none;const info=state.field(editorInfoField,false),path=info?.file?.path??'';if(!path)return Decoration.none;const tables=scan(state.doc.toString());const ranges=tables.filter(t=>!p.native.has(`${path}:${t.from}`)).map(t=>{return Decoration.replace({widget:new TableWidget(p,t,path),block:true}).range(t.from,t.to);});return Decoration.set(ranges,true);};
 this.registerEditorExtension(Prec.highest(field));
 this.registerMarkdownPostProcessor((el,ctx)=>{if(!p.settings.enabled)return;const source=p.app.vault.getAbstractFileByPath(ctx.sourcePath);if(!source||!('extension' in source))return;void p.app.vault.cachedRead(source as any).then(text=>{const tables=scan(text);el.querySelectorAll('table').forEach(table=>{if(table.closest('.nt-grid'))return;const info=ctx.getSectionInfo(table);if(!info)return;const offset=text.split('\n').slice(0,info.lineStart).join('\n').length+(info.lineStart?1:0),end=text.split('\n').slice(0,info.lineEnd+1).join('\n').length;const candidates=tables.filter(t=>t.from>=offset&&t.from<=end);const index=Array.from(el.querySelectorAll('table')).indexOf(table);const model=candidates.length===1?candidates[0]:candidates[index];if(!model)return;const child=new MarkdownRenderChild(document.createElement('div'));ctx.addChild(child);const grid=new Grid({app:p.app,source:ctx.sourcePath,component:child,table:model});table.replaceWith(grid.el);child.register(()=>grid.destroy());});});});
 this.addSettingTab(new NativeSettings(this));this.addCommand({id:'restore-enhanced',name:'恢复增强表格编辑',callback:()=>{this.native.clear();this.refresh();}});this.addCommand({id:'insert-table',name:'插入增强表格',editorCallback:editor=>{const cells=[['标题 1','标题 2','标题 3'],['','',''],['','','']];editor.replaceSelection('\n'+serialize({from:0,to:0,cells,align:[],meta:fresh(cells)})+'\n');}});
 }
 refresh(){this.app.workspace.iterateAllLeaves(leaf=>{if(leaf.view instanceof MarkdownView){const editor=leaf.view.editor as unknown as {cm?:EditorView};editor.cm?.dispatch({effects:refresh.of()});}});}
 onunload(){for(const g of this.grids.values())g.destroy();this.grids.clear();for(const c of this.components.values())c.unload();this.components.clear();this.sessions.clear();}
}
class NativeSettings extends PluginSettingTab{constructor(private plugin:NativeTables){super(plugin.app,plugin);}display(){this.containerEl.empty();new Setting(this.containerEl).setName('增强表格编辑').setDesc('默认接管顶层 Markdown 表格。切换后重新打开阅读视图以刷新。').addToggle(t=>t.setValue(this.plugin.settings.enabled).onChange(async value=>{this.plugin.settings.enabled=value;await this.plugin.saveData(this.plugin.settings);this.plugin.refresh();}));}}
