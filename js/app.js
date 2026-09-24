/* роутинг между экранами, события. */
window.MKB = window.MKB || {};
MKB.app = MKB.app || {};

(function () {
  var ui = MKB.ui, $ = ui.$;
  var LANG = { arduino: 'Arduino', python: 'Python' };

  // Показать один экран: 'start' | 'student' | 'admin'
  function show(name) {
    closeMenu();
    ['start', 'student', 'admin'].forEach(function (n) { $('scr-' + n).hidden = n !== name; });
    // после смены экрана: модалка не вернёт фокус на кнопку скрытого экрана
    ui.closeModal();
    requestAnimationFrame(function () { ui.shapeAll($('scr-' + name)); });
  }

  // Действие, которое теряет сборку: если что-то уже поставлено — сначала спросить
  function confirmLoss(title, text, okLabel, cancelLabel, action) {
    if (!ui.student.isStarted()) return action();
    ui.openModal({
      cls: 'wide',
      title: title,
      body: [ui.warnText(text)],
      buttons: [
        { label: cancelLabel, autofocus: true },
        { label: okLabel, cls: 'btn-d', action: function (close) { close(); action(); } }
      ]
    });
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

  function goStart() {
    renderStart();
    show('start');
  }

  function openWorkshop(id, stageIndex) {
    var w = MKB.workshops.filter(function (x) { return x.id === id; })[0];
    if (!w || !w.stages.length) return;
    ui.student.open(w, Math.min(stageIndex || 0, w.stages.length - 1));
    show('student');
  }

  // ─── вход в администрирование: модалка с паролем ───
  function passwordField() {
    var input = ui.el('input');
    input.type = 'password';
    input.id = 'pw';
    input.autocomplete = 'off';
    var eye = ui.el('button', 'eye');
    eye.type = 'button';
    eye.setAttribute('aria-label', 'Показать пароль');
    eye.appendChild(ui.icon('eye'));
    eye.addEventListener('click', function () {
      input.type = input.type === 'password' ? 'text' : 'password';
      input.focus();
    });
    var box = ui.el('div', 'in has-eye');
    box.appendChild(input);
    box.appendChild(eye);
    var label = ui.el('label', null, 'Пароль');
    label.htmlFor = 'pw';
    var fld = ui.el('div', 'fld');
    fld.appendChild(label);
    fld.appendChild(box);
    // ошибка — текстом и значком, не только красной рамкой
    var err = ui.el('span', 'err');
    err.appendChild(ui.icon('alert'));
    err.appendChild(document.createTextNode('Пароль неверный. Попробуйте ещё раз.'));
    err.hidden = true;
    fld.appendChild(err);
    input.addEventListener('input', function () { err.hidden = true; input.classList.remove('bad'); });
    return { fld: fld, input: input, err: err };
  }

  function askPassword() {
    var p = passwordField();
    function submit(close) {
      // модалку закрывает show() уже после смены экрана — фокус не вернётся
      // на скрытую кнопку «Администрирование»
      if (p.input.value === MKB.config.adminPassword) { goAdmin(); return; }
      p.err.hidden = false;
      p.input.classList.add('bad');
      p.input.select();
    }
    var m = ui.openModal({
      title: 'Вход в администрирование',
      body: [ui.el('span', null, 'Введи пароль преподавателя.'), p.fld],
      focus: p.input,
      buttons: [
        { label: 'Отмена' },
        { label: 'Войти', cls: 'btn-p', action: submit }
      ]
    });
    // preventDefault: иначе Enter после смены экрана «нажимал» кнопку
    // «Администрирование», и поверх админки открывалась вторая модалка
    p.input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      submit(m.close);
    });
  }

  function goAdmin() {
    show('admin');
    MKB.admin.enter();
  }

  // ─── экран ученика: этапы, «В начало», логотип ───
  var menu = null;

  function closeMenu() {
    if (!menu) return;
    menu.remove();
    menu = null;
    $('stu-stage').setAttribute('aria-expanded', 'false');
  }

  // Выпадающий список этапов: переход свободный, отметок «пройден» нет
  function toggleMenu() {
    if (menu) { closeMenu(); return; }
    var st = ui.student.state, btn = $('stu-stage');
    var r = btn.getBoundingClientRect();
    menu = ui.el('div', 'menu');
    menu.setAttribute('role', 'menu');
    menu.style.left = r.left + 'px';
    menu.style.top = (r.bottom + 4) + 'px';
    st.workshop.stages.forEach(function (s, i) {
      var cur = i === st.stageIndex;
      var it = ui.el('button', 'mi' + (cur ? ' cur' : ''));
      it.type = 'button';
      it.setAttribute('role', 'menuitem');
      it.appendChild(ui.el('span', 'dot'));
      it.appendChild(document.createTextNode(s.title || 'Этап ' + (i + 1)));
      if (cur) it.appendChild(ui.el('small', null, 'сейчас'));
      it.addEventListener('click', function () {
        closeMenu();
        if (cur) return;
        confirmLoss('Перейти на другой этап?',
          'Собранная на этом этапе программа будет потеряна. Это действие нельзя отменить.',
          'Перейти', 'Остаться', function () { ui.student.open(st.workshop, i); });
      });
      menu.appendChild(it);
    });
    $('scr-student').appendChild(menu);
    btn.setAttribute('aria-expanded', 'true');
    (menu.querySelector('.mi.cur') || menu.firstChild).focus();
  }

  function onMenuKey(e) {
    if (!menu) return;
    if (e.key === 'Escape') { closeMenu(); $('stu-stage').focus(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    var items = Array.prototype.slice.call(menu.children);
    var i = items.indexOf(document.activeElement) + (e.key === 'ArrowDown' ? 1 : -1);
    items[(i + items.length) % items.length].focus();
  }

  // «В начало» — очистить сборку после подтверждения; очищать нечего — ничего не делать
  function resetStage() {
    if (!ui.student.isStarted()) return;
    var st = ui.student.state;
    ui.openModal({
      cls: 'wide',
      title: 'Очистить сборку?',
      body: [ui.warnText('Все поставленные блоки вернутся в палитру. Это действие нельзя отменить.')],
      buttons: [
        { label: 'Отмена', autofocus: true },
        { label: 'Очистить', cls: 'btn-d', action: function (close) { close(); ui.student.open(st.workshop, st.stageIndex); } }
      ]
    });
  }

  function leaveStudent(e) {
    e.preventDefault();
    confirmLoss('Вернуться к списку мастер-классов?',
      'Собранная программа будет потеряна. Это действие нельзя отменить.',
      'Вернуться к списку', 'Остаться', goStart);
  }

  function boot() {
    ui.student.init();

    $('start-grid').addEventListener('click', function (e) {
      var card = e.target.closest('.card');
      if (card) openWorkshop(card.dataset.id);
    });
    $('start-admin').addEventListener('click', askPassword);

    $('stu-home').addEventListener('click', leaveStudent);
    $('stu-reset').addEventListener('click', resetStage);
    $('stu-stage').addEventListener('click', toggleMenu);
    document.addEventListener('pointerdown', function (e) {
      if (menu && !menu.contains(e.target) && !e.target.closest('#stu-stage')) closeMenu();
    });
    document.addEventListener('keydown', onMenuKey);

    MKB.admin.init();
    window.addEventListener('resize', function () { closeMenu(); ui.shapeAll(document); });

    // Приложение ничего не помнит: после перезагрузки — всегда список мастер-классов
    goStart();
  }

  MKB.app.show = show;
  MKB.app.goStart = goStart;
  MKB.app.openWorkshop = openWorkshop;
  MKB.app.student = MKB.ui.student;     // для проверки из консоли: MKB.app.student.place('b8', [6])
  document.addEventListener('DOMContentLoaded', boot);
})();
