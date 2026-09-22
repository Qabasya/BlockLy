/* Тесты данных: мастер-классы подключены и устроены по модели. */
window.MKB = window.MKB || {};

MKB.test('Список мастер-классов есть и без подключённых файлов', function () {
  // js/config.js заводит массив: последний мастер-класс могли удалить из админки,
  // и тогда в index.html не осталось ни одной строки <script src="workshops/…">
  MKB.ok(Array.isArray(MKB.workshops), 'MKB.workshops не массив');
});

MKB.test('МК-3 подключён через <script src>', function () {
  var mk3 = MKB.workshops.filter(function (w) { return w.id === 'mk3'; })[0];
  MKB.ok(mk3, 'мастер-класс mk3 не найден в MKB.workshops');
  MKB.eq(mk3.language, 'arduino', 'язык');
  MKB.eq(mk3.stages.length, 1, 'число этапов');
  MKB.eq(mk3.stages[0].fragments.length, 4, 'число фрагментов');
  MKB.eq(mk3.stages[0].steps.length, 11, 'число шагов');
});
