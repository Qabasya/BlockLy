/* сборка итогового кода, текст файла мастер-класса. Ядро: без DOM, только namespace MKB. */
window.MKB = window.MKB || {};

(function () {
  // Итоговый код: отступ по глубине слота, введённые значения вместо полей,
  // хвосты после тела своего блока, пустая строка на границе фрагментов.
  // indent — шаг отступа в пробелах (MKB.detectIndentStep), по умолчанию 2.
  function buildCode(assembled, blocks, values, indent) {
    var pad = ' '.repeat(indent || 2);
    var byId = {};
    blocks.forEach(function (b) { byId[b.id] = b; });
    var nodes = MKB.parseAssembled(assembled, blocks);

    var lines = [];
    var lastGroup = null;
    var open = [];                      // открытые блоки с хвостом: { block, depth, end }

    function closeUntil(index) {
      while (open.length && open[open.length - 1].end <= index) {
        var o = open.pop();
        lines.push(pad.repeat(o.depth) + o.block.closer);
      }
    }

    nodes.forEach(function (node) {
      closeUntil(node.index);
      if (!node.id) return;             // пустой слот в код не попадает
      var b = byId[node.id];
      if (lastGroup !== null && b.group !== lastGroup) lines.push('');
      lastGroup = b.group;
      lines.push(pad.repeat(node.depth) + MKB.fillFields(b, values));
      if (b.closer !== null) open.push({ block: b, depth: node.depth, end: node.end });
    });
    closeUntil(Infinity);
    return lines.join('\n');
  }

  // ─── текст файла workshops/<id>.js ───

  // Строка в кавычках: JSON — валидный JS, кириллица остаётся как есть
  function q(s) { return JSON.stringify(String(s == null ? '' : s)); }

  // Многострочный код — шаблонной строкой, чтобы файл читался глазами
  function codeLiteral(code) {
    if (code.indexOf('\n') < 0) return q(code);
    return '`' + code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
  }

  function fragmentJs(f) {
    var code = String(f.code == null ? '' : f.code);
    if (code.indexOf('\n') < 0) return '        { free: ' + !!f.free + ', code: ' + q(code) + ' }';
    return '        {\n          free: ' + !!f.free + ',\n          code:\n' + codeLiteral(code) + '\n        }';
  }

  function stageJs(s) {
    return '    {\n' +
      '      id: ' + q(s.id) + ',\n' +
      '      title: ' + q(s.title) + ',\n' +
      '      fragments: [\n' + (s.fragments || []).map(fragmentJs).join(',\n') + '\n      ],\n' +
      '      steps: [\n' + (s.steps || []).map(function (st) {
        return '        { line: ' + q(st.line) + ', text: ' + q(st.text) + ' }';
      }).join(',\n') + '\n      ]\n' +
      '    }';
  }

  function workshopToJs(w) {
    return 'window.MKB = window.MKB || {};\n' +
      'window.MKB.workshops = window.MKB.workshops || [];\n' +
      'window.MKB.workshops.push({\n' +
      '  id: ' + q(w.id) + ',\n' +
      '  title: ' + q(w.title) + ',\n' +
      '  language: ' + q(w.language) + ',\n' +
      '  stages: [\n' + (w.stages || []).map(stageJs).join(',\n') + '\n  ]\n' +
      '});\n';
  }

  MKB.buildCode = buildCode;
  MKB.workshopToJs = workshopToJs;
})();
