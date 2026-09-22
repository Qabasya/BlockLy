/* дерево слотов в памяти. Без DOM — проверяется в tests.html.
   Сборка живёт только здесь, в памяти вкладки: никаких хранилищ. */
window.MKB = window.MKB || {};
MKB.state = MKB.state || {};

(function () {
  // Слот: { id: блок или null, kids: слоты тела } — kids есть, только пока
  // в слоте стоит открывающий блок: bodyCount пустых слотов.
  function emptySlot() { return { id: null, kids: [] }; }

  // Фишер–Йетс на месте
  function shuffleOnce(a, rnd) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1)), x = a[i];
      a[i] = a[j]; a[j] = x;
    }
    return a;
  }

  // Палитра: результат не должен совпасть с эталонным порядком
  function shuffle(ids, rnd) {
    rnd = rnd || Math.random;
    var a = ids.slice();
    for (var tries = 0; tries < 20; tries++) {
      shuffleOnce(a, rnd);
      if (a.length < 2 || a.join() !== ids.join()) return a;
    }
    return a.slice(1).concat(a[0]);     // запасной ход: сдвиг на одну позицию
  }

  // Порядок вариантов в выпадающих списках: { F0: ["Red", "White", "Blue"] }.
  // В разметке первое значение — правильное, поэтому авторский порядок
  // показывать нельзя. Перемешивается один раз на этап: иначе список прыгал
  // бы при каждой перерисовке доски. Совпадение с авторским порядком здесь
  // допустимо — из двух вариантов иначе всегда выходила бы перестановка, и
  // ответ так же выдавал бы себя, только вторым.
  function fieldOptions(blocks, rnd) {
    rnd = rnd || Math.random;
    var out = {};
    blocks.forEach(function (b) {
      b.fields.forEach(function (f) {
        if (f.options.length) out[f.id] = shuffleOnce(f.options.slice(), rnd);
      });
    });
    return out;
  }

  // Новая сборка этапа: слоты только верхнего уровня, палитра перемешана
  function create(workshop, stageIndex, rnd) {
    var stage = workshop.stages[stageIndex];
    var blocks = MKB.splitFragments(stage.fragments, workshop.language);
    return {
      workshop: workshop,
      stageIndex: stageIndex,
      stage: stage,
      blocks: blocks,
      byId: MKB.indexById(blocks),
      indent: MKB.detectIndentStep(stage.fragments, workshop.language),
      diffs: MKB.findSimilar(blocks).diffs,
      order: shuffle(blocks.map(function (b) { return b.id; }), rnd),   // порядок в палитре
      options: fieldOptions(blocks, rnd),                               // порядок вариантов в списках
      slots: blocks.filter(function (b) { return b.depth === 0; }).map(emptySlot),
      values: {}
    };
  }

  // Слот по пути: [5, 1] — второй слот тела пятого слота верхнего уровня
  function slotAt(st, path) {
    var list = st.slots, s = null;
    for (var i = 0; i < path.length; i++) {
      s = list[path[i]];
      if (!s) return null;
      list = s.kids;
    }
    return s;
  }

  // Все поставленные блоки поддерева
  function subtreeIds(slot) {
    var out = [];
    (function walk(s) {
      if (s.id) out.push(s.id);
      s.kids.forEach(walk);
    })(slot);
    return out;
  }

  function placedSet(st) {
    var set = {};
    st.slots.forEach(function (s) { subtreeIds(s).forEach(function (id) { set[id] = true; }); });
    return set;
  }

  // Поставить блок из палитры в пустой слот. Открывающий блок раскрывает тело.
  function place(st, id, path) {
    var s = slotAt(st, path), b = st.byId[id];
    if (!s || s.id || !b || placedSet(st)[id]) return false;
    s.id = id;
    s.kids = [];
    for (var i = 0; i < b.bodyCount; i++) s.kids.push(emptySlot());
    return true;
  }

  // Убрать блок из слота: он и всё его тело возвращаются в палитру,
  // слоты тела и хвост исчезают. → id возвращённых блоков
  function remove(st, path) {
    var s = slotAt(st, path);
    if (!s || !s.id) return [];
    var ids = subtreeIds(s);
    s.id = null;
    s.kids = [];
    return ids;
  }

  function isPrefix(a, b) {
    return a.length <= b.length && a.every(function (x, i) { return x === b[i]; });
  }

  // Перенести содержимое слота (с телом) в другой слот; занятый — поменять местами.
  // Нельзя переносить блок внутрь собственного тела.
  function move(st, from, to) {
    var a = slotAt(st, from), b = slotAt(st, to);
    if (!a || !b || a === b || !a.id) return false;
    if (isPrefix(from, to) || isPrefix(to, from) && b.id) return false;
    var id = a.id, kids = a.kids;
    a.id = b.id; a.kids = b.kids;
    b.id = id; b.kids = kids;
    return true;
  }

  // Обход в глубину → плоский массив id / null для validate и buildCode
  function assembled(st) {
    var out = [];
    (function walk(list) {
      list.forEach(function (s) { out.push(s.id); walk(s.kids); });
    })(st.slots);
    return out;
  }

  // Путь к первому пустому слоту в порядке обхода; нет — null
  function firstEmpty(st) {
    var found = null;
    (function walk(list, prefix) {
      list.forEach(function (s, i) {
        if (found) return;
        var p = prefix.concat(i);
        if (!s.id) found = p;
        else walk(s.kids, p);
      });
    })(st.slots, []);
    return found;
  }

  // Блоки палитры в её порядке
  function palette(st) {
    var set = placedSet(st);
    return st.order.filter(function (id) { return !set[id]; });
  }

  // Следующая строка: первая в эталонном порядке, которой ещё нет в сборке.
  // Одинаковые строки (по norm) взаимозаменяемы. → блок или null
  function nextBlock(st) {
    var have = {};
    assembled(st).forEach(function (id) {
      if (id) { var n = st.byId[id].norm; have[n] = (have[n] || 0) + 1; }
    });
    for (var i = 0; i < st.blocks.length; i++) {
      var b = st.blocks[i];
      if (have[b.norm]) have[b.norm]--;
      else return b;
    }
    return null;
  }

  function isEmpty(st) { return palette(st).length === st.blocks.length; }
  function isFull(st) { return assembled(st).every(function (id) { return id; }); }

  MKB.state.shuffle = shuffle;
  MKB.state.fieldOptions = fieldOptions;
  MKB.state.create = create;
  MKB.state.slotAt = slotAt;
  MKB.state.place = place;
  MKB.state.remove = remove;
  MKB.state.move = move;
  MKB.state.assembled = assembled;
  MKB.state.firstEmpty = firstEmpty;
  MKB.state.palette = palette;
  MKB.state.nextBlock = nextBlock;
  MKB.state.isEmpty = isEmpty;
  MKB.state.isFull = isFull;
})();
