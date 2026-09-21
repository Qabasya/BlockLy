/* Тесты админки без DOM: перенос описаний, выравнивание отступов, id файла. */
window.MKB = window.MKB || {};

(function () {
  var t = MKB.test, eq = MKB.eq;
  function split(code) { return MKB.splitFragments([{ code: code }], 'arduino'); }

  t('Перенос описаний: неизменившиеся строки сохраняют описание', function () {
    var old = [{ line: 'a();', text: 'А' }, { line: 'b();', text: 'Б' }, { line: 'c();', text: 'В' }];
    eq(MKB.transferSteps(split('a();\nx();\nc();'), old),
      [{ line: 'a();', text: 'А' }, { line: 'x();', text: '' }, { line: 'c();', text: 'В' }]);
  });

  t('Перенос описаний: одинаковые строки — k-е вхождение к k-му', function () {
    var old = [{ line: 'a();', text: '1' }, { line: 'b();', text: 'Б' }, { line: 'a();', text: '2' }];
    eq(MKB.transferSteps(split('a();\na();'), old).map(function (s) { return s.text; }), ['1', '2']);
  });

  t('Перенос описаний: порядок строк поменялся — описания едут со строками', function () {
    var old = [{ line: 'a();', text: 'А' }, { line: 'b();', text: 'Б' }];
    eq(MKB.transferSteps(split('b();\na();'), old).map(function (s) { return s.text; }), ['Б', 'А']);
  });

  t('Код не менялся — шаги в синхроне', function () {
    var w = MKB.workshops[0], st = w.stages[0];
    eq(MKB.stepsInSync(MKB.splitFragments(st.fragments, w.language), st.steps), true);
    eq(MKB.stepsInSync(split('a();'), [{ line: 'b();', text: '' }]), false);
    eq(MKB.stepsInSync(split('a();'), []), false);
  });

  t('Сводка для модалки повторного разбора', function () {
    var old = [{ line: 'a();', text: 'А' }, { line: 'b();', text: 'Б' }, { line: 'c();', text: '' }];
    // a сохранит, b пропадёт, c без описания пропадёт незаметно, x и y новые
    eq(MKB.reparseSummary(split('a();\nx();\ny();'), old), { kept: 1, lost: 1, fresh: 2 });
  });

  t('Есть ли описания', function () {
    eq(MKB.hasDescriptions([{ line: 'a', text: ' ' }]), false);
    eq(MKB.hasDescriptions([{ line: 'a', text: 'x' }]), true);
    eq(MKB.hasDescriptions(undefined), false);
  });

  t('Выровнять отступы: 4 → 2, табы, пробелы в конце', function () {
    eq(MKB.alignIndent('void f() {  \n    if (x) {\n\t\ty();\n    }\n}', 2),
      'void f() {\n  if (x) {\n    y();\n  }\n}');
  });

  t('Выровнять отступы: Python к 4, лишняя глубина схлопнута', function () {
    eq(MKB.alignIndent('for i in x:\n  if i:\n        print(i)', 4),
      'for i in x:\n    if i:\n        print(i)');
    eq(MKB.alignIndent('a:\n            b', 4), 'a:\n    b');
  });

  t('Выровнять отступы: пустые строки остаются, разбор не меняется', function () {
    var src = 'void setup() {\n   a();\n\n   b();\n}';
    var out = MKB.alignIndent(src, 2);
    eq(out, 'void setup() {\n  a();\n\n  b();\n}');
    var shape = function (c) { return split(c).map(function (b) { return [b.depth, b.bodyCount, b.closer]; }); };
    eq(shape(out), shape(src));
  });

  t('id файла из названия: транслит, дефисы, уникальность', function () {
    eq(MKB.makeId('МК-5: Светофор', []), 'mk-5-svetofor');
    eq(MKB.makeId('Py-1: Первая программа', []), 'py-1-pervaya-programma');
    eq(MKB.makeId('МК-3: Адресная лента', ['mk-3-adresnaya-lenta']), 'mk-3-adresnaya-lenta-2');
    eq(MKB.makeId('', []), 'mk');
    eq(MKB.makeId('!!!', ['mk']), 'mk-2');
  });
})();

(function () {
  var t = MKB.test, eq = MKB.eq;
  var HTML = '<body>\n<script src="js/config.js"></script>\n\n<script src="workshops/mk3.js"></script>\n' +
    '<script src="workshops/py1.js"></script>\n\n<script src="js/core/split.js"></script>\n</body>\n';

  t('index.html: новое подключение — после последнего workshops/*.js', function () {
    eq(MKB.addScriptTag(HTML, 'mk-5'), HTML.replace('py1.js"></script>\n', 'py1.js"></script>\n<script src="workshops/mk-5.js"></script>\n'));
  });

  t('index.html: уже подключён — файл не меняется', function () {
    eq(MKB.addScriptTag(HTML, 'py1'), HTML);
  });

  t('index.html: мастер-классов ещё нет — перед ядром', function () {
    var h = '<body>\n<script src="js/core/split.js"></script>\n</body>';
    eq(MKB.addScriptTag(h, 'a'), '<body>\n<script src="workshops/a.js"></script>\n\n<script src="js/core/split.js"></script>\n</body>');
  });

  t('index.html: удаление убирает ровно одну строку', function () {
    eq(MKB.removeScriptTag(HTML, 'mk3'), HTML.replace('<script src="workshops/mk3.js"></script>\n', ''));
    eq(MKB.removeScriptTag(HTML, 'mk'), HTML, 'mk ≠ mk3');
    eq(MKB.removeScriptTag(MKB.addScriptTag(HTML, 'x'), 'x'), HTML, 'туда и обратно');
  });
})();
