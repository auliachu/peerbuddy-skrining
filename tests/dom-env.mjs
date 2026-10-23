/* Minimal DOM adapter for state/network tests; does not render or replace browser QA. */
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
class Element {
  constructor(id,doc){this.id=id;this.doc=doc;this.hidden=false;this.disabled=false;this.value='';this.checked=false;this.style={};this.dataset={};this.listeners={};this.attributes={};this._html='';this.textContent='';const classes=new Set();this.classList={add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v),contains:v=>classes.has(v)};}
  set innerHTML(value){this._html=value;if(this.id==='questions-container'){this.doc.radio=[];for(const match of value.matchAll(/<fieldset[^>]*id="question-(\d+)"[\s\S]*?<\/fieldset>/g)){const id=Number(match[1]),card=this.doc.getElementById('question-'+id);card.inputs=[];for(const input of match[0].matchAll(/<input type="radio" name="q\d+" value="(\d+)" data-index="(\d+)"([^>]*)>/g)){const el=new Element('radio-'+id+'-'+input[1],this.doc);el.type='radio';el.value=input[1];el.dataset.index=input[2];el.checked=input[3].includes('checked');card.inputs.push(el);this.doc.radio.push(el);}}}if(this.id==='review-answers'){this.doc.editButtons=Array.from(value.matchAll(/data-edit="(\d+)"/g),m=>{const b=new Element('edit-'+m[1],this.doc);b.dataset.edit=m[1];return b;});}}
  get innerHTML(){return this._html;}
  addEventListener(type,handler){(this.listeners[type]||=[]).push(handler);}
  async emit(type,target=this){for(const handler of this.listeners[type]||[])await handler({target,preventDefault(){}});}
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];}
  querySelector(selector){if(selector==='input')return this.inputs?.[0];return null;}
  matches(selector){return selector==='input[type=radio]'&&this.type==='radio';}
  closest(selector){if(selector.includes('[data-edit]')&&this.dataset.edit!==undefined)return this;if(selector.includes('[data-jump]')&&this.dataset.jump!==undefined)return this;return null;}
  focus(){this.doc.focused=this.id;}
  scrollIntoView(){}
  replaceChildren(){this.innerHTML='';}
  reset(){for(const id of ['name','age','email','whatsapp','gender'])this.doc.getElementById(id).value='';this.doc.getElementById('consent-data').checked=false;this.doc.getElementById('consent-contact').checked=false;}
}
export async function appEnvironment({demo=true,configured=false,fetch=async()=>{throw new Error('Unexpected network');},storage=new Map()}={}){
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const doc={elements:new Map(),radio:[],editButtons:[],focused:null,getElementById(id){if(!this.elements.has(id))this.elements.set(id,new Element(id,this));return this.elements.get(id);},querySelector(selector){if(selector==='.progress-track')return this.getElementById('progress-track');return null;},querySelectorAll(selector){if(selector==='.steps li')return this.steps;if(selector==='[data-edit]')return this.editButtons;return[];}};
  for(const match of html.matchAll(/id="([^"]+)"/g))doc.getElementById(match[1]);
  doc.steps=Array.from({length:5},(_,i)=>{const el=new Element('step-'+(i+1),doc);el.dataset.step=String(i+1);return el;});
  const context={console,URLSearchParams,URL,Blob,Date,Math,JSON,Number,Set,Array,Object,AbortController,crypto:globalThis.crypto,setTimeout,clearTimeout,fetch,document:doc,location:{search:demo?'?demo=1':''},navigator:{clipboard:{writeText:async()=>{}}},sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},scrollTo(){},addEventListener(){}};
  context.window=context;vm.createContext(context);
  for(const file of ['config.js','js/questions.js','js/core.js'])vm.runInContext(await readFile(new URL('../public/'+file,import.meta.url),'utf8'),context);
  if(configured)context.PEERBUDDY_CONFIG={...context.PEERBUDDY_CONFIG,supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'test-public'};
  vm.runInContext(await readFile(new URL('../public/js/app.js',import.meta.url),'utf8'),context);
  const $=id=>doc.getElementById(id);
  const complete=async(answers=Array(42).fill(0))=>{await $('start').emit('click');for(const [id,value] of Object.entries({name:'Peserta Contoh',age:'22',gender:'Perempuan',email:'contoh@example.com',whatsapp:'081234567890'}))$(id).value=value;$('consent-data').checked=true;$('consent-contact').checked=true;await $('participant-form').emit('submit');for(let batch=0;batch<7;batch++){for(const input of doc.radio.filter(r=>r.value===String(answers[Number(r.dataset.index)])))await $('questions-container').emit('change',input);await $('questions-next').emit('click');}};
  return {context,doc,$,storage,complete};
}
