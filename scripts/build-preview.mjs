import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const publicDir=new URL('../public/',import.meta.url);
let html=await readFile(new URL('index.html',publicDir),'utf8');
html=html.replace(/<script src="[^"]+" defer><\/script>/g,'');
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>\n'+await readFile(new URL('styles.css',publicDir),'utf8')+'\n</style>');
for(const asset of ['brand.svg','companion.svg']){
  const data=await readFile(new URL('assets/'+asset,publicDir));
  html=html.replaceAll('assets/'+asset,'data:image/svg+xml;base64,'+data.toString('base64'));
}
html=html.replace('<a href="admin.html">Admin</a>','');
let scripts='<script>window.PEERBUDDY_STANDALONE_DEMO=true;</script>\n';
for(const file of ['config.js','js/questions.js','js/core.js','js/app.js']){
  let code=await readFile(new URL(file,publicDir),'utf8');
  if(file==='config.js')code=code.replace(/"supabaseUrl":\s*"[^"]*"/,'"supabaseUrl": ""').replace(/"supabasePublishableKey":\s*"[^"]*"/,'"supabasePublishableKey": ""').replace(/"demoEnabled":\s*(true|false)/,'"demoEnabled": true');
  scripts+='<script>\n'+code.replace(/<\/script/gi,'<\\/script')+'\n</script>\n';
}
html=html.replace('</body>',scripts+'</body>');
const target=resolve(process.argv[2]||'PeerBuddy_Skrining_Pratinjau.html');
await writeFile(target,html);console.log('Pratinjau mandiri dibuat: '+target);
