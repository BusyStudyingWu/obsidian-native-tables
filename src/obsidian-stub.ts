import {StateField} from '@codemirror/state';
export const editorLivePreviewField=StateField.define({create:()=>true,update:v=>v});
export const editorInfoField=StateField.define({create:()=>({file:{path:'test.md'}}),update:v=>v});
export class Component{load(){}unload(){}register(){} }
export class MarkdownRenderChild extends Component{constructor(public containerEl:HTMLElement){super();}}
export class Notice{constructor(public message:string){}}
export class Menu{addItem(fn:any){fn({setTitle(){return this;},onClick(){return this;}});return this;}addSeparator(){}showAtMouseEvent(){}showAtPosition(){}}
export class Modal{contentEl=document.createElement('div');constructor(public app:any){}setTitle(){}open(){}close(){}}
export class Setting{constructor(el:any){}setName(){return this;}setDesc(){return this;}addText(){return this;}addButton(){return this;}addToggle(){return this;}}
export class PluginSettingTab{containerEl=document.createElement('div');constructor(app:any,p:any){} }
export class MarkdownView{}
export class Plugin{app:any;extension:any;async loadData(){return{};}registerEditorExtension(x:any){this.extension=x;}registerMarkdownPostProcessor(){}addSettingTab(){}addCommand(){} }
export const MarkdownRenderer={async render(app:any,text:string,el:HTMLElement){el.textContent=text;}};

export function setIcon(el:HTMLElement,name:string){el.dataset.icon=name;}
