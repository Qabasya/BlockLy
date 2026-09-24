/* Тесты данных: мастер-классы подключены и устроены по модели. */
window.MKB = window.MKB || {};

MKB.test('Список мастер-классов есть и без подключённых файлов', function () {
  // js/config.js заводит массив: последний мастер-класс могли удалить из админки,
  // и тогда в index.html не осталось ни одной строки <script src="workshops/…">
  MKB.ok(Array.isArray(MKB.workshops), 'MKB.workshops не массив');
});

// Каждый подключённый мастер-класс устроен по модели. Содержимое не сверяется:
// тесты ядра опираются на tests/fixture.js, правки в админке их не ломают.
MKB.test('Подключённые мастер-классы устроены по модели', function () {
  var seen = {};
  MKB.workshops.forEach(function (w) {
    var name = w.id || '(без id)';
    MKB.ok(w.id && !seen[w.id], name + ': id пустой или повторяется');
    seen[w.id] = true;
    MKB.ok(w.title, name + ': нет названия');
    MKB.ok(w.language === 'arduino' || w.language === 'python', name + ': язык не arduino и не python');
    MKB.ok(w.stages && w.stages.length, name + ': нет этапов');
    var stageIds = {};
    w.stages.forEach(function (st) {
      MKB.ok(st.id && !stageIds[st.id], name + ': id этапа пустой или повторяется');
      stageIds[st.id] = true;
      MKB.ok(st.fragments && st.fragments.length, name + '/' + st.id + ': нет фрагментов');
      var bs = MKB.splitFragments(st.fragments, w.language);
      MKB.ok(MKB.stepsInSync(bs, st.steps), name + '/' + st.id + ': шаги не совпадают с кодом');
    });
  });
});
