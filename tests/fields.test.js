/* Тесты core/fields.js: разбор {{ }} и проверка значений. */
window.MKB = window.MKB || {};

(function () {
  var t = MKB.test, eq = MKB.eq;

  t('Поле-список: варианты по порядку, маркер в norm', function () {
    var p = MKB.parseFields('fill_solid(leds, NUM_LEDS, CRGB::{{White|Red|Blue}});');
    eq(p.norm, 'fill_solid(leds, NUM_LEDS, CRGB::<F0>);');
    eq(p.fields, [{ answer: 'White', options: ['White', 'Red', 'Blue'] }]);
  });

  t('Свободный ввод: без вариантов', function () {
    eq(MKB.parseFields('CRGB::{{White}}').fields, [{ answer: 'White', options: [] }]);
  });

  t('Свободный ввод длинного куска со скобками и запятыми', function () {
    var p = MKB.parseFields('fill_solid{{(leds, NUM_LEDS, CRGB::White)}};');
    eq(p.norm, 'fill_solid<F0>;');
    eq(p.fields[0].answer, '(leds, NUM_LEDS, CRGB::White)');
  });

  t('Два поля в строке — маркеры по порядку внутри строки', function () {
    eq(MKB.parseFields('leds[{{0}}] = CRGB::{{Red|Blue}};').norm, 'leds[<F0>] = CRGB::<F1>;');
  });

  t('id полей сквозные по этапу, поле знает свой блок', function () {
    var bs = MKB.splitFragments([{ code: 'a({{1}});\nb({{2}}, {{3}});' }], 'arduino');
    eq(bs.map(function (b) { return b.fields.map(function (f) { return f.id + '@' + f.blockId; }); }),
      [['F0@b0'], ['F1@b1', 'F2@b1']]);
    eq(bs[1].norm, 'b(<F0>, <F1>);', 'маркер не зависит от места строки');
  });

  t('Строка без полей: norm = text, fields пуст', function () {
    var b = MKB.splitFragments([{ code: 'FastLED.show();' }], 'arduino')[0];
    eq([b.norm, b.fields], ['FastLED.show();', []]);
  });

  t('Поле: верное значение → ok', function () { eq(MKB.checkValue('White', 'White'), 'ok'); });
  t('Поле: другой регистр → case', function () {
    eq(MKB.checkValue('white', 'White'), 'case');
    eq(MKB.checkValue('crgb::WHITE', 'CRGB::White'), 'case');
  });
  t('Поле: пробелы по краям обрезаются → ok', function () { eq(MKB.checkValue('  White ', 'White'), 'ok'); });
  t('Поле: лишние пробелы внутри → ok', function () {
    eq(MKB.checkValue('(leds,NUM_LEDS)', '(leds, NUM_LEDS)'), 'ok');
    eq(MKB.checkValue('( leds ,  NUM_LEDS )', '(leds, NUM_LEDS)'), 'ok');
    eq(MKB.checkValue('a  +  b', 'a+b'), 'ok');
  });
  t('Поле: пробел между словами значим', function () { eq(MKB.checkValue('intx', 'int x'), 'wrong'); });
  t('Поле: пробел между русскими словами тоже значим', function () {
    eq(MKB.checkValue('Приветмир', 'Привет мир'), 'wrong');
    eq(MKB.checkValue('Привет  мир', 'Привет мир'), 'ok', 'лишние пробелы внутри');
    eq(MKB.checkValue('привет мир', 'Привет мир'), 'case');
  });
  t('Поле: пустое → empty', function () {
    eq(MKB.checkValue('', 'White'), 'empty');
    eq(MKB.checkValue('   ', 'White'), 'empty');
    eq(MKB.checkValue(undefined, 'White'), 'empty');
  });
  t('Поле: другое значение → wrong', function () { eq(MKB.checkValue('Red', 'White'), 'wrong'); });

  t('Список: верен любой вариант', function () {
    var o = ['White', 'Red', 'Blue'];
    eq(['White', 'Red', 'Blue'].map(function (v) { return MKB.checkValue(v, 'White', o); }), ['ok', 'ok', 'ok']);
    eq(MKB.checkValue('Green', 'White', o), 'wrong', 'значения нет в списке');
    eq(MKB.checkValue('', 'White', o), 'empty');
    eq(MKB.checkValue('red', 'White', o), 'case');
  });

  t('Ширина поля — длина эталона + 2', function () {
    eq(MKB.fieldWidth({ answer: 'White' }), 7);
  });

  t('Ширина списка — по самому длинному варианту, иначе он обрежется', function () {
    eq(MKB.fieldWidth({ answer: 'Blue', options: ['Blue', 'Red', 'Magenta'] }), 9);
  });

  t('Подстановка введённых значений, не эталонных', function () {
    var b = MKB.splitFragments([{ code: 'leds[{{0}}] = CRGB::{{Red|Blue}};' }], 'arduino')[0];
    eq(MKB.fillFields(b, { F0: ' 3 ', F1: 'Blue' }), 'leds[3] = CRGB::Blue;');
    eq(MKB.fillFields(b, {}), 'leds[] = CRGB::;', 'пустые поля');
  });
})();
