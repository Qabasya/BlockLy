/* фрагменты → дерево блоков. Ядро: без DOM, только namespace MKB.
   Вложенность — только из отступов (правило 1), хвосты — строки из
   закрывающей пунктуации (правило 2). Синтаксис языков не разбирается:
   язык задаёт только вид комментария. */
window.MKB = window.MKB || {};

(function () {
  var TAB = 4;                          // ширина таба при разворачивании
  var TAIL_RE = /^[)\]}\s;,]+$/;        // правило 2: строка-хвост

  // табы → пробелы до ближайшей позиции, кратной TAB
  function expandTabs(line) {
    var out = '';
    for (var i = 0; i < line.length; i++) {
      if (line[i] === '\t') out += ' '.repeat(TAB - (out.length % TAB));
      else out += line[i];
    }
    return out;
  }

  // Как начинается комментарий в каждом языке. Язык влияет только на это —
  // структура программы берётся из отступов. В Python `//` — деление, в
  // Arduino `#` — директива (`#define`, `#include`).
  var COMMENT = { arduino: '//', python: '#' };

  // Удаление комментария: только вне кавычек. Язык неизвестен — строка как есть.
  function stripComment(line, language) {
    var mark = COMMENT[language];
    if (!mark) return line;
    var quote = null;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (quote) {
        if (ch === '\\') i++;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (line.startsWith(mark, i)) return line.slice(0, i);
    }
    return line;
  }

  // Строки этапа без комментариев и пустых строк: { indent, text, group, free }
  function cleanLines(fragments, language) {
    var out = [];
    fragments.forEach(function (frag, fi) {
      String(frag.code || '').split(/\r?\n/).forEach(function (raw) {
        var line = stripComment(expandTabs(raw), language).replace(/\s+$/, '');
        if (!line.trim()) return;
        out.push({
          indent: line.length - line.trimStart().length,
          text: line.trim(),
          group: fi + 1,
          free: !!frag.free
        });
      });
    });
    return out;
  }

  // Шаг отступа — первый ненулевой отступ в этапе; нет вложенности — 1
  function detectIndentStep(fragments, language) {
    var lines = cleanLines(fragments, language);
    for (var i = 0; i < lines.length; i++) if (lines[i].indent > 0) return lines[i].indent;
    return 1;
  }

  // language: "arduino" | "python" — нужен только для удаления комментариев
  function splitFragments(fragments, language) {
    var lines = cleanLines(fragments, language);
    var step = detectIndentStep(fragments, language);
    var blocks = [];
    var stack = [];                     // stack[d] — последний блок глубины d

    lines.forEach(function (ln) {
      // глубина не может прыгнуть больше чем на уровень вглубь
      var depth = Math.min(Math.round(ln.indent / step), stack.length);

      if (TAIL_RE.test(ln.text) && attachTail(blocks, depth, ln.text)) return;

      var parent = depth > 0 ? stack[depth - 1] : null;
      var b = {
        id: 'b' + blocks.length,
        text: ln.text,
        norm: ln.text,                  // маркеры полей подставит fields.js
        depth: depth,
        parentId: parent ? parent.id : null,
        position: blocks.length,
        group: ln.group,
        free: ln.free,
        bodyCount: 0,
        closer: null,
        fields: []
      };
      if (parent) parent.bodyCount++;
      blocks.push(b);
      stack.length = depth;
      stack.push(b);
    });

    markFree(blocks);
    if (MKB.applyFields) blocks.forEach(MKB.applyFields);
    return blocks;
  }

  // Хвост привязывается к последнему блоку той же глубины, если между ними не
  // было строк мельче и у блока ещё нет хвоста. Не нашлось — это обычная строка.
  function attachTail(blocks, depth, text) {
    for (var i = blocks.length - 1; i >= 0; i--) {
      var b = blocks[i];
      if (b.depth > depth) continue;
      if (b.depth < depth || b.closer !== null) return false;
      b.closer = text;
      return true;
    }
    return false;
  }

  // `free` касается только строк верхнего уровня своего фрагмента
  function markFree(blocks) {
    var minDepth = {};
    blocks.forEach(function (b) {
      if (!(b.group in minDepth) || b.depth < minDepth[b.group]) minDepth[b.group] = b.depth;
    });
    blocks.forEach(function (b) { b.free = b.free && b.depth === minDepth[b.group]; });
  }

  MKB.expandTabs = expandTabs;
  MKB.stripComment = stripComment;
  MKB.detectIndentStep = detectIndentStep;
  MKB.isTail = function (text) { return TAIL_RE.test(text); };
  MKB.splitFragments = splitFragments;
})();
