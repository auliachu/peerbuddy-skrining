(function (root) {
  'use strict';
  const questionnaire = {
    version: 'pb-dass42-id-v1',
    source: 'Skrining Psikologis.pdf — berkas yang diberikan penyelenggara',
    period: 'satu minggu belakangan ini',
    options: [
      'Tidak sesuai dengan saya sama sekali, atau tidak pernah.',
      'Sesuai dengan saya sampai tingkat tertentu, atau kadang kadang.',
      'Sesuai dengan saya sampai batas yang dapat dipertimbangkan, atau lumayan sering.',
      'Sangat sesuai dengan saya, atau sering sekali.'
    ],
    questions: [
      'Saya merasa bahwa diri saya menjadi marah karena hal-hal sepele.',
      'Saya merasa bibir saya sering kering.',
      'Saya sama sekali tidak dapat merasakan perasaan positif.',
      'Saya mengalami kesulitan bernafas (misalnya: seringkali terengah-engah atau tidak dapat bernafas padahal tidak melakukan aktivitas fisik sebelumnya).',
      'Saya sepertinya tidak kuat lagi untuk melakukan suatu kegiatan.',
      'Saya cenderung bereaksi berlebihan terhadap suatu situasi.',
      'Saya merasa goyah (misalnya, kaki terasa mau ’copot’).',
      'Saya merasa sulit untuk bersantai.',
      'Saya menemukan diri saya berada dalam situasi yang membuat saya merasa sangat cemas dan saya akan merasa sangat lega jika semua ini berakhir.',
      'Saya merasa tidak ada hal yang dapat diharapkan di masa depan.',
      'Saya menemukan diri saya mudah merasa kesal.',
      'Saya merasa telah menghabiskan banyak energi untuk merasa cemas.',
      'Saya merasa sedih dan tertekan.',
      'Saya menemukan diri saya menjadi tidak sabar ketika mengalami penundaan (misalnya: kemacetan lalu lintas, menunggu sesuatu).',
      'Saya merasa lemas seperti mau pingsan.',
      'Saya merasa saya kehilangan minat akan segala hal.',
      'Saya merasa bahwa saya tidak berharga sebagai seorang manusia.',
      'Saya merasa bahwa saya mudah tersinggung.',
      'Saya berkeringat secara berlebihan (misalnya: tangan berkeringat), padahal temperatur tidak panas atau tidak melakukan aktivitas fisik sebelumnya.',
      'Saya merasa takut tanpa alasan yang jelas.',
      'Saya merasa bahwa hidup tidak bermanfaat.',
      'Saya merasa sulit untuk beristirahat.',
      'Saya mengalami kesulitan dalam menelan.',
      'Saya tidak dapat merasakan kenikmatan dari berbagai hal yang saya lakukan.',
      'Saya menyadari kegiatan jantung, walaupun saya tidak sehabis melakukan aktivitas fisik (misalnya: merasa detak jantung meningkat atau melemah).',
      'Saya merasa putus asa dan sedih.',
      'Saya merasa bahwa saya sangat mudah marah.',
      'Saya merasa saya hampir panik.',
      'Saya merasa sulit untuk tenang setelah sesuatu membuat saya kesal.',
      'Saya takut bahwa saya akan ‘terhambat’ oleh tugas-tugas sepele yang tidak biasa saya lakukan.',
      'Saya tidak merasa antusias dalam hal apapun.',
      'Saya sulit untuk sabar dalam menghadapi gangguan terhadap hal yang sedang saya lakukan.',
      'Saya sedang merasa gelisah.',
      'Saya merasa bahwa saya tidak berharga.',
      'Saya tidak dapat memaklumi hal apapun yang menghalangi saya untuk menyelesaikan hal yang sedang saya lakukan.',
      'Saya merasa sangat ketakutan.',
      'Saya melihat tidak ada harapan untuk masa depan.',
      'Saya merasa bahwa hidup tidak berarti.',
      'Saya menemukan diri saya mudah gelisah.',
      'Saya merasa khawatir dengan situasi dimana saya mungkin menjadi panik dan mempermalukan diri sendiri.',
      'Saya merasa gemetar (misalnya: pada tangan).',
      'Saya merasa sulit untuk meningkatkan inisiatif dalam melakukan sesuatu.'
    ],
    scales: {
      depression: [3,5,10,13,16,17,21,24,26,31,34,37,38,42],
      anxiety: [2,4,7,9,15,19,20,23,25,28,30,36,40,41],
      stress: [1,6,8,11,12,14,18,22,27,29,32,33,35,39]
    }
  };
  root.PB_QUESTIONNAIRE = questionnaire;
  if (typeof module !== 'undefined') module.exports = questionnaire;
})(globalThis);
