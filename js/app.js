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

  // ─── экран ученика: начальное состояние этапа ───
  // Слоты — только верхнего уровня, палитра — все блоки. Перемешивание,
  // установка и дерево слотов — state.js (этап 5).
  function renderStudent(w, si) {
    var stage = w.stages[si];
    var blocks = MKB.splitFragments(stage.fragments, w.language);
    var diffs = MKB.findSimilar(blocks).diffs;

    $('stu-title').textContent = w.title;
    $('stu-stage-n').textContent = 'Этап ' + (si + 1) + ' из ' + w.stages.length;
    $('stu-stage-t').textContent = stage.title;

    var box = ui.el('div', 'stepbox');
    box.appendChild(ui.el('span', 'stepno', 'Шаг 1 из ' + blocks.length));
    box.appendChild(ui.el('span', 'steptx', stage.steps[0] ? stage.steps[0].text : ''));
    $('stu-bar').replaceChildren(box);

    var work = $('stu-work');
    work.replaceChildren();
    blocks.forEach(function (b) { if (b.depth === 0) work.appendChild(ui.emptyEl()); });

    var pal = $('stu-pal');
    pal.replaceChildren();
    blocks.forEach(function (b) { pal.appendChild(ui.blockEl(b, { state: 'pal', diffs: diffs[b.id] })); });
    $('stu-count').textContent = blocks.length;
  }

  function boot() {
    renderStart();
    // временно до этапа 7: экран выбирается адресом — index.html#student, #admin
    var w = MKB.workshops[0];
    if (location.hash === '#student' && w) { renderStudent(w, 0); show('student'); }
    else if (location.hash === '#admin' && w) { MKB.admin.render(w, 0, w.stages[0].fragments.length - 1); show('admin'); }
    else show('start');

    window.addEventListener('resize', function () { ui.shapeAll(document); });
  }

  MKB.app.show = show;
  MKB.app.renderStart = renderStart;
  MKB.app.renderStudent = renderStudent;
  document.addEventListener('DOMContentLoaded', boot);
})();
