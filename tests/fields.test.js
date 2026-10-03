/* Тесты core/fields.js: разбор {{ }} и проверка значений. */
window.MKB = window.MKB || {};

(function () {
  var t = MKB.test, eq = MKB.eq;

  t('Поле-список: варианты по порядку, маркер в norm', function () {
    var p = MKB.parseFields('fill_solid(leds, NUM_LEDS, CRGB::{{White|Red|Blue}});');
    eq(p.norm, 'fill_solid(leds, NUM_LEDS, CRGB::<F0>);');
    eq(p.fields, [{ answer: 'White', options: ['White', 'Red', 'Blue'], range: null }]);
  });

  t('Свободный ввод: без вариантов', function () {
    eq(MKB.parseFields('CRGB::{{White}}').fields, [{ answer: 'White', options: [], range: null }]);
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

  t('Диапазон: {{0-255}} — поле с границами, маркер в norm как у любого поля', function () {
    var p = MKB.parseFields('FastLED.setBrightness({{0-255}});');
    eq(p.norm, 'FastLED.setBrightness(<F0>);');
    eq(p.fields[0].range, { min: 0, max: 255, int: true });
    eq(p.fields[0].options, []);
  });

  t('Диапазон: отрицательные и дробные границы', function () {
    eq(MKB.parseRange('-10-10'), { min: -10, max: 10, int: true });
    eq(MKB.parseRange('-10--5'), { min: -10, max: -5, int: true });
    eq(MKB.parseRange('0.1-1.5'), { min: 0.1, max: 1.5, int: false });
  });

  t('Не диапазон: одно число, слова, левая граница больше правой, список', function () {
    eq(['25', '-5', 'x-1', 'a-b', '255-0', '1-2-3'].map(MKB.parseRange), [null, null, null, null, null, null]);
    eq(MKB.parseFields('x = {{1-5|10-20}};').fields[0].range, null, 'список остаётся списком');
  });

  t('Диапазон: любое число от min до max включительно → ok, остальное → wrong', function () {
    var r = MKB.parseRange('0-255');
    function c(v) { return MKB.checkValue(v, '0-255', [], r); }
    eq(['0', '128', '255', ' 42 '].map(c), ['ok', 'ok', 'ok', 'ok']);
    eq(['256', '-1', '1000'].map(c), ['wrong', 'wrong', 'wrong'], 'вне диапазона');
    eq(['abc', '12a', '1 2', '0-255', '12.5', '012', '+5'].map(c),
      ['wrong', 'wrong', 'wrong', 'wrong', 'wrong', 'wrong', 'wrong'], 'не целое число');
    eq(c(''), 'empty');
  });

  t('Диапазон с дробными границами принимает дробные числа', function () {
    var r = MKB.parseRange('0.1-1.5');
    function c(v) { return MKB.checkValue(v, '0.1-1.5', [], r); }
    eq(['0.1', '1', '1.5', '0.75'].map(c), ['ok', 'ok', 'ok', 'ok']);
    eq(['0.05', '1.6', '.5', '1.'].map(c), ['wrong', 'wrong', 'wrong', 'wrong']);
  });

  t('Диапазон: проверка сборки засчитывает число из диапазона', function () {
    var bs = MKB.splitFragments([{ code: 'FastLED.setBrightness({{0-255}});' }], 'arduino');
    eq(MKB.validate(['b0'], bs, { F0: '200' }).ok, true);
    eq(MKB.validate(['b0'], bs, { F0: '300' }).fields, [{ id: 'F0', status: 'wrong' }]);
    eq(MKB.fillFields(bs[0], { F0: '200' }), 'FastLED.setBrightness(200);', 'в код идёт введённое число');
  });

  t('Ширина диапазона — по самой длинной границе + 2', function () {
    eq(MKB.fieldWidth({ answer: '0-255', options: [], range: MKB.parseRange('0-255') }), 5);
    eq(MKB.fieldWidth({ answer: '-100-5', options: [], range: MKB.parseRange('-100-5') }), 6);
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
