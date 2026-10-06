/* Готовые фрагменты: дерево, палитра, защита и сохранение. */
window.MKB = window.MKB || {};

(function () {
  var t = MKB.test, eq = MKB.eq, ok = MKB.ok, S = MKB.state;

  function workshop() {
    return { id: 'preset-test', title: 'Готовый код', language: 'arduino', stages: [{
      id: 's', title: 'Этап', fragments: [
        { code: 'void setup() {', preset: false },
        { code: '  pinMode(1, OUTPUT);', preset: true },
        { code: '  digitalWrite(1, HIGH);', preset: false },
        { code: '}', preset: true },
        { code: 'void loop() {\n  delay(100);\n}', preset: true }
      ], steps: []
    }] };
  }

  t('Готовый фрагмент сразу стоит в работе и не попадает в палитру', function () {
    var st = S.create(workshop(), 0);
    eq(S.palette(st).length, 2);
    eq(st.slots[1].id, 'b3');
    eq(st.slots[1].kids[0].id, 'b4');
    ok(S.isEmpty(st), 'готовый код не считается действием ученика');
    ok(!S.place(st, 'b3', [0]), 'готовый блок нельзя поставить повторно');
    eq(S.remove(st, [1]), []);
  });

  t('Готовый потомок появляется после установки родителя и защищает поддерево', function () {
    var st = S.create(workshop(), 0);
    ok(S.place(st, 'b0', [0]));
    eq(S.assembled(st), ['b0', 'b1', null, 'b3', 'b4']);
    eq(S.nextBlock(st).id, 'b2');
    eq(S.remove(st, [0]), []);
    ok(!S.move(st, [0], [1]));
    ok(S.place(st, 'b2', [0, 1]));
    ok(MKB.validate(S.assembled(st), st.blocks, st.values).ok);
  });

  t('Одинаковый текст готовой и учебной строки не скрывает следующий шаг', function () {
    var w = { language: 'arduino', stages: [{ fragments: [
      { code: 'FastLED.show();', preset: true },
      { code: 'FastLED.show();' }
    ], steps: [] }] };
    var st = S.create(w, 0);
    eq(S.nextBlock(st).id, 'b1');
    eq(S.palette(st), ['b1']);
  });

  t('Перенос родителя в эталонный слот раскрывает готового потомка', function () {
    var w = { language: 'python', stages: [{ fragments: [
      { code: 'if ready:' },
      { code: '    print("ready")', preset: true },
      { code: 'print("done")' }
    ], steps: [] }] };
    var st = S.create(w, 0);
    ok(S.place(st, 'b0', [1]));
    eq(st.slots[1].kids[0].id, null);
    ok(S.move(st, [1], [0]));
    eq(st.slots[0].kids[0].id, 'b1');
    ok(!S.move(st, [0], [1]));
  });

  t('Готовый внук появляется после переноса всей цепочки; конфликт сохраняет сборку', function () {
    var w = { language: 'python', stages: [{ fragments: [
      { code: 'if a:' },
      { code: '    if b:' },
      { code: '        print("ready")', preset: true },
      { code: 'print("done")' }
    ], steps: [] }] };
    var st = S.create(w, 0);
    ok(S.place(st, 'b0', [1]));
    ok(S.place(st, 'b1', [1, 0]));
    ok(S.place(st, 'b3', [1, 0, 0]));
    ok(!S.move(st, [1], [0]), 'занятый слот готового внука нельзя затереть');
    eq(S.slotAt(st, [1, 0, 0]).id, 'b3');
    S.remove(st, [1, 0, 0]);
    ok(S.move(st, [1], [0]));
    eq(S.slotAt(st, [0, 0, 0]).id, 'b2');
    ok(S.place(st, 'b3', [1]));
    ok(MKB.validate(S.assembled(st), st.blocks, st.values).ok);
  });

  t('Одинаковые открывающие строки раскрывают готового потомка в любом порядке', function () {
    var w = { language: 'python', stages: [{ fragments: [
      { code: 'if ready:' },
      { code: '    print("ready")', preset: true },
      { code: 'if ready:' },
      { code: '    print("other")' }
    ], steps: [] }] };
    var st = S.create(w, 0);
    ok(S.place(st, 'b2', [0]));
    eq(S.slotAt(st, [0, 0]).id, 'b1');
    ok(S.place(st, 'b0', [1]));
    ok(S.place(st, 'b3', [1, 0]));
    ok(MKB.validate(S.assembled(st), st.blocks, st.values).ok);
  });

  t('Поле готового фрагмента получает авторское значение', function () {
    var w = { language: 'arduino', stages: [{ fragments: [
      { code: 'CRGB::{{White|Red}};', preset: true }
    ], steps: [] }] };
    var st = S.create(w, 0), field = st.blocks[0].fields[0];
    eq(st.values[field.id], 'White');
    ok(S.isFull(st));
    ok(MKB.validate(S.assembled(st), st.blocks, st.values).ok);
  });

  t('Сохранение записывает preset и старые фрагменты остаются совместимыми', function () {
    var w = workshop(), source = MKB.workshopToJs(w);
    ok(source.indexOf('preset: true') >= 0);
    var blocks = MKB.splitFragments([{ code: 'x();' }], 'arduino');
    eq(blocks[0].preset, false);
    w.stages[0].fragments.forEach(function (f) { delete f.preset; });
    ok(MKB.workshopToJs(w).indexOf('preset:') < 0);
  });
})();
