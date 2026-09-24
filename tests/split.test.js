/* Тесты core/split.js: дерево из отступов, хвосты, комментарии. */
window.MKB = window.MKB || {};

(function () {
  var t = MKB.test, eq = MKB.eq;

  function split(code, free, lang) {
    return MKB.splitFragments([{ free: !!free, code: code }], lang || 'arduino');
  }
  function py(code) { return split(code, false, 'python'); }
  function texts(bs) { return bs.map(function (b) { return b.text; }); }
  // структура дерева без текста — для сравнения разных языков
  function shape(bs) {
    return bs.map(function (b) { return [b.depth, b.parentId, b.bodyCount]; });
  }
  function byText(bs, text) { return bs.filter(function (b) { return b.text === text; })[0]; }

  var ARDUINO =
`void loop() {
  for (int i = 0; i < 10; i++) {
    a();
    b();
  }
  c();
}`;
  var PYTHON =
`while True:
    for i in range(10):
        a()
        b()
    c()`;

  t('Arduino и Python с одинаковой структурой → одно дерево', function () {
    eq(shape(split(ARDUINO)), shape(py(PYTHON)));
    eq(shape(py(PYTHON)), [[0, null, 2], [1, 'b0', 2], [2, 'b1', 0], [2, 'b1', 0], [1, 'b0', 0]]);
  });

  t('`}` отдельной строкой — хвост, в блоки не попал', function () {
    var bs = split(ARDUINO);
    eq(texts(bs), ['void loop() {', 'for (int i = 0; i < 10; i++) {', 'a();', 'b();', 'c();']);
    eq(bs[0].closer, '}', 'хвост loop');
    eq(bs[1].closer, '}', 'хвост for');
    eq(bs[2].closer, null, 'у обычной строки хвоста нет');
  });

  t('Python: хвостов нет', function () {
    py(PYTHON).forEach(function (b) { eq(b.closer, null, b.text); });
  });

  t('`});` — хвост', function () {
    var bs = split('server.on("/", []() {\n  handle();\n});');
    eq(texts(bs), ['server.on("/", []() {', 'handle();']);
    eq(bs[0].closer, '});');
  });

  t('`)` многострочного вызова — хвост', function () {
    var bs = py('print(\n    a,\n    b\n)');
    eq(texts(bs), ['print(', 'a,', 'b']);
    eq(bs[0].closer, ')');
  });

  t('`} else {` — обычный открывающий блок', function () {
    var bs = split('if (a) {\n  x();\n} else {\n  y();\n}');
    eq(texts(bs), ['if (a) {', 'x();', '} else {', 'y();']);
    eq(shape(bs), [[0, null, 1], [1, 'b0', 0], [0, null, 1], [1, 'b2', 0]]);
    eq(bs[0].closer, null, 'if закрыт строкой else, не хвостом');
    eq(bs[2].closer, '}', 'хвост у else');
  });

  t('`elif x:` — обычный открывающий блок', function () {
    var bs = py('if a:\n    x()\nelif b:\n    y()\nelse:\n    z()');
    eq(shape(bs), [[0, null, 1], [1, 'b0', 0], [0, null, 1], [1, 'b2', 0], [0, null, 1], [1, 'b4', 0]]);
  });

  t('Цикл внутри цикла → depth 2, parentId верный', function () {
    var bs = py(PYTHON);
    var a = byText(bs, 'a()');
    eq(a.depth, 2);
    eq(a.parentId, byText(bs, 'for i in range(10):').id);
  });

  t('Шаг отступа 2 и 4 → одинаковый depth', function () {
    var two = split('void f() {\n  if (x) {\n    y();\n  }\n}');
    var four = split('void f() {\n    if (x) {\n        y();\n    }\n}');
    eq(MKB.detectIndentStep([{ code: 'a\n  b' }]), 2);
    eq(MKB.detectIndentStep([{ code: 'a\n    b' }]), 4);
    eq(shape(two), shape(four));
    eq(two.map(function (b) { return b.depth; }), [0, 1, 2]);
  });

  t('Табы вместо пробелов → depth верный', function () {
    var bs = split('void f() {\n\tif (x) {\n\t\ty();\n\t}\n}');
    eq(bs.map(function (b) { return b.depth; }), [0, 1, 2]);
    eq(bs[1].closer, '}');
  });

  t('Пустые строки отброшены', function () {
    eq(texts(split('a();\n\n   \nb();')), ['a();', 'b();']);
  });

  t('Отступ в text не хранится', function () {
    eq(split('f() {\n    g();\n}')[1].text, 'g();');
  });

  t('Скачок отступа больше чем на уровень — глубина +1', function () {
    var bs = split('f() {\n        g();\n}');
    eq(bs[1].depth, 1);
    eq(bs[1].parentId, 'b0');
  });

  t('Arduino: комментарий `//` в конце строки удалён', function () {
    eq(texts(split('a(); // зажечь\nb();//пин')), ['a();', 'b();']);
  });

  t('Python: комментарий `#` в конце строки удалён, в том числе без пробела', function () {
    eq(texts(py('x = 1  # счётчик\ny = 2 #шаг')), ['x = 1', 'y = 2']);
  });

  t('Строка-комментарий целиком отброшена', function () {
    eq(texts(split('// заголовок\na();')), ['a();']);
    eq(texts(py('# заголовок\n#ещё\nb()')), ['b()']);
  });

  t('Arduino: `#define` и `#include` — не комментарии', function () {
    eq(texts(split('#define LED_PIN 5 // пин\n#include <FastLED.h>')), ['#define LED_PIN 5', '#include <FastLED.h>']);
  });

  t('Python: `//` — деление, не комментарий', function () {
    eq(texts(py('half = n // 2  # половина')), ['half = n // 2']);
  });

  t('`//` и `#` внутри кавычек сохранены', function () {
    eq(texts(split('Serial.println("http://site.ru"); // адрес')), ['Serial.println("http://site.ru");']);
    eq(texts(py("print('#1', \"#2\")  # номер")), ["print('#1', \"#2\")"]);
  });

  t('Экранированная кавычка не закрывает строку', function () {
    eq(texts(split('s = "a\\"//b"; // c')), ['s = "a\\"//b";']);
  });

  t('Язык не указан — комментарии не трогаются', function () {
    eq(texts(MKB.splitFragments([{ code: 'a(); // x' }])), ['a(); // x']);
  });

  t('Строка с `<` и `&` сохраняется как есть', function () {
    eq(texts(split('if (a < b && c) {\n  x<int>();\n}')), ['if (a < b && c) {', 'x<int>();']);
  });

  t('Позиции, id и номера фрагментов сквозные по этапу', function () {
    var bs = MKB.splitFragments([{ code: 'a();\nb();' }, { code: 'c();' }], 'arduino');
    eq(bs.map(function (b) { return [b.id, b.position, b.group]; }), [['b0', 0, 1], ['b1', 1, 1], ['b2', 2, 2]]);
  });

  t('free касается только верхнего уровня фрагмента', function () {
    var bs = split('a() {\n  x();\n}\nb();', true);
    eq(bs.map(function (b) { return b.free; }), [true, false, true]);
  });

  t('МК-3: 11 блоков, тела и хвосты', function () {
    var bs = MKB.splitFragments(MKB.fixtures.mk3.stages[0].fragments, MKB.fixtures.mk3.language);
    eq(bs.length, 11);
    var setup = byText(bs, 'void setup() {'), loop = byText(bs, 'void loop() {');
    eq([setup.bodyCount, setup.closer, loop.bodyCount, loop.closer], [2, '}', 2, '}']);
    eq(bs.map(function (b) { return b.group; }), [1, 1, 1, 1, 2, 3, 3, 3, 4, 4, 4]);
    eq(bs.map(function (b) { return b.free; }), [true, true, true, true, false, false, false, false, false, false, false]);
    eq(byText(bs, 'FastLED.show();').parentId, loop.id);
    // тексты блоков совпадают со строками шагов
    eq(texts(bs), MKB.fixtures.mk3.stages[0].steps.map(function (s) { return s.line; }));
  });
})();
