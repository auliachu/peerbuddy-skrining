type Environment = {
  url: string; serviceKey: string; publicKey: string; allowedOrigins: string[]; rateSalt: string;
};
type Participant = {name:string;age:number;gender:string;email:string;whatsapp:string};
type Submission = {request_id:string;retry_token:string;instrument_version:string;consent_version:string;consent_data:boolean;consent_contact:boolean;participant:Participant;answers:number[]};
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function validateSubmission(input: unknown): {data?:Submission;error?:string} {
  if (!input || typeof input!=='object') return {error:'Format pengiriman tidak sesuai.'};
  const body=input as Submission, p=body.participant;
  if(!UUID.test(body.request_id||'')||!UUID.test(body.retry_token||''))return{error:'Kode pengisian tidak valid. Muat ulang halaman.'};
  if(body.instrument_version!=='pb-dass42-id-v1'||!['peerbuddy-2026-10-v1','peerbuddy-2026-10-v2'].includes(body.consent_version))return{error:'Versi skrining berubah. Hubungi PeerBuddy.'};
  if(body.consent_data!==true||body.consent_contact!==true)return{error:'Persetujuan peserta belum lengkap.'};
  if(!p||typeof p.name!=='string'||p.name.trim().length<2||p.name.trim().length>120||/[\u0000-\u001f]/.test(p.name))return{error:'Nama tidak valid.'};
  if(!Number.isInteger(p.age)||p.age<14||p.age>120)return{error:'Usia tidak valid.'};
  if(!['Perempuan','Laki-laki','Memilih tidak menjawab'].includes(p.gender))return{error:'Pilihan jenis kelamin tidak valid.'};
  if(typeof p.email!=='string'||p.email.trim().length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()))return{error:'Email tidak valid.'};
  if(typeof p.whatsapp!=='string'||!/^628\d{7,11}$/.test(p.whatsapp))return{error:'Nomor WhatsApp tidak valid.'};
  if(!Array.isArray(body.answers)||body.answers.length!==42||!Array.from(body.answers).every(v=>Number.isInteger(v)&&v>=0&&v<=3))return{error:'Semua 42 pernyataan harus memiliki jawaban 0–3.'};
  return{data:{request_id:body.request_id.toLowerCase(),retry_token:body.retry_token.toLowerCase(),instrument_version:body.instrument_version,consent_version:body.consent_version,consent_data:true,consent_contact:true,participant:{name:p.name.trim(),age:p.age,gender:p.gender,email:p.email.trim().toLowerCase(),whatsapp:p.whatsapp},answers:body.answers.slice()}};
}
async function digest(value:string):Promise<string>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');}

export function createHandler(env:Environment,transport:typeof fetch=fetch){
  return async(request:Request):Promise<Response>=>{
    const origin=request.headers.get('origin')||'',allowed=env.allowedOrigins.includes(origin);
    const headers:Record<string,string>={'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
    if(allowed){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='content-type,apikey';headers['Access-Control-Allow-Methods']='POST,OPTIONS';}
    const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
    if(!env.url||!env.serviceKey||!env.publicKey||env.rateSalt.length<16||!env.allowedOrigins.length)return reply({error:'Skrining belum dibuka. Hubungi PeerBuddy.'},503);
    if(!allowed)return reply({error:'Alamat website tidak diizinkan.'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return reply({error:'Metode tidak didukung.'},405);
    if(request.headers.get('apikey')!==env.publicKey)return reply({error:'Konfigurasi akses website tidak sesuai.'},403);
    if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return reply({error:'Format pengiriman harus JSON.'},415);
    const claimedLength=Number(request.headers.get('content-length')||0);
    if(claimedLength>16384)return reply({error:'Data pengiriman terlalu besar.'},413);
    let raw:string;
    try{
      const reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
      if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();return reply({error:'Data pengiriman terlalu besar.'},413);}chunks.push(value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}raw=new TextDecoder().decode(bytes);
    }catch{return reply({error:'Data pengiriman tidak dapat dibaca.'},400);}
    let input:unknown;try{input=JSON.parse(raw);}catch{return reply({error:'Format pengiriman tidak sesuai.'},400);}
    const validation=validateSubmission(input);if(validation.error)return reply({error:validation.error},400);
    const data=validation.data!;
    const {retry_token,...databasePayload}=data;
    const clientIP=(request.headers.get('cf-connecting-ip')||request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unavailable').trim();
    const hashes=await Promise.all([digest(retry_token),digest(JSON.stringify(databasePayload)),digest(env.rateSalt+'|'+clientIP)]);
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await transport(env.url+'/rest/v1/rpc/submit_screening',{method:'POST',headers:{apikey:env.serviceKey,Authorization:'Bearer '+env.serviceKey,'Content-Type':'application/json'},body:JSON.stringify({p_data:databasePayload,p_token_hash:hashes[0],p_payload_hash:hashes[1],p_rate_key:hashes[2]}),signal:controller.signal});
      const result=await response.json().catch(()=>({}));
      if(!response.ok){const message=String(result.message||'');if(message.includes('RATE_LIMITED'))return reply({error:'Pengiriman sedang padat. Coba kembali beberapa saat lagi.'},429);if(message.includes('SUBMISSION_CONFLICT'))return reply({error:'Kode pengisian sudah digunakan untuk data berbeda. Hubungi PeerBuddy dengan kode pengisian ini.'},409);return reply({error:'Penyimpanan belum dapat dikonfirmasi. Coba pengiriman kembali.'},503);}
      if(result.saved!==true||result.request_id!==data.request_id||typeof result.receipt_code!=='string'||!Number.isFinite(Date.parse(result.created_at)))return reply({error:'Konfirmasi penyimpanan belum tersedia. Coba kembali.'},503);
      // Return only a receipt. No identities, answers, or mental-health scores.
      return reply({saved:true,request_id:result.request_id,receipt_code:result.receipt_code,created_at:result.created_at});
    }catch{return reply({error:'Koneksi penyimpanan terganggu. Coba pengiriman kembali dengan data yang sama.'},503);}finally{clearTimeout(timeout);}
  };
}
