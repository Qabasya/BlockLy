/* Тесты core/validate.js: проверка сборки. */
window.MKB = window.MKB || {};

(function () {
  var t = MKB.test, eq = MKB.eq;

  var MK3 = MKB.workshops[0];
  function mk3() { return MKB.splitFragments(MK3.stages[0].fragments, MK3.language); }
  function ids(bs) { return bs.map(function (b) { return b.id; }); }
  function statuses(r) { return r.slots.map(function (s) { return s.status; }); }
  function swap(arr, i, j) { var a = arr.slice(), x = a[i]; a[i] = a[j]; a[j] = x; return a; }
  function wrongAt(r) {
    return r.slots.filter(function (s) { return s.status !== 'ok'; }).map(function (s) { return s.index; });
  }

  t('Точное совпадение с эталоном → ok: true', function () {
    var bs = mk3();
    var r = MKB.validate(ids(bs), bs, { F0: 'White' });
    eq(r.ok, true);
    eq(r.fields, [{ id: 'F0', status: 'ok' }]);
  });

  t('Перестановка внутри free: true → ok: true', function () {
    var bs = mk3();
    var a = ids(bs);
    var r = MKB.validate([a[3], a[2], a[0], a[1]].concat(a.slice(4)), bs, { F0: 'White' });
    eq(r.ok, true);
  });

  t('Перестановка между фрагментами → два wrong', function () {
    var bs = mk3();
    var r = MKB.validate(swap(ids(bs), 3, 4), bs, { F0: 'White' });
    eq(r.ok, false);
    eq(wrongAt(r), [3, 4]);
    eq(statuses(r)[3], 'wrong');
  });

  t('Перестановка внутри несвободного тела → два wrong', function () {
    var bs = mk3();
    var r = MKB.validate(swap(ids(bs), 6, 7), bs, { F0: 'White' });
    eq(wrongAt(r), [6, 7]);
  });

  t('Подсвечиваются все ошибки, а не первая', function () {
    var bs = mk3();
    var a = swap(swap(ids(bs), 6, 7), 9, 10);
    eq(wrongAt(MKB.validate(a, bs, { F0: 'White' })), [6, 7, 9, 10]);
  });

  t('Две одинаковых FastLED.show(); в разных фрагментах → ok: true', function () {
    var bs = MKB.splitFragments([
      { code: 'void a() {\n  FastLED.show();\n}' },
      { code: 'void b() {\n  FastLED.show();\n}' }
    ], 'arduino');
    eq(MKB.validate(['b0', 'b3', 'b2', 'b1'], bs, {}).ok, true);
  });

  t('Не все слоты заполнены → empty на пустых', function () {
    var bs = mk3();
    var a = ids(bs);
    a[1] = null; a[4] = null;
    var r = MKB.validate(a, bs, { F0: 'White' });
    eq(r.ok, false);
    eq(statuses(r)[1], 'empty');
    eq(statuses(r)[4], 'empty');
    eq(wrongAt(r), [1, 4]);
  });

  t('Не поставлен открывающий блок — его тела в сборке нет, ok: false', function () {
    var bs = mk3();
    var a = ids(bs).slice(0, 8).concat([null]);   // loop не поставлен: слот пуст, тела нет
    var r = MKB.validate(a, bs, {});
    eq(r.ok, false);
    eq(statuses(r)[8], 'empty');
  });

  t('Блок с незаполненным полем находит своё место', function () {
    var bs = mk3();
    var r = MKB.validate(ids(bs), bs, {});
    eq(wrongAt(r), []);
    eq(r.fields, [{ id: 'F0', status: 'empty' }]);
    eq(r.ok, false);
  });

  t('Поля проверяются независимо от порядка', function () {
    var bs = mk3();
    eq(MKB.validate(ids(bs), bs, { F0: 'white' }).fields, [{ id: 'F0', status: 'case' }]);
    var r = MKB.validate(swap(ids(bs), 9, 10), bs, { F0: 'White' });
    eq(r.fields, [{ id: 'F0', status: 'ok' }], 'блок не на месте, значение верно');
    eq(r.ok, false);
  });

  t('Открывающие блоки переставлены вместе с телами → все их слоты wrong', function () {
    var bs = mk3();
    var a = ids(bs);
    var r = MKB.validate(a.slice(0, 5).concat(a.slice(8), a.slice(5, 8)), bs, { F0: 'White' });
    eq(wrongAt(r), [5, 6, 7, 8, 9, 10]);
  });

  t('free: строки верхнего уровня меняются местами вместе с телами', function () {
    var bs = MKB.splitFragments([{ free: true, code: 'def a():\n    x()\n    y()\ndef b():\n    z()' }], 'python');
    eq(MKB.validate(['b3', 'b4', 'b0', 'b1', 'b2'], bs, {}).ok, true);
    eq(wrongAt(MKB.validate(['b0', 'b2', 'b1', 'b3', 'b4'], bs, {})), [1, 2], 'тела free не затрагивает');
  });

  t('Хвосты в проверке не участвуют: слотов столько же, сколько блоков', function () {
    var bs = mk3();
    eq(MKB.validate(ids(bs), bs, { F0: 'White' }).slots.length, 11);
  });
})();
