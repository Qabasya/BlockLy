/* экран администратора: черновик мастер-класса, шапка, сайдбар, папка, сохранение.
   Правится глубокая копия — в MKB.workshops она попадает только после «Сохранить»,
   поэтому несохранённое не видно ученику, а «не сохранять» — просто выбросить копию. */
window.MKB = window.MKB || {};
MKB.admin = MKB.admin || {};

(function () {
  var A = MKB.admin;
  var ui = function () { return MKB.ui; };
  function $(id) { return document.getElementById(id); }
  function copy(x) { return JSON.parse(JSON.stringify(x)); }

  // s.w — черновик, s.saved — JSON сохранённой версии (null у нового), s.si — этап,
  // s.mode — 'frags' | 'steps', s.open — развёрнутые фрагменты, s.folder — 'granted' | 'prompt' | 'none'
  A.s = { w: null, saved: null, si: 0, mode: 'frags', open: {}, folder: 'none' };

  function isDirty() { return A.s.saved === null || JSON.stringify(A.s.w) !== A.s.saved; }
  function canWrite() { return A.s.folder === 'granted' || !MKB.save.supported(); }

  function open(w) {
    A.s.w = copy(w);
    A.s.saved = JSON.stringify(A.s.w);
    select();
  }
  function openNew() {
    A.s.w = { id: '', title: '', language: '', stages: [{ id: 'stage1', title: '', fragments: [{ free: false, code: '' }], steps: [] }] };
    A.s.saved = null;
    select();
    $('adm-name').focus();
  }
  function select() {
    A.s.si = 0;
    A.s.mode = 'frags';
    A.editor.setOpenFor(A.s.w.stages[0]);
    render();
    $('scr-admin').querySelector('.main').scrollTop = 0;
  }

  // ─── отрисовка ───
  function render() {
    var root = $('scr-admin'), st = A.s.w.stages[A.s.si];
    if (A.s.mode === 'steps' && !MKB.stepsInSync(MKB.splitFragments(st.fragments, A.s.w.language), st.steps)) A.s.mode = 'frags';
    root.classList.toggle('mode-frags', A.s.mode === 'frags');
    root.classList.toggle('mode-steps', A.s.mode === 'steps');
    A.editor.render();
    if (A.s.mode === 'steps') A.steps.render();
    renderList();
    changed();
  }

  // Шапка: статус и доступность кнопок. Зовётся после каждой правки.
  function changed() {
    var dirty = isDirty(), w = A.s.w;
    $('adm-title').textContent = w.title || 'Новый мастер-класс';
    var st = $('adm-status');
    st.className = 'badge ' + (dirty ? 'b-warn' : 'b-ok');
    st.replaceChildren(ui().icon(dirty ? 'warn' : 'check'), document.createTextNode(dirty ? 'Есть несохранённые изменения' : 'Сохранено'));
    $('adm-connect').hidden = canWrite();
    $('adm-save').disabled = !canWrite() || !dirty;
    var view = $('adm-view');
    view.disabled = !canWrite() || dirty;
    view.title = !canWrite() ? 'Сначала подключите папку проекта' : dirty ? 'Сначала сохраните изменения' : '';
    var row = document.querySelector('#adm-list .mk.on .t');
    if (row) row.textContent = w.title || 'Новый мастер-класс';
  }

  function shortCode(title) {
    return String(title || '').split(':')[0].replace(/[\s-]/g, '').slice(0, 4) || 'Нов';
  }

  function listRow(w, on) {
    var row = ui().el('div', 'mk' + (on ? ' on' : ''));
    row.dataset.id = w.id;
    row.tabIndex = 0;
    row.title = w.title || 'Новый мастер-класс';
    row.appendChild(ui().el('span', 'sq', shortCode(w.title)));
    row.appendChild(ui().el('span', 't', w.title || 'Новый мастер-класс'));
    var del = ui().el('button', 'del');
    del.type = 'button';
    del.setAttribute('aria-label', 'Удалить мастер-класс');
    del.appendChild(ui().icon('trash'));
    row.appendChild(del);
    return row;
  }

  function renderList() {
    var list = $('adm-list'), rows = [];
    if (A.s.saved === null) rows.push(listRow(A.s.w, true));
    MKB.workshops.forEach(function (w) { rows.push(listRow(w, A.s.saved !== null && w.id === A.s.w.id)); });
    list.replaceChildren.apply(list, rows);
  }

  // ─── уход с несохранёнными изменениями ───
  function leave(action) {
    if (!isDirty()) return action();
    ui().openModal({
      cls: 'wide',
      title: 'Выйти без сохранения?',
      body: [ui().warnText('Изменения в «' + (A.s.w.title || 'Новый мастер-класс') + '» не сохранены и пропадут.')],
      buttons: [
        { label: 'Остаться', autofocus: true },
        { label: 'Не сохранять', cls: 'btn-d', action: function (close) { close(); action(); } }
      ]
    });
  }

  function message(title, text) {
    ui().openModal({ cls: 'wide', title: title, body: [ui().el('div', null, text)], buttons: [{ label: 'Понятно', cls: 'btn-p' }] });
  }

  // ─── папка проекта ───
  function connect() {
    MKB.save.connect().then(function (r) {
      if (r.ok) A.s.folder = 'granted';
      else if (r.error) message('Папка не подключена', r.error);
      changed();
    });
  }

  // ─── «Сохранить» ───
  function save() {
    var w = A.s.w, isNew = A.s.saved === null;
    if (!w.title.trim() || !w.language) {
      message('Не хватает названия или языка', 'Укажите название мастер-класса и язык — по ним строится карточка на главном экране.');
      return;
    }
    // шаги приводятся к коду: у неизменившихся строк описания сохраняются
    w.stages.forEach(function (s) { s.steps = MKB.transferSteps(MKB.splitFragments(s.fragments, w.language), s.steps); });
    if (isNew) w.id = MKB.makeId(w.title, MKB.workshops.map(function (x) { return x.id; }));
    var done = function () {
      var saved = copy(w), i = MKB.workshops.map(function (x) { return x.id; }).indexOf(w.id);
      if (i >= 0) MKB.workshops[i] = saved; else MKB.workshops.push(saved);
      A.s.saved = JSON.stringify(w);
      render();
    };
    if (!MKB.save.supported()) {
      MKB.save.download(w);
      done();
      message('Файл скачан', 'Браузер не умеет записывать в папку. Положите ' + w.id + '.js в папку workshops проекта' +
        (isNew ? ' и добавьте в index.html строку <script src="workshops/' + w.id + '.js"></script>.' : '.'));
      return;
    }
    $('adm-save').disabled = true;
    MKB.save.writeWorkshop(w, isNew).then(done, function (e) {
      if (isNew) w.id = '';
      changed();
      message('Не удалось сохранить', 'Файл не записан: ' + (e && e.message || e) + '. Попробуйте подключить папку заново.');
    });
  }

  // ─── удаление мастер-класса ───
  function remove(id) {
    var isDraft = A.s.saved === null && !id;
    var w = isDraft ? A.s.w : MKB.workshops.filter(function (x) { return x.id === id; })[0];
    if (!w) return;
    var nFr = 0, nSt = 0;
    w.stages.forEach(function (s) { nFr += s.fragments.length; nSt += s.steps.length; });
    ui().openModal({
      cls: 'wide',
      title: 'Удалить мастер-класс?',
      body: [ui().warnText('«' + (w.title || 'Новый мастер-класс') + '» будет удалён вместе с ' +
        A.plural(nFr, 'фрагментом', 'фрагментами', 'фрагментами') + ' и описаниями ' +
        A.plural(nSt, 'шага', 'шагов', 'шагов') + '. Это действие нельзя отменить.')],
      buttons: [
        { label: 'Отмена', autofocus: true },
        { label: 'Удалить мастер-класс', cls: 'btn-d', icon: 'trash', action: function (close) {
          close();
          if (isDraft) return afterRemove(null);
          if (!canWrite() || !MKB.save.supported()) return message('Папка не подключена', 'Чтобы удалить файл мастер-класса, подключите папку проекта.');
          MKB.save.deleteWorkshop(id).then(function () { afterRemove(id); }, function (e) {
            message('Не удалось удалить', String(e && e.message || e));
          });
        } }
      ]
    });
  }
  function afterRemove(id) {
    if (id) MKB.workshops = MKB.workshops.filter(function (x) { return x.id !== id; });
    var wasOpen = !id || A.s.w.id === id;
    if (!wasOpen) return renderList();
    if (MKB.workshops.length) open(MKB.workshops[0]); else openNew();
  }

  function onList(e) {
    var row = e.target.closest('.mk');
    if (!row) return;
    var id = row.dataset.id;
    if (e.target.closest('.del')) return remove(id);
    if (row.classList.contains('on')) return;
    leave(function () { open(MKB.workshops.filter(function (x) { return x.id === id; })[0]); });
  }

  // Вход после пароля: первый мастер-класс, папка — молча, если разрешение уже есть
  function enter() {
    if (MKB.workshops.length) open(MKB.workshops[0]); else openNew();
    MKB.save.restore().then(function (st) { A.s.folder = st; changed(); });
  }

  function init() {
    A.editor.init();
    A.steps.init();
    $('adm-list').addEventListener('click', onList);
    $('adm-list').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.classList.contains('mk')) onList(e); });
    $('adm-new').addEventListener('click', function () { leave(openNew); });
    $('adm-collapse').addEventListener('click', function () {
      var c = $('scr-admin').classList.toggle('collapsed');
      this.setAttribute('aria-label', c ? 'Развернуть список' : 'Свернуть список');
    });
    $('adm-connect').addEventListener('click', connect);
    $('adm-save').addEventListener('click', save);
    $('adm-view').addEventListener('click', function () { MKB.app.openWorkshop(A.s.w.id, A.s.si); });
    $('adm-exit').addEventListener('click', function () { leave(MKB.app.goStart); });
  }

  A.init = init;
  A.enter = enter;
  A.render = render;
  A.changed = changed;
  A.isDirty = isDirty;
})();
