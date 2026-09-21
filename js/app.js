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

  function boot() {
    renderStart();
    // временно до этапа 7: экран выбирается адресом — index.html#student, #admin
    var w = MKB.workshops[0];
    if (location.hash === '#student' && w) { MKB.ui.student.open(w, 0); show('student'); }
    else if (location.hash === '#admin' && w) { MKB.admin.render(w, 0, w.stages[0].fragments.length - 1); show('admin'); }
    else show('start');

    window.addEventListener('resize', function () { ui.shapeAll(document); });
    MKB.ui.student.init();
  }

  MKB.app.show = show;
  MKB.app.renderStart = renderStart;
  MKB.app.student = MKB.ui.student;     // для проверки из консоли: MKB.app.student.place('b8', [6])
  document.addEventListener('DOMContentLoaded', boot);
})();
