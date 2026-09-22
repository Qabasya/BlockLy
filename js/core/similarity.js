/* поиск похожих строк. Ядро: без DOM, только namespace MKB.
   Строки-близнецы (`leds[0] = …` и `leds[1] = …`) — главный источник ошибок
   на уроке: ученик должен видеть, чем они отличаются. */
window.MKB = window.MKB || {};

(function () {
  var THRESHOLD = 0.8;

  // Расстояние Левенштейна, две строки таблицы
  function levenshtein(a, b) {
    var prev = [], cur = [];
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      prev = cur;
    }
    return prev[b.length];
  }

  // Сходство 0…1: 1 — строки равны
  function similarity(a, b) {
    var len = Math.max(a.length, b.length);
    return len ? 1 - levenshtein(a, b) / len : 1;
  }

  function isWord(ch) { return !!ch && /[\p{L}\p{N}_]/u.test(ch); }

  // Различающийся кусок двух строк по общему префиксу и суффиксу:
  // → [[start, end] в a, [start, end] в b].
  // Если различие задевает слово или число, спан расширяется до его границ:
  // `(1, c)` / `(12, c)` → подсвечены `1` и `12`, а не одна вставленная `2`.
  function diffSpan(a, b) {
    var p = 0, s = 0, min = Math.min(a.length, b.length);
    while (p < min && a[p] === b[p]) p++;
    while (s < min - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
    var ea = a.length - s, eb = b.length - s;
    if (isWord(a[p]) && p < ea || isWord(b[p]) && p < eb) {
      while (p > 0 && isWord(a[p - 1])) p--;
    }
    if (isWord(a[ea - 1]) && ea > p || isWord(b[eb - 1]) && eb > p) {
      while (s > 0 && isWord(a[a.length - s])) { s--; ea++; eb++; }
    }
    return [[p, ea], [p, eb]];
  }

  // Добавить спан к блоку, слив с пересекающимися; пустые спаны не нужны
  function addSpan(diffs, id, span) {
    if (span[0] >= span[1]) return;
    var list = (diffs[id] || []).concat([span.slice()]).sort(function (x, y) { return x[0] - y[0]; });
    var merged = [];
    list.forEach(function (sp) {
      var last = merged[merged.length - 1];
      if (last && sp[0] <= last[1]) last[1] = Math.max(last[1], sp[1]);
      else merged.push(sp);
    });
    diffs[id] = merged;
  }

  // → { pairs: [[idA, idB]], diffs: { id: [[start, end]] } }
  // Похожесть — по norm (шаблону): строки, отличающиеся только значением поля,
  // имеют одинаковый norm, взаимозаменяемы и близнецами не считаются.
  // Спаны — по text: их подсвечивают в отрисованной строке.
  function findSimilar(blocks) {
    var pairs = [], diffs = {};
    for (var i = 0; i < blocks.length; i++) {
      for (var j = i + 1; j < blocks.length; j++) {
        var a = blocks[i], b = blocks[j];
        if (a.norm === b.norm || similarity(a.norm, b.norm) < THRESHOLD) continue;
        pairs.push([a.id, b.id]);
        var sp = diffSpan(a.text, b.text);
        addSpan(diffs, a.id, sp[0]);
        addSpan(diffs, b.id, sp[1]);
      }
    }
    return { pairs: pairs, diffs: diffs };
  }

  MKB.levenshtein = levenshtein;
  MKB.similarity = similarity;
  MKB.findSimilar = findSimilar;
})();
