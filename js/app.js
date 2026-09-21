/* роутинг между экранами, события. */
window.MKB = window.MKB || {};
MKB.app = MKB.app || {};

(function () {
  var ui = MKB.ui;
  var LANG = { arduino: 'Arduino', python: 'Python' };
  function $(id) { return document.getElementById(id); }

  // Показать один экран: 'start' | 'student' | 'admin'
  function show(name) {
    ['start', 'student', 'admin'].forEach(function (n) { $('scr-' + n).hidden = n !== name; });
    requestAnimationFrame(function () { ui.shapeAll($('scr-' + name)); });
  }

  // ─── стартовый экран ───
  function renderStart() {
    var grid = $('start-grid');
    grid.replaceChildren();
    MKB.workshops.forEach(function (w) {
      var card = ui.el('button', 'card');
      card.type = 'button';
      card.dataset.id = w.id;
      card.appendChild(ui.el('span', 'badge lang-' + w.language, LANG[w.language] || w.language));
      card.appendChild(ui.el('h2', null, w.title));
      grid.appendChild(card);
    });
  }

  // ─── экран ученика ───
  // Сборка — MKB.state, рисует MKB.ui.renderBoard. Любое изменение сборки
  // сбрасывает результат проверки: подсветка ошибок относится к старой сборке.
  var student = { st: null, view: { result: null, hint: null } };

  function openStudent(w, si) {
    student.st = MKB.state.create(w, si);
    student.view = { result: null, hint: null };
    MKB.ui.renderBoard(student.st, student.view);
  }

  function changed(ok) {
    if (ok) {
      student.view.result = null;
      MKB.ui.renderBoard(student.st, student.view);
    }
    return ok;
  }

  // Действия со сборкой; путь слота — массив индексов: [6] или [6, 0].
  // Их же вызывают перетаскивание и клавиатура (этап 6).
  MKB.app.student = {
    get state() { return student.st; },
    place: function (id, path) { return changed(MKB.state.place(student.st, id, path)); },
    remove: function (path) { return changed(MKB.state.remove(student.st, path).length > 0); },
    move: function (from, to) { return changed(MKB.state.move(student.st, from, to)); },
    render: function () { MKB.ui.renderBoard(student.st, student.view); }
  };

  // Значения полей живут в состоянии: иначе пропадут при перерисовке
  function onFieldInput(e) {
    var f = e.target.dataset && e.target.dataset.field;
    if (!f || !student.st) return;
    student.st.values[f] = e.target.value;
    // перерисовка на каждый символ сбила бы фокус — только когда ввод закончен
    if (student.view.result && e.type === 'change') changed(true);
  }

  function boot() {
    renderStart();
    // временно до этапа 7: экран выбирается адресом — index.html#student, #admin
    var w = MKB.workshops[0];
    if (location.hash === '#student' && w) { openStudent(w, 0); show('student'); }
    else if (location.hash === '#admin' && w) { MKB.admin.render(w, 0, w.stages[0].fragments.length - 1); show('admin'); }
    else show('start');

    window.addEventListener('resize', function () { ui.shapeAll(document); });
    $('scr-student').addEventListener('change', onFieldInput);
    $('scr-student').addEventListener('input', onFieldInput);
  }

  MKB.app.show = show;
  MKB.app.renderStart = renderStart;
  MKB.app.openStudent = openStudent;
  document.addEventListener('DOMContentLoaded', boot);
})();
