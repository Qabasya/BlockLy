/* Тесты core/similarity.js: близнецы и спаны различий. */
window.MKB = window.MKB || {};

(function () {
  var t = MKB.test, eq = MKB.eq;

  function split(code, lang) { return MKB.splitFragments([{ code: code }], lang || 'arduino'); }

  t('Левенштейн', function () {
    eq(MKB.levenshtein('kitten', 'sitting'), 3);
    eq(MKB.levenshtein('', 'abc'), 3);
    eq(MKB.levenshtein('abc', 'abc'), 0);
  });

  t('Близнецы leds[0] / leds[1] → пара, спаны на 0 и 1', function () {
    var bs = split('leds[0] = CRGB::Red;\nleds[1] = CRGB::Red;');
    var r = MKB.findSimilar(bs);
    eq(r.pairs, [['b0', 'b1']]);
    eq(r.diffs, { b0: [[5, 6]], b1: [[5, 6]] });
    eq(bs[0].text.slice(5, 6) + bs[1].text.slice(5, 6), '01');
  });

  t('Различие внутри числа — подсвечено число целиком', function () {
    var r = MKB.findSimilar(split('setPixelColor(1, c);\nsetPixelColor(12, c);'));
    eq(r.diffs, { b0: [[14, 15]], b1: [[14, 16]] });
    r = MKB.findSimilar(split('delay(100);\ndelay(1000);'));
    eq(r.diffs, { b0: [[6, 9]], b1: [[6, 10]] });
  });

  t('Различие внутри слова — подсвечено слово целиком', function () {
    var bs = split('digitalWrite(LED, HIGH);\ndigitalWrite(LED, LOW);');
    var r = MKB.findSimilar(bs);
    eq([bs[0].text.slice.apply(bs[0].text, r.diffs.b0[0]), bs[1].text.slice.apply(bs[1].text, r.diffs.b1[0])], ['HIGH', 'LOW']);
  });

  t('Различие в знаке — соседнее слово не захватывается', function () {
    var r = MKB.findSimilar(split('x = a + b;\nx = a - b;', 'python'));
    eq(r.diffs, { b0: [[6, 7]], b1: [[6, 7]] });
  });

  t('Лишний символ-знак — у короткой строки спана нет', function () {
    var r = MKB.findSimilar(split('foo(a, b);\nfoo(a, b));'));
    eq(r.diffs, { b1: [[9, 10]] });
  });

  t('Порог 0.8: x = 1 / x = 2 — пара, a(); / b(); — нет', function () {
    eq(MKB.findSimilar(split('x = 1\nx = 2', 'python')).pairs.length, 1);
    eq(MKB.findSimilar(split('a();\nb();')).pairs.length, 0);
  });

  t('Одинаковые строки — не близнецы', function () {
    eq(MKB.findSimilar(MKB.splitFragments([{ code: 'FastLED.show();' }, { code: 'FastLED.show();' }], 'arduino')).pairs, []);
  });

  t('Строки, отличающиеся только значением поля, — не близнецы', function () {
    eq(MKB.findSimilar(split('c = CRGB::{{Red}};\nc = CRGB::{{Blue}};')).pairs, []);
  });

  t('Строка в двух парах — спаны слиты', function () {
    var r = MKB.findSimilar(split('leds[0] = CRGB::Red;\nleds[1] = CRGB::Red;\nleds[2] = CRGB::Red;'));
    eq(r.pairs.length, 3);
    eq(r.diffs.b1, [[5, 6]]);
  });

  t('В МК-3 близнецов нет', function () {
    var w = MKB.workshops[0];
    eq(MKB.findSimilar(MKB.splitFragments(w.stages[0].fragments, w.language)).pairs, []);
  });

  t('Близнецы переставлены → два near, не wrong', function () {
    var bs = split('leds[0] = CRGB::Red;\nleds[1] = CRGB::Red;\nFastLED.show();');
    var r = MKB.validate(['b1', 'b0', 'b2'], bs, {});
    eq(r.slots.map(function (s) { return s.status; }), ['near', 'near', 'ok']);
    eq(r.ok, false);
  });

  t('Неверный блок без близнеца → wrong', function () {
    var bs = split('leds[0] = CRGB::Red;\nleds[1] = CRGB::Red;\nFastLED.show();');
    var r = MKB.validate(['b2', 'b1', 'b0'], bs, {});
    eq(r.slots.map(function (s) { return s.status; }), ['wrong', 'ok', 'wrong']);
  });
})();
