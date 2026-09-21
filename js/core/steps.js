/* шаги: перенос описаний при повторном разборе. Ядро: без DOM, только namespace MKB.
   Описание привязано к тексту строки (line). Одинаковых строк в этапе быть не
   должно; если есть — k-е вхождение получает описание k-го вхождения. */
window.MKB = window.MKB || {};

(function () {
  // Очереди описаний по тексту строки
  function byLine(steps) {
    var m = {};
    (steps || []).forEach(function (s) { (m[s.line] = m[s.line] || []).push(s.text || ''); });
    return m;
  }

  // Новые шаги для блоков: у неизменившихся строк описание сохраняется
  function transferSteps(blocks, oldSteps) {
    var m = byLine(oldSteps);
    return blocks.map(function (b) {
      var q = m[b.text];
      return { line: b.text, text: q && q.length ? q.shift() : '' };
    });
  }

  // Шаги соответствуют блокам строка в строку — код с прошлого разбора не менялся
  function stepsInSync(blocks, steps) {
    steps = steps || [];
    return blocks.length === steps.length &&
      blocks.every(function (b, i) { return b.text === steps[i].line; });
  }

  // Что будет при повторном разборе: { kept, lost, fresh } —
  // описания сохранятся / пропадут; новые строки без описания
  function reparseSummary(blocks, oldSteps) {
    var m = byLine(oldSteps), kept = 0, fresh = 0;
    blocks.forEach(function (b) {
      var q = m[b.text];
      if (q && q.length) { if (q.shift()) kept++; } else fresh++;
    });
    var lost = 0;
    Object.keys(m).forEach(function (k) { m[k].forEach(function (t) { if (t) lost++; }); });
    return { kept: kept, lost: lost, fresh: fresh };
  }

  // Есть ли хоть одно описание
  function hasDescriptions(steps) {
    return (steps || []).some(function (s) { return s.text && s.text.trim(); });
  }

  MKB.transferSteps = transferSteps;
  MKB.stepsInSync = stepsInSync;
  MKB.reparseSummary = reparseSummary;
  MKB.hasDescriptions = hasDescriptions;
})();
