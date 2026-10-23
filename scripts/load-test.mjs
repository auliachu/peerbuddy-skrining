/* Jalankan HANYA pada proyek Supabase khusus pengujian, bukan database peserta. */
import {randomUUID} from 'node:crypto';
const {TEST_SUPABASE_URL:url,TEST_PUBLIC_KEY:key,TEST_ORIGIN:origin}=process.env;
if(process.env.CONFIRM_TEST_DATABASE!=='YES'||!url||!key||!origin)throw new Error('Set CONFIRM_TEST_DATABASE=YES, TEST_SUPABASE_URL, TEST_PUBLIC_KEY, TEST_ORIGIN untuk database khusus pengujian.');
const users=Math.min(1000,Number(process.env.TEST_USERS||500)),concurrency=Math.min(users,Number(process.env.TEST_CONCURRENCY||100));
if(!Number.isInteger(users)||users<1||!Number.isInteger(concurrency)||concurrency<1)throw new Error('Parameter jumlah pengujian tidak valid.');
const results=[],payloads=[];let next=0;
const submit=async payload=>{const start=performance.now();try{const response=await fetch(url+'/functions/v1/submit-screening',{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Origin:origin},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});const body=await response.json();return{status:response.status,ok:response.ok&&body.saved===true,request_id:body.request_id,receipt_code:body.receipt_code,ms:performance.now()-start};}catch{return{status:0,ok:false,ms:performance.now()-start};}};
await Promise.all(Array.from({length:concurrency},async()=>{for(;;){const i=next++;if(i>=users)break;const payload={request_id:randomUUID(),retry_token:randomUUID(),instrument_version:'pb-dass42-id-v1',consent_version:'peerbuddy-2026-10-v1',consent_data:true,consent_contact:true,participant:{name:'LOAD TEST '+i,age:22,gender:'Memilih tidak menjawab',email:'loadtest'+i+'@example.com',whatsapp:'628000000000'},answers:Array(42).fill(0)};payloads[i]=payload;results[i]=await submit(payload);}}));
const times=results.map(r=>r.ms).sort((a,b)=>a-b),p95=times[Math.ceil(times.length*.95)-1];
const retried=await Promise.all(payloads.slice(0,20).map(submit));
const duplicateSafe=retried.every((r,i)=>r.ok&&r.receipt_code===results[i].receipt_code);
console.log(JSON.stringify({users,concurrency,success:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,p95_ms:Math.round(p95),retries_same_receipt:duplicateSafe,status_counts:results.reduce((counts,r)=>(counts[r.status]=(counts[r.status]||0)+1,counts),{})},null,2));
if(results.some(r=>!r.ok)||!duplicateSafe)process.exitCode=1;
