(function (root) {
  'use strict';
  function randomUUID() {
    if (typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID();
    // getRandomValues also works in local HTTP previews; never use Math.random for retry tokens.
    const bytes = root.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2,'0')).join('');
    return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
  }
  const normalizeWA = value => {
    let number = String(value || '').replace(/[\s()+.-]/g, '');
    if (number.startsWith('08')) number = '62' + number.slice(1);
    return number;
  };
  function validateParticipant(data) {
    const errors = {};
    if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.trim().length > 120 || /[\u0000-\u001f]/.test(data.name)) errors.name = 'Isi nama dengan 2–120 karakter.';
    if (!Number.isInteger(Number(data.age)) || Number(data.age) < 14 || Number(data.age) > 120) errors.age = 'Isi usia dalam tahun, antara 14–120.';
    if (!['Perempuan', 'Laki-laki', 'Memilih tidak menjawab'].includes(data.gender)) errors.gender = 'Pilih salah satu pilihan jenis kelamin.';
    if (typeof data.email !== 'string' || data.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Isi alamat email yang valid.';
    if (!/^628\d{7,11}$/.test(normalizeWA(data.whatsapp))) errors.whatsapp = 'Gunakan nomor WhatsApp Indonesia, misalnya 081234567890 atau +6281234567890.';
    return errors;
  }
  const validAnswers = values => Array.isArray(values) && values.length === 42 && Array.from(values).every(x => Number.isInteger(x) && x >= 0 && x <= 3);
  function scoreAnswers(answers) {
    if (!validAnswers(answers)) throw new Error('Jawaban harus berisi 42 nilai 0–3.');
    const result = {};
    for (const [name, ids] of Object.entries(root.PB_QUESTIONNAIRE.scales)) result[name] = ids.reduce((sum, id) => sum + answers[id - 1], 0);
    return result;
  }
  // DASS-42: 14 items per scale, raw scores 0–42 (no multiplication).
  // Interpretation copy supplied by PeerBuddy, 23 October 2026.
  const categories = ['Normal','Ringan','Sedang','Parah','Sangat parah'];
  const resultScales = [
    {key:'depression',title:'Depresi',upper:[9,13,20,27,42],descriptions:[
      'Skor berada dalam kategori normal. Berdasarkan hasil skrining, gejala depresi yang dilaporkan tidak menonjol. Tetap pertimbangkan keluhan dan konteks individu; hasil ini bukan diagnosis.',
      'Skor berada dalam kategori ringan. Ada gejala terkait suasana hati atau depresi dalam tingkat ringan. Perhatikan apakah gejala menetap atau mulai memengaruhi minat, motivasi, dan aktivitas sehari-hari.',
      'Skor berada dalam kategori sedang. Gejala terkait suasana hati atau depresi cukup berarti untuk dieksplorasi lebih lanjut, termasuk durasi, minat, motivasi, penilaian diri, dan dampak pada fungsi sehari-hari.',
      'Skor berada dalam kategori parah. Gejala terkait depresi yang dilaporkan tergolong tinggi. Disarankan wawancara dan asesmen lanjutan untuk memahami kebutuhan dukungan serta dampaknya terhadap fungsi.',
      'Skor berada dalam kategori sangat parah. Gejala terkait depresi yang dilaporkan sangat tinggi dan perlu ditindaklanjuti dengan asesmen profesional secara tepat waktu. Skor ini sendiri bukan diagnosis.'
    ]},
    {key:'anxiety',title:'Kecemasan',upper:[7,9,14,19,42],descriptions:[
      'Skor berada dalam kategori normal. Berdasarkan hasil skrining, gejala kecemasan yang dilaporkan tidak menonjol. Tetap perhatikan kecemasan pada situasi tertentu bila ada; hasil ini bukan diagnosis.',
      'Skor berada dalam kategori ringan. Gejala kecemasan muncul dalam tingkat ringan. Perhatikan situasi pemicu, kekhawatiran, sensasi fisik, atau perilaku menghindar bila hal tersebut dialami.',
      'Skor berada dalam kategori sedang. Gejala kecemasan cukup berarti untuk dieksplorasi, termasuk pemicu, pola kekhawatiran, sensasi fisik, perilaku menghindar, dan dampak terhadap aktivitas.',
      'Skor berada dalam kategori parah. Gejala kecemasan yang dilaporkan tergolong tinggi. Disarankan asesmen lanjutan terkait pemicu, durasi, keluhan fisik, perilaku menghindar, dan dampak fungsional.',
      'Skor berada dalam kategori sangat parah. Gejala kecemasan yang dilaporkan sangat tinggi dan perlu ditindaklanjuti dengan asesmen profesional secara tepat waktu. Skor ini sendiri bukan diagnosis.'
    ]},
    {key:'stress',title:'Stres',upper:[14,18,25,33,42],descriptions:[
      'Skor berada dalam kategori normal. Berdasarkan hasil skrining, gejala stres yang dilaporkan tidak menonjol. Tetap perhatikan sumber tekanan dan cara mengelolanya; hasil ini bukan diagnosis.',
      'Skor berada dalam kategori ringan. Ketegangan atau kesulitan mengelola tekanan muncul dalam tingkat ringan. Perhatikan sumber tekanan, relaksasi, iritabilitas, istirahat, dan strategi koping.',
      'Skor berada dalam kategori sedang. Gejala stres cukup berarti untuk dieksplorasi, termasuk sumber tekanan, kesulitan relaksasi, iritabilitas, istirahat, dukungan sosial, dan dampak pada aktivitas.',
      'Skor berada dalam kategori parah. Gejala stres yang dilaporkan tergolong tinggi. Disarankan mengeksplorasi sumber tekanan, strategi koping, dukungan sosial, dampak terhadap fungsi, dan kebutuhan bantuan lanjutan.',
      'Skor berada dalam kategori sangat parah. Gejala stres yang dilaporkan sangat tinggi dan perlu ditindaklanjuti dengan asesmen profesional secara tepat waktu. Skor ini sendiri bukan diagnosis.'
    ]}
  ];
  function interpretScores(scores) {
    if (!scores || resultScales.some(({key}) => !Number.isInteger(scores[key]) || scores[key] < 0 || scores[key] > 42)) throw new Error('Skor setiap aspek harus berupa bilangan bulat 0–42.');
    return resultScales.map(scale => {
      const score = scores[scale.key], level = scale.upper.findIndex(max => score <= max);
      const min = level === 0 ? 0 : scale.upper[level-1]+1, max = scale.upper[level];
      return {key:scale.key,title:scale.title,score,level,category:categories[level],description:scale.descriptions[level],range:level === 4 ? '≥ '+min : min+'–'+max};
    });
  }
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Prevent spreadsheet formula execution, including leading whitespace/control characters.
  function safeCell(value) {
    let text = String(value ?? '');
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
    return text;
  }
  const csvCell = value => '"' + safeCell(value).replace(/"/g, '""') + '"';
  const csv = rows => '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  function summaryRows(records, anonymous = false) {
    const identity = anonymous ? [] : ['Nama','Usia','Jenis_kelamin','Email','WhatsApp'];
    const header = ['Kode_peserta','Waktu_tersimpan_UTC','Versi_kuesioner',...identity,'Persetujuan_data','Persetujuan_hasil','Versi_persetujuan','Skor_depresi_mentah','Skor_kecemasan_mentah','Skor_stres_mentah','Kategori_depresi','Kategori_kecemasan','Kategori_stres','Status_tindak_lanjut',...Array.from({length:42}, (_,i) => 'Soal_' + (i+1))];
    return [header,...records.map(r => [r.receipt_code,r.created_at,r.instrument_version,...(anonymous ? [] : [r.name,r.age,r.gender,r.email,r.whatsapp]),r.consent_data ? 'Ya':'Tidak',r.consent_contact ? 'Ya':'Tidak',r.consent_version,r.depression_score,r.anxiety_score,r.stress_score,...interpretScores({depression:r.depression_score,anxiety:r.anxiety_score,stress:r.stress_score}).map(result=>result.category),r.followup_status,...r.answers])];
  }
  function individualRows(record) {
    const q = root.PB_QUESTIONNAIRE;
    return [['Kode_peserta','Nama','Email','WhatsApp','Nomor_soal','Pernyataan','Skor','Pilihan_jawaban'],...q.questions.map((question,i) => [record.receipt_code,record.name,record.email,record.whatsapp,i+1,question,record.answers[i],q.options[record.answers[i]]])];
  }
  function download(content, filename, type) {
    const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content],{type}));
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const core = { randomUUID, normalizeWA, validateParticipant, validAnswers, scoreAnswers, interpretScores, escapeHTML, safeCell, csv, summaryRows, individualRows, download };
  root.PB = core;
  if (typeof module !== 'undefined') module.exports = core;
})(globalThis);
