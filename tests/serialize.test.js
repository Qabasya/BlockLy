/* Тесты core/serialize.js: итоговый код и текст файла мастер-класса. */
window.MKB = window.MKB || {};

(function () {
  var t = MKB.test, eq = MKB.eq;

  var MK3 = MKB.fixtures.mk3;
  function ids(bs) { return bs.map(function (b) { return b.id; }); }

  // код из модалки успеха в mockups/03-student.html
  var FINAL =
`#define LED_PIN 5
#define NUM_LEDS 30
#define POT A0
#include <FastLED.h>

CRGB leds[NUM_LEDS];

void setup() {
  FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(200);
}

void loop() {
  fill_solid(leds, NUM_LEDS, CRGB::White);
  FastLED.show();
}`;

  t('buildCode: МК-3 совпадает с кодом из макета', function () {
    var st = MK3.stages[0];
    var bs = MKB.splitFragments(st.fragments, MK3.language);
    eq(MKB.buildCode(ids(bs), bs, { F0: 'White' }, MKB.detectIndentStep(st.fragments, MK3.language)), FINAL);
  });

  t('buildCode: подставляются введённые значения, не эталонные', function () {
    var bs = MKB.splitFragments(MK3.stages[0].fragments, MK3.language);
    MKB.ok(MKB.buildCode(ids(bs), bs, { F0: 'Blue' }).indexOf('CRGB::Blue);') > 0);
  });

  t('buildCode: вложенные хвосты на местах, отступы по глубине', function () {
    var code = 'void loop() {\n  for (int i = 0; i < 3; i++) {\n    a();\n  }\n  b();\n}';
    var bs = MKB.splitFragments([{ code: code }], 'arduino');
    eq(MKB.buildCode(ids(bs), bs, {}, 2), code);
  });

  t('buildCode: Python с шагом 4, без хвостов', function () {
    var code = 'while True:\n    for i in range(3):\n        a()\n    b()';
    var bs = MKB.splitFragments([{ code: code }], 'python');
    eq(MKB.buildCode(ids(bs), bs, {}, 4), code);
  });

  t('buildCode: отступ по месту в дереве, не по эталону', function () {
    var bs = MKB.splitFragments([{ code: 'f() {\n  a();\n}\nb();' }], 'arduino');
    // b() поставлен в тело f(), a() — на верхний уровень
    eq(MKB.buildCode(['b0', 'b2', 'b1'], bs, {}, 2), 'f() {\n  b();\n}\na();');
  });

  t('buildCode: пустые слоты пропускаются, хвост остаётся', function () {
    var bs = MKB.splitFragments([{ code: 'f() {\n  a();\n}' }], 'arduino');
    eq(MKB.buildCode(['b0', null], bs, {}, 2), 'f() {\n}');
  });

  function roundTrip(w) {
    var fake = {};
    new Function('window', MKB.workshopToJs(w))(fake);
    return fake.MKB.workshops[0];
  }

  t('workshopToJs: файл даёт тот же мастер-класс (МК-3)', function () {
    eq(roundTrip(MK3), MK3);
  });

  t('workshopToJs: обратные кавычки, ${ } и обратный слеш в коде', function () {
    var w = {
      id: 'py1', title: 'Py-1: "Кавычки"', language: 'python',
      stages: [{
        id: 's1', title: 'Этап',
        fragments: [
          { free: false, code: 'print(`a`)\nprint("${x}\\n")\nprint(\'\\\\\')' },
          { free: true, code: 'x = 1' }
        ],
        steps: [{ line: 'x = 1', text: 'Строка с "кавычками" и \\' }]
      }]
    };
    eq(roundTrip(w), w);
  });

  t('workshopToJs: файл подключается в namespace и дописывает список', function () {
    var fake = { MKB: { workshops: [{ id: 'old' }] } };
    new Function('window', MKB.workshopToJs(MK3))(fake);
    eq(fake.MKB.workshops.map(function (w) { return w.id; }), ['old', 'mk3']);
  });
})();
