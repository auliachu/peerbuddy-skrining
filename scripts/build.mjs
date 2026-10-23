import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const file=new URL('../public/config.js',import.meta.url);
const sandbox={window:{}};vm.runInNewContext(await readFile(file,'utf8'),sandbox);
const previous=sandbox.window.PEERBUDDY_CONFIG;
const url=(process.env.PEERBUDDY_SUPABASE_URL||previous.supabaseUrl||'').replace(/\/$/,'');
const key=process.env.PEERBUDDY_SUPABASE_PUBLIC_KEY||previous.supabasePublishableKey||'';
if(url&&!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw new Error('PEERBUDDY_SUPABASE_URL harus URL https proyek Supabase.');
if(key.startsWith('sb_secret_'))throw new Error('Gunakan publishable/anon key, bukan secret key.');
if(key.startsWith('eyJ')){try{const payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());if(payload.role!=='anon')throw new Error('role');}catch{throw new Error('JWT pada konfigurasi publik harus anon key.');}}
if(!!url!==!!key)throw new Error('URL dan publishable key harus diisi bersama.');
const config={...previous,supabaseUrl:url,supabasePublishableKey:key,demoEnabled:process.env.PEERBUDDY_DEMO_ENABLED===undefined?previous.demoEnabled:process.env.PEERBUDDY_DEMO_ENABLED==='true',resultTiming:process.env.PEERBUDDY_RESULT_TIMING||previous.resultTiming};
await writeFile(file,'/* Konfigurasi publik. Tidak mengandung secret/service role key. */\nwindow.PEERBUDDY_CONFIG = Object.freeze('+JSON.stringify(config,null,2)+');\n');
console.log(url?'Build selesai: konfigurasi publik tersedia.':'Build selesai: mode belum dibuka; konfigurasi Supabase masih diperlukan.');
