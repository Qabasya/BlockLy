/* проверка сборки. Ядро: без DOM, только namespace MKB. */
window.MKB = window.MKB || {};

(function () {
  // MKB.indexById — из split.js: блоки по id

  // assembled — обход дерева слотов в глубину: id блока или null (пустой слот).
  // Под блоком идут ровно bodyCount слотов его тела, у пустого слота тела нет,
  // поэтому дерево восстанавливается однозначно.
  // → [{ index, id, depth, end }] — end: индекс сразу за поддеревом слота.
  function parseAssembled(assembled, byId) {
    var nodes = [];
    function walk(i, depth) {
      var id = assembled[i], b = id ? byId[id] : null;
      var node = { index: i, id: id || null, depth: depth, end: i + 1 };
      nodes.push(node);
      var j = i + 1;
      for (var c = 0; b && c < b.bodyCount && j < assembled.length; c++) j = walk(j, depth + 1);
      node.end = j;
      return j;
    }
    for (var i = 0; i < assembled.length;) i = walk(i, 0);
    return nodes;
  }

  // Эталон этапа: блоки по позиции и то же разбиение на поддеревья
  function referenceNodes(ref) {
    return parseAssembled(ref.map(function (b) { return b.id; }), MKB.indexById(ref));
  }

  // Для каждого слота — эталонный блок, с которым его сравнивать.
  // Обычно это блок той же позиции. В свободном фрагменте строки верхнего
  // уровня взаимозаменяемы вместе с телами: поддерево ученика сравнивается с
  // ещё не занятым эталонным поддеревом с той же первой строкой.
  function expectedFor(nodes, ref, byId) {
    var refNodes = referenceNodes(ref);
    var expected = ref.slice();
    var used = {};
    var freeDepth = {};                 // группа → глубина её взаимозаменяемых строк
    ref.forEach(function (b) { if (b.free) freeDepth[b.group] = b.depth; });
    nodes.forEach(function (node) {
      var r = ref[node.index];
      if (!r || !node.id || freeDepth[r.group] !== node.depth) return;
      var top = byId[node.id];
      var match = refNodes.filter(function (rn) {
        var rb = ref[rn.index];
        return rb.free && rb.group === r.group && !used[rn.index] && rb.norm === top.norm;
      })[0];
      if (!match) return;
      used[match.index] = true;
      for (var k = 0; k < node.end - node.index; k++) {
        expected[node.index + k] = ref[match.index + k] || null;
      }
    });
    return expected;
  }

  // Пары близнецов из similarity.js; до его подключения — пусто
  function nearPairs(blocks) {
    var set = {};
    if (!MKB.findSimilar) return set;
    MKB.findSimilar(blocks).pairs.forEach(function (p) {
      set[p[0] + '|' + p[1]] = set[p[1] + '|' + p[0]] = true;
    });
    return set;
  }

  // → { ok, slots: [{ index, status }], fields: [{ id, status }] }
  function validate(assembled, blocks, values) {
    values = values || {};
    var byId = MKB.indexById(blocks);
    var ref = blocks.slice().sort(function (a, b) { return a.position - b.position; });
    var nodes = parseAssembled(assembled, byId);
    var expected = expectedFor(nodes, ref, byId);
    var near = nearPairs(blocks);

    // Хвосты в assembled не входят — проверяются только блоки. Сравнение по norm,
    // не по id: одинаковые строки из разных фрагментов взаимозаменяемы.
    var slots = assembled.map(function (id, i) {
      if (!id) return { index: i, status: 'empty' };
      var b = byId[id], e = expected[i];
      if (e && b.norm === e.norm) return { index: i, status: 'ok' };
      if (e && near[b.id + '|' + e.id]) return { index: i, status: 'near' };
      return { index: i, status: 'wrong' };
    });

    // Поля — независимо от порядка: блок может стоять верно, а значение быть неверным
    var fields = [];
    assembled.forEach(function (id) {
      if (!id) return;
      byId[id].fields.forEach(function (f) {
        fields.push({ id: f.id, status: MKB.checkValue(values[f.id], f.answer) });
      });
    });

    var ok = assembled.length === blocks.length &&
      slots.every(function (s) { return s.status === 'ok'; }) &&
      fields.every(function (f) { return f.status === 'ok'; });

    return { ok: ok, slots: slots, fields: fields };
  }

  MKB.parseAssembled = function (assembled, blocks) { return parseAssembled(assembled, MKB.indexById(blocks)); };
  MKB.validate = validate;
})();
