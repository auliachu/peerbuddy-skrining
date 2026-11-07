(function () {
  'use strict';
  const cfg = window.PEERBUDDY_CONFIG, q = window.PB_QUESTIONNAIRE, core = window.PB;
  const $ = id => document.getElementById(id), esc = core.escapeHTML;
  const demo = cfg.demoEnabled === true && (new URLSearchParams(location.search).get('demo') === '1' || window.PEERBUDDY_STANDALONE_DEMO === true);
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl) && !!cfg.supabasePublishableKey;
  const storageKey = demo ? 'peerbuddy-demo-draft-v1' : 'peerbuddy-screening-draft-v1';
  let sending = false;
  const blankState = () => ({ version:q.version, consentVersion:cfg.consentVersion, page:1, batch:0, participant:{name:'',age:'',gender:'',email:'',whatsapp:''}, consentData:false, consentContact:false, answers:Array(42).fill(null), requestId:core.randomUUID(), retryToken:core.randomUUID(), accessCode:'', pending:null, receipt:null, resultScores:null, expires:Date.now()+7200000 });
  let state = blankState();
  try {
    const previous = JSON.parse(sessionStorage.getItem(storageKey));
    if (previous && previous.version === q.version && previous.expires > Date.now() && Array.isArray(previous.answers) && previous.answers.length === 42 && previous.answers.every(v => v === null || Number.isInteger(v) && v >= 0 && v <= 3) && previous.participant) state = {...state,...previous,consentVersion:previous.consentVersion || previous.pending?.consent_version || 'peerbuddy-2026-10-v1'};
    else sessionStorage.removeItem(storageKey);
  } catch { /* Storage can be disabled; the current page still works. */ }
  if (state.consentVersion !== cfg.consentVersion && !state.pending && !state.receipt) {
    state.consentData=false; state.consentContact=false; state.consentVersion=cfg.consentVersion;
    if (state.page > 2) state.page=2;
  }
  if (!configured && !demo) state = blankState();
  if (!demo && !state.accessCode && !state.receipt) state.pending=null;
  function save() { state.expires = Date.now()+7200000; try { sessionStorage.setItem(storageKey,JSON.stringify(state)); } catch {} }
  function show(page, focus = true) {
    if (!demo && page > 1 && !state.accessCode && !state.receipt) page = 1;
    if (page === 5 && !state.receipt) page = 4;
    if (page > 2 && Object.keys(core.validateParticipant(state.participant)).length) page = 2;
    if (page > 2 && (!state.consentData || !state.consentContact)) page = 2;
    if (page === 4 && !core.validAnswers(state.answers)) page = 3;
    state.page = page;
    for (let i=1;i<=5;i++) $('page-'+i).hidden = i !== page;
    document.querySelectorAll('.steps li').forEach(el => { const current = Number(el.dataset.step); el.classList.toggle('done',current < page); if (current === page) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current'); });
    if (page === 2) fillForm();
    if (page === 3) renderQuestions();
    if (page === 4) renderReview();
    if (page === 5) renderCompletion();
    save();
    if (focus) { window.scrollTo({top:0,behavior:'instant'}); $('title-'+page).focus({preventScroll:true}); }
  }
  function fillForm() {
    for (const [name,value] of Object.entries(state.participant)) if ($(name)) $(name).value = value;
    $('consent-data').checked = state.consentData; $('consent-contact').checked = state.consentContact;
  }
  function readForm() {
    for (const name of ['name','age','gender','email','whatsapp']) state.participant[name] = $(name).value;
    state.consentData = $('consent-data').checked; state.consentContact = $('consent-contact').checked; save();
  }
  function formErrors() {
    const errors = core.validateParticipant(state.participant);
    for (const name of ['name','age','gender','email','whatsapp']) {
      $(name+'-error').textContent = errors[name] || ''; $(name).setAttribute('aria-invalid',errors[name]?'true':'false'); $(name).setAttribute('aria-describedby',name+'-error');
    }
    const missing = !state.consentData || !state.consentContact;
    $('consent-error').textContent = missing ? 'Kedua persetujuan diperlukan untuk mengikuti skrining.' : '';
    $('participant-error').hidden = !Object.keys(errors).length && !missing;
    $('participant-error').textContent = 'Periksa isian yang ditandai sebelum melanjutkan.';
    if (Object.keys(errors).length) $(Object.keys(errors)[0]).focus(); else if (missing) $(state.consentData ? 'consent-contact' : 'consent-data').focus();
    return !Object.keys(errors).length && !missing;
  }
  function answeredCount() { return state.answers.filter(v => Number.isInteger(v)).length; }
  function renderProgress() {
    const count = answeredCount(); $('answer-count').textContent = count+' dari 42 terjawab'; $('progress-fill').style.width = count/42*100+'%'; document.querySelector('.progress-track').setAttribute('aria-valuenow',String(count));
    $('question-nav').innerHTML = q.questions.map((_,i) => '<button type="button" data-jump="'+i+'" class="'+(state.answers[i] !== null ? 'answered ':'')+(Math.floor(i/6) === state.batch ? 'current' : '')+'" aria-label="Pernyataan '+(i+1)+(state.answers[i] !== null ? ', sudah dijawab' : ', belum dijawab')+'">'+(i+1)+'</button>').join('');
  }
  function renderQuestions() {
    state.batch = Math.max(0,Math.min(6,Number(state.batch)||0));
    const start = state.batch*6, end = start+6;
    $('batch-label').textContent = 'Pernyataan '+(start+1)+'–'+end;
    $('batch-count').textContent = 'Bagian '+(state.batch+1)+' / 7';
    $('questions-prev').textContent = state.batch === 0 ? '← Data diri' : '← Sebelumnya';
    $('questions-next').textContent = state.batch === 6 ? 'Periksa jawaban →' : 'Berikutnya →';
    $('questions-error').hidden = true;
    $('questions-container').innerHTML = q.questions.slice(start,end).map((text,n) => {
      const i = start+n;
      return '<fieldset class="question-card" id="question-'+i+'"><legend><span class="question-id">PERNYATAAN '+(i+1)+'</span>'+esc(text)+'</legend><div class="options">'+q.options.map((option,value) => '<label class="option"><input type="radio" name="q'+i+'" value="'+value+'" data-index="'+i+'" '+(state.answers[i] === value ? 'checked' : '')+' required><span><strong>'+value+'</strong> '+esc(option)+'</span></label>').join('')+'</div></fieldset>';
    }).join(''); renderProgress();
  }
  function jumpQuestion(i) { state.batch = Math.floor(i/6); show(3); const card=$('question-'+i); card.scrollIntoView({block:'center',behavior:'instant'}); card.querySelector('input').focus({preventScroll:true}); }
  function renderReview() {
    const p = state.participant;
    const entries = [['Nama',p.name],['Usia',p.age+' tahun'],['Jenis kelamin',p.gender],['Email',p.email],['WhatsApp','+'+core.normalizeWA(p.whatsapp)],['Persetujuan','Penggunaan data, tampilan hasil, dan kontak tindak lanjut disetujui']];
    $('review-person').innerHTML = entries.map(([key,value]) => '<div><dt>'+esc(key)+'</dt><dd>'+esc(value)+'</dd></div>').join('');
    $('review-answers').innerHTML = q.questions.map((text,i) => '<div class="review-answer"><span class="number">'+(i+1)+'</span><div><p>'+esc(text)+'</p><small>'+state.answers[i]+' — '+esc(q.options[state.answers[i]])+'</small></div><button class="text-button" type="button" data-edit="'+i+'" '+(state.pending ? 'disabled' : '')+'>Ubah</button></div>').join('');
    lockPending();
  }
  function lockPending() {
    for (const name of ['edit-data','review-back']) $(name).disabled = !!state.pending || sending;
    document.querySelectorAll('[data-edit]').forEach(b => b.disabled = !!state.pending || sending);
    $('submit-screening').disabled = sending;
    $('submit-screening').textContent = sending ? 'Menyimpan jawaban…' : state.pending ? 'Coba pengiriman kembali' : demo ? 'Simulasikan pengiriman ↗' : 'Kirim jawaban ↗';
    $('submit-hint').textContent = state.pending ? 'Jawaban dikunci sementara. Coba kembali dengan data yang sama agar pengisian tidak tercatat ganda.' : demo ? 'Mode pratinjau: tidak ada data yang dikirim ke PeerBuddy.' : 'Pastikan koneksi internet aktif saat mengirim.';
  }
  function renderCompletion() {
    $('completion-message').textContent = demo ? 'Simulasi pengisian selesai. Jawaban ini tidak dikirim dan tidak tersimpan di database PeerBuddy.' : 'Jawaban Anda sudah tersimpan dan diterima oleh tim PeerBuddy.';
    $('receipt-code').textContent = state.receipt.receipt_code;
    $('receipt-time').textContent = new Date(state.receipt.created_at).toLocaleString('id-ID',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Jakarta'})+' WIB';
    $('result-timing').textContent = cfg.resultTiming;
    let results = [];
    try { results = core.interpretScores(state.resultScores); } catch { /* Earlier completed sessions have no retained scores. Never infer a zero score. */ }
    $('screening-results').hidden = results.length === 0;
    $('results-unavailable').hidden = results.length !== 0;
    $('result-cards').innerHTML = results.map(result => '<article class="result-card result-level-'+result.level+'" aria-labelledby="result-'+result.key+'"><div class="result-card-heading"><h3 id="result-'+result.key+'">'+esc(result.title)+'</h3><span class="result-category">'+esc(result.category)+'</span></div><div class="result-score"><strong>'+result.score+'</strong><span>dari 42</span></div><div class="result-meter" aria-hidden="true"><span style="width:'+result.score/42*100+'%"></span></div><p class="result-range">Rentang kategori '+esc(result.category.toLowerCase())+': '+esc(result.range)+'</p><p class="result-description">'+esc(result.description)+'</p></article>').join('');
  }
  async function submit() {
    if (sending || state.receipt) return;
    if (!demo && !state.accessCode) { show(1); return; }
    if (!core.validAnswers(state.answers) || Object.keys(core.validateParticipant(state.participant)).length || !state.consentData || !state.consentContact) { show(2); return; }
    if (!configured && !demo) { $('submit-error').hidden=false; $('submit-error').textContent='Skrining belum dibuka. Hubungi PeerBuddy untuk informasi lebih lanjut.'; return; }
    sending=true; $('submit-error').hidden=true;
    if (!state.pending) state.pending={ access_code:state.accessCode, request_id:state.requestId, retry_token:state.retryToken, instrument_version:q.version, consent_version:cfg.consentVersion, consent_data:true, consent_contact:true, participant:{name:state.participant.name.trim(),age:Number(state.participant.age),gender:state.participant.gender,email:state.participant.email.trim().toLowerCase(),whatsapp:core.normalizeWA(state.participant.whatsapp)}, answers:state.answers.slice() };
    save(); lockPending();
    let timeout;
    try {
      let receipt;
      if (demo) receipt={saved:true,request_id:state.requestId,receipt_code:'DEMO-'+state.requestId.slice(0,8).toUpperCase(),created_at:new Date().toISOString()};
      else {
        const controller=new AbortController(); timeout=setTimeout(()=>controller.abort(),20000);
        const response=await fetch(cfg.supabaseUrl+'/functions/v1/submit-screening',{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabasePublishableKey},body:JSON.stringify(state.pending),signal:controller.signal});
        const body=await response.json().catch(()=>({}));
        if (response.status === 403 && body.access_denied === true) {
          state.accessCode=''; state.pending=null; show(1);
          $('access-error').textContent=body.error;
          $('access-error').hidden=false; $('access-code').focus();
          return;
        }
        if (!response.ok) { if (response.status === 400) state.pending=null; throw new Error(body.error || 'Jawaban belum dapat dikonfirmasi tersimpan. Silakan coba kembali.'); }
        if (body.saved !== true || body.request_id !== state.requestId || !/^PB-\d{8}-[A-F0-9]{12}$/.test(body.receipt_code || '') || !Number.isFinite(Date.parse(body.created_at))) throw new Error('Konfirmasi penyimpanan belum diterima. Silakan coba kembali.');
        receipt=body;
      }
      // Retain only the three aggregate scores for this tab's result screen.
      state.resultScores=core.scoreAnswers(state.pending.answers);
      state.receipt=receipt; state.pending=null; state.accessCode=''; $('access-code').value='';
      // Erase identifying data and answers immediately after a confirmed server acknowledgement.
      state.participant={name:'',age:'',gender:'',email:'',whatsapp:''}; state.answers=Array(42).fill(null); state.retryToken=''; state.requestId=''; state.page=5;
      for(let i=1;i<=5;i++) $('page-'+i).hidden=i!==5;
      document.querySelectorAll('.steps li').forEach(el=>{el.classList.toggle('done',Number(el.dataset.step)<5);if(Number(el.dataset.step)===5)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
      $('participant-form').reset(); $('review-person').replaceChildren(); $('review-answers').replaceChildren(); $('questions-container').replaceChildren();
      save(); renderCompletion(); window.scrollTo({top:0,behavior:'instant'}); $('title-5').focus({preventScroll:true});
    } catch(error) {
      $('submit-error').hidden=false; $('submit-error').textContent = error.name==='AbortError' ? 'Koneksi terlalu lama. Status penyimpanan belum dapat dipastikan. Tekan Coba pengiriman kembali; sistem menggunakan kode yang sama untuk mencegah data ganda.' : error.message === 'Failed to fetch' ? 'Koneksi terputus. Status penyimpanan belum dapat dipastikan. Coba pengiriman kembali dengan kode yang sama.' : error.message;
      save();
    } finally { clearTimeout(timeout);sending=false;lockPending(); }
  }
  $('year').textContent=new Date().getFullYear();
  if (demo) { $('mode-banner').hidden=false;$('mode-banner').textContent='MODE PRATINJAU • Gunakan data contoh. Jawaban tidak dikirim kepada PeerBuddy.'; }
  else if(!configured){$('mode-banner').hidden=false;$('mode-banner').textContent='Skrining belum dibuka. Anda dapat melihat alurnya melalui mode pratinjau.';$('start').disabled=true;$('start').textContent='Skrining belum dibuka';$('demo-link').hidden=!cfg.demoEnabled;}
  $('access-entry').hidden=demo || !configured;
  async function start() {
    if (demo) { show(2); return; }
    if (!configured || $('start').disabled) return;
    const code=$('access-code').value.replace(/[\s-]/g,'').toUpperCase();
    $('access-error').hidden=true;
    if (!/^[0-9A-F]{32}$/.test(code)) {
      $('access-error').textContent='Masukkan kode akses dari panitia.';
      $('access-error').hidden=false; $('access-code').focus(); return;
    }
    $('start').disabled=true;
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch(cfg.supabaseUrl+'/functions/v1/submit-screening',{
        method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabasePublishableKey},
        body:JSON.stringify({action:'check_access',access_code:code}),signal:controller.signal
      });
      const body=await response.json().catch(()=>({}));
      if (!response.ok || body.allowed !== true) throw new Error(body.error || 'Kode belum dapat diperiksa. Coba lagi.');
      state.accessCode=code; $('access-code').value=''; show(2);
    } catch (e) {
      $('access-error').textContent=e.name==='AbortError' || e instanceof TypeError ? 'Koneksi terganggu. Coba periksa kode kembali.' : e.message;
      $('access-error').hidden=false;
    } finally { clearTimeout(timer); $('start').disabled=false; }
  }
  $('start').addEventListener('click',start);
  $('access-code').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();start();}});
  $('data-back').addEventListener('click',()=>{readForm();show(1);});
  $('participant-form').addEventListener('input',readForm);
  $('participant-form').addEventListener('change',readForm);
  $('participant-form').addEventListener('submit',e=>{e.preventDefault();readForm();if(formErrors())show(3);});
  $('questions-container').addEventListener('change',e=>{if(!e.target.matches('input[type=radio]'))return;const i=Number(e.target.dataset.index),value=Number(e.target.value);state.answers[i]=value;$('question-'+i).classList.remove('unanswered');save();renderProgress();});
  $('questions-prev').addEventListener('click',()=>{if(state.batch===0)show(2);else{state.batch--;show(3);}});
  $('questions-next').addEventListener('click',()=>{const missing=[];for(let i=state.batch*6;i<state.batch*6+6;i++){if(state.answers[i]===null){missing.push(i);$('question-'+i).classList.add('unanswered');}}if(missing.length){$('questions-error').hidden=false;$('questions-error').textContent='Pilih jawaban untuk pernyataan '+missing.map(i=>i+1).join(', ')+' sebelum melanjutkan.';$('question-'+missing[0]).querySelector('input').focus();return;}if(state.batch===6){const first=state.answers.indexOf(null);if(first!==-1){jumpQuestion(first);$('questions-error').hidden=false;$('questions-error').textContent='Masih ada pernyataan yang belum dijawab.';}else show(4);}else{state.batch++;show(3);}});
  $('question-nav').addEventListener('click',e=>{const button=e.target.closest('[data-jump]');if(button)jumpQuestion(Number(button.dataset.jump));});
  $('edit-data').addEventListener('click',()=>{if(!state.pending)show(2);});
  $('review-back').addEventListener('click',()=>{if(!state.pending)show(3);});
  $('review-answers').addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b&&!state.pending)jumpQuestion(Number(b.dataset.edit));});
  $('submit-screening').addEventListener('click',submit);
  $('copy-receipt').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(state.receipt.receipt_code);$('copy-receipt').textContent='Kode disalin ✓';}catch{$('copy-receipt').textContent='Salin kode yang ditampilkan di atas';}});
  window.addEventListener('pageshow',()=>{if(state.pending&&state.page!==5)show(4,false);});
  if(state.receipt){state.page=5;for(let i=1;i<=5;i++)$('page-'+i).hidden=i!==5;document.querySelectorAll('.steps li').forEach(el=>{el.classList.toggle('done',Number(el.dataset.step)<5);if(Number(el.dataset.step)===5)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});renderCompletion();}
  else show(state.pending?4:state.page,false);
})();
