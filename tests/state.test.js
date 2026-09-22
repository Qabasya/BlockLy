/* Тесты js/state.js: дерево слотов в памяти. */
window.MKB = window.MKB || {};

(function () {
  var t = MKB.test, eq = MKB.eq, ok = MKB.ok, S = MKB.state;

  // МК-3: b0–b3 #define/#include, b4 CRGB, b5 setup, b6–b7 тело, b8 loop, b9–b10 тело
  function mk3() { return S.create(MKB.workshops[0], 0); }
  function py(code) {
    return S.create({ language: 'python', stages: [{ fragments: [{ code: code }], steps: [] }] }, 0);
  }

  t('Начало: только слоты верхнего уровня, все блоки в палитре', function () {
    var st = mk3();
    eq(st.slots.length, 7);
    eq(S.assembled(st), [null, null, null, null, null, null, null]);
    eq(S.palette(st).length, 11);
    ok(S.isEmpty(st));
  });

  t('Палитра перемешана и не совпадает с эталоном', function () {
    var ref = 'b0,b1,b2,b3,b4,b5,b6,b7,b8,b9,b10';
    for (var i = 0; i < 20; i++) {
      var o = mk3().order;
      ok(o.join() !== ref, 'совпало с эталоном');
      eq(o.slice().sort().join(), ref.split(',').sort().join(), 'те же блоки');
    }
  });

  t('Перемешивание: даже «плохой» генератор не оставляет эталон', function () {
    var n = 0;
    var rnd = function () { return n++ < 1000 ? 0.999 : 0; };   // первые проходы — без перестановок
    ok(S.shuffle(['a', 'b', 'c'], rnd).join() !== 'a,b,c');
  });

  t('Варианты списка перемешаны: в разметке первое значение — ответ', function () {
    var bs = MKB.splitFragments([{ code: 'a = {{One|Two|Three|Four|Five}}' }], 'python');
    var first = {};
    for (var i = 0; i < 40; i++) first[S.fieldOptions(bs).F0[0]] = true;
    ok(Object.keys(first).length > 1, 'ответ всегда стоит в списке первым');
    eq(S.fieldOptions(bs).F0.slice().sort(), bs[0].fields[0].options.slice().sort(), 'те же варианты');
  });

  t('Порядок вариантов хранится в сборке: перерисовка его не тасует', function () {
    var st = mk3();
    eq(st.options.F0.slice().sort(), ['Blue', 'Red', 'White'], 'варианты поля fill_solid');
    var before = st.options.F0.join();
    ok(S.place(st, 'b8', [6]));
    S.remove(st, [6]);
    eq(st.options.F0.join(), before, 'порядок пережил правку сборки');
  });

  t('Поставлен открывающий блок → слоты тела по bodyCount', function () {
    var st = mk3();
    ok(S.place(st, 'b8', [6]));
    eq(st.slots[6].kids.length, 2);
    eq(S.assembled(st), [null, null, null, null, null, null, 'b8', null, null]);
    eq(S.palette(st).length, 10);
  });

  t('Вложенный блок раскрывается рекурсивно', function () {
    var st = py('while True:\n    for i in range(3):\n        a()\n        b()\n    c()');
    S.place(st, 'b0', [0]);
    S.place(st, 'b1', [0, 0]);
    eq(S.slotAt(st, [0, 0]).kids.length, 2);
    eq(S.assembled(st), ['b0', 'b1', null, null, null]);
  });

  t('Открывающий блок убран → содержимое в палитру, слоты исчезают', function () {
    var st = mk3();
    S.place(st, 'b8', [6]);
    S.place(st, 'b9', [6, 0]);
    S.place(st, 'b10', [6, 1]);
    eq(S.remove(st, [6]), ['b8', 'b9', 'b10']);
    eq(st.slots[6], { id: null, kids: [] });
    eq(S.palette(st).length, 11);
  });

  t('Палитра хранит свой порядок: вернувшийся блок встаёт на прежнее место', function () {
    var st = mk3();
    var before = S.palette(st).join();
    S.place(st, 'b3', [0]);
    S.remove(st, [0]);
    eq(S.palette(st).join(), before);
  });

  t('В занятый слот и уже поставленный блок поставить нельзя', function () {
    var st = mk3();
    ok(S.place(st, 'b0', [0]));
    ok(!S.place(st, 'b1', [0]), 'слот занят');
    ok(!S.place(st, 'b0', [1]), 'блок уже стоит');
    ok(!S.place(st, 'b1', [9]), 'нет такого слота');
  });

  t('Перенос в пустой слот и обмен с занятым — вместе с телом', function () {
    var st = mk3();
    S.place(st, 'b5', [5]); S.place(st, 'b6', [5, 0]);
    S.place(st, 'b8', [6]);
    ok(S.move(st, [5], [6]));
    eq(S.assembled(st), [null, null, null, null, null, 'b8', null, null, 'b5', 'b6', null]);
    ok(S.move(st, [6, 0], [0]));
    eq(S.assembled(st)[0], 'b6');
  });

  t('Нельзя перенести блок внутрь собственного тела', function () {
    var st = mk3();
    S.place(st, 'b5', [5]);
    ok(!S.move(st, [5], [5, 0]));
  });

  t('Первый пустой слот — в порядке обхода, с заходом в тела', function () {
    var st = mk3();
    eq(S.firstEmpty(st), [0]);
    [0, 1, 2, 3, 4].forEach(function (i) { S.place(st, 'b' + i, [i]); });
    S.place(st, 'b5', [5]);
    eq(S.firstEmpty(st), [5, 0]);
  });

  t('Все слоты заполнены', function () {
    var st = mk3();
    ok(!S.isFull(st));
    ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b8'].forEach(function (id, i) { S.place(st, id, [i]); });
    S.place(st, 'b6', [5, 0]); S.place(st, 'b7', [5, 1]);
    S.place(st, 'b9', [6, 0]); S.place(st, 'b10', [6, 1]);
    ok(S.isFull(st));
    eq(MKB.validate(S.assembled(st), st.blocks, { F0: 'White' }).ok, true);
    eq(MKB.buildCode(S.assembled(st), st.blocks, { F0: 'White' }, st.indent).split('\n').length, 16);
  });

  t('Следующая строка — первая в эталоне, которой ещё нет в сборке', function () {
    var st = mk3();
    eq(S.nextBlock(st).id, 'b0');
    S.place(st, 'b1', [0]);
    eq(S.nextBlock(st).id, 'b0', 'поставлена вторая — следующая всё ещё первая');
    S.place(st, 'b0', [1]);
    eq(S.nextBlock(st).id, 'b2');
  });

  t('Следующая строка: одинаковые строки взаимозаменяемы', function () {
    var st = S.create({ language: 'arduino', stages: [{ fragments: [{ code: 'a();\nb();\na();' }], steps: [] }] }, 0);
    S.place(st, 'b2', [0]);
    eq(S.nextBlock(st).id, 'b1');
  });
})();
