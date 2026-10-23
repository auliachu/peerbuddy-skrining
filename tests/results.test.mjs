import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {appEnvironment} from './dom-env.mjs';
const context={};vm.createContext(context);
for(const file of ['questions.js','core.js'])vm.runInContext(await readFile(new URL('../public/js/'+file,import.meta.url),'utf8'),context);
const core=context.PB;
const plain=value=>JSON.parse(JSON.stringify(value));
test('local HTTP previews generate secure UUIDs when crypto.randomUUID is unavailable',async()=>{
  const local={crypto:{getRandomValues:globalThis.crypto.getRandomValues.bind(globalThis.crypto)}};vm.createContext(local);
  vm.runInContext(await readFile(new URL('../public/js/core.js',import.meta.url),'utf8'),local);
  const ids=Array.from({length:100},()=>local.PB.randomUUID());
  for(const id of ids)assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(new Set(ids).size,100);
});

test('all 129 possible subscale scores map to the exact five severity bands',()=>{
  const boundaries={depression:[10,14,21,28],anxiety:[8,10,15,20],stress:[15,19,26,34]};
  const labels=['Normal','Ringan','Sedang','Parah','Sangat parah'];
  for(const [key,thresholds] of Object.entries(boundaries))for(let score=0;score<=42;score++){
    const result=core.interpretScores({depression:0,anxiety:0,stress:0,[key]:score}).find(r=>r.key===key);
    const level=thresholds.filter(min=>score>=min).length;
    assert.equal(result.category,labels[level],`${key} score ${score}`);
    assert.equal(result.score,score);
    assert.equal(result.level,level);
    assert.ok(result.description.startsWith('Skor berada dalam kategori '+labels[level].toLowerCase()+'.'));
  }
});
test('invalid or absent result scores never become a normal result',()=>{
  for(const value of [null,{}, {depression:0,anxiety:0}, {depression:'0',anxiety:0,stress:0}, {depression:-1,anxiety:0,stress:0}, {depression:43,anxiety:0,stress:0}, {depression:1.5,anxiety:0,stress:0}, {depression:NaN,anxiety:0,stress:0}])assert.throws(()=>core.interpretScores(value));
});
test('the three aspects are interpreted separately and exported alongside raw scores',()=>{
  const answers=Array(42).fill(0);
  for(const id of context.PB_QUESTIONNAIRE.scales.depression)answers[id-1]=3;
  const scores=core.scoreAnswers(answers);
  assert.deepEqual(plain(core.interpretScores(scores).map(r=>r.category)),['Sangat parah','Normal','Normal']);
  const [header,row]=core.summaryRows([{answers,depression_score:42,anxiety_score:0,stress_score:0}]);
  for(const [key,expected] of [['Kategori_depresi','Sangat parah'],['Kategori_kecemasan','Normal'],['Kategori_stres','Normal']])assert.equal(row[header.indexOf(key)],expected);
  assert.equal(header.length,row.length);
});
test('every complete answer set shows three results after submission, including zero and maximum scores',async()=>{
  for(const answer of [0,1,2,3]){
    const env=await appEnvironment();await env.complete(Array(42).fill(answer));
    assert.equal(env.$('page-5').hidden,true);
    await env.$('submit-screening').emit('click');
    assert.equal(env.$('page-5').hidden,false);
    assert.equal(env.$('screening-results').hidden,false);
    assert.equal((env.$('result-cards').innerHTML.match(/<article /g)||[]).length,3);
    assert.ok(env.$('result-cards').innerHTML.includes('<strong>'+14*answer+'</strong>'));
    const draft=JSON.parse(env.storage.get('peerbuddy-demo-draft-v1'));
    assert.deepEqual(draft.resultScores,{depression:14*answer,anxiety:14*answer,stress:14*answer});
    assert.ok(draft.answers.every(v=>v===null));assert.equal(draft.participant.email,'');
    const refreshed=await appEnvironment({storage:env.storage});
    assert.equal(refreshed.$('page-5').hidden,false);
    assert.equal(refreshed.$('result-cards').innerHTML,env.$('result-cards').innerHTML);
  }
});
test('failed writes show no result; the same answers produce results after a successful retry',async()=>{
  let calls=0;
  const env=await appEnvironment({demo:false,configured:true,fetch:async(url,options)=>{
    if(calls++===0)throw new Error('Failed to fetch');
    const body=JSON.parse(options.body);assert.equal(body.consent_version,'peerbuddy-2026-10-v2');
    return Response.json({saved:true,request_id:body.request_id,receipt_code:'PB-20261023-'+body.request_id.replaceAll('-','').slice(0,12).toUpperCase(),created_at:new Date().toISOString()});
  }});
  await env.complete(Array(42).fill(2));await env.$('submit-screening').emit('click');
  assert.equal(env.$('page-5').hidden,true);
  assert.equal(JSON.parse(env.storage.get('peerbuddy-screening-draft-v1')).resultScores,null);
  await env.$('submit-screening').emit('click');
  assert.equal(env.$('page-5').hidden,false);assert.equal(env.$('screening-results').hidden,false);
  assert.deepEqual(JSON.parse(env.storage.get('peerbuddy-screening-draft-v1')).resultScores,{depression:28,anxiety:28,stress:28});
});
test('old completed sessions do not fabricate results and old drafts ask for revised consent',async()=>{
  const env=await appEnvironment();await env.complete();await env.$('submit-screening').emit('click');
  const key='peerbuddy-demo-draft-v1',draft=JSON.parse(env.storage.get(key));delete draft.resultScores;delete draft.consentVersion;env.storage.set(key,JSON.stringify(draft));
  const legacy=await appEnvironment({storage:env.storage});
  assert.equal(legacy.$('screening-results').hidden,true);assert.equal(legacy.$('results-unavailable').hidden,false);assert.equal(legacy.$('result-cards').innerHTML,'');
  const unfinished=await appEnvironment();await unfinished.complete();
  const previous=JSON.parse(unfinished.storage.get(key));delete previous.consentVersion;unfinished.storage.set(key,JSON.stringify(previous));
  const changed=await appEnvironment({storage:unfinished.storage});
  assert.equal(changed.$('page-2').hidden,false);assert.equal(changed.$('consent-data').checked,false);assert.equal(changed.$('consent-contact').checked,false);
});
