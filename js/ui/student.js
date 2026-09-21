/* экран ученика: действия со сборкой, проверка, подсказка, клавиатура, успех.
   Сборка — MKB.state, отрисовка — MKB.ui.renderBoard. */
window.MKB = window.MKB || {};
MKB.ui = MKB.ui || {};

(function () {
  var ui = MKB.ui, S = MKB.state;
  var HINT_MS = 30000;
  var IDE = { arduino: 'Arduino IDE', python: 'PyCharm' };

  var st = null;
  var view = { result: null, hint: null };
  var hintTimer = null;
  function $(id) { return document.getElementById(id); }

  function open(workshop, stageIndex) {
    st = S.create(workshop, stageIndex);
    view = { result: null, hint: null };
    clearTimeout(hintTimer);
    render();
  }

  // Перерисовать и вернуть фокус блоку, если он был на нём (клавиатура, клик)
  function render() {
    var a = document.activeElement;
    var keep = a && a.classList && a.classList.contains('pz') && a.dataset.id;
    // подсказка гаснет, когда её блок поставили
    if (view.hint && S.palette(st).indexOf(view.hint) < 0) stopHint();
    ui.renderBoard(st, view);
    if (keep) {
      var e = document.querySelector('#scr-student .pz[data-id="' + keep + '"]');
      if (e) e.focus();
    }
  }

  // Любое изменение сборки снимает подсветку проверки: она про старую сборку
  function changed(ok) {
    if (ok) { view.result = null; render(); }
    return ok;
  }

  function place(id, path) { return changed(S.place(st, id, path)); }
  function remove(path) { return changed(S.remove(st, path).length > 0); }
  function move(from, to) { return changed(S.move(st, from, to)); }

  // Отпустили блок: из палитры в слот (занятый — его блок вернётся в палитру),
  // из слота в слот (обмен вместе с телами), из слота в палитру
  function onDrop(src, t) {
    if (t.kind === 'pal') return remove(src.path);
    if (!src.path) {
      if (t.filled) S.remove(st, t.path);
      return changed(S.place(st, src.id, t.path) || t.filled);
    }
    return move(src.path, t.path);
  }

  // ─── подсказка: один следующий нужный блок в палитре ───
  function hint() {
    var next = S.nextBlock(st);
    if (!next || S.isFull(st)) return;
    // одинаковые строки взаимозаменяемы: подсвечиваем ту, что лежит в палитре
    var id = S.palette(st).filter(function (x) { return st.byId[x].norm === next.norm; })[0];
    if (!id) return;
    view.hint = id;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { stopHint(); render(); }, HINT_MS);
    render();
    var e = document.querySelector('#stu-pal .pz[data-id="' + id + '"]');
    if (e) e.scrollIntoView({ block: 'nearest' });
  }
  function stopHint() { view.hint = null; clearTimeout(hintTimer); }

  // ─── проверка ───
  function check() {
    if (!S.isFull(st)) return;
    stopHint();
    view.result = MKB.validate(S.assembled(st), st.blocks, st.values);
    render();
    if (view.result.ok) success();
  }

  function success() {
    var code = MKB.buildCode(S.assembled(st), st.blocks, st.values, st.indent);
    var okc = ui.el('div', 'okc');
    okc.appendChild(ui.icon('check'));
    var codeBox = ui.el('div', 'code-view', code);
    codeBox.tabIndex = 0;
    ui.openModal({
      cls: 'wide done',
      head: okc,
      center: true,
      title: 'Молодец! Этап собран верно',
      body: [
        ui.el('span', 'ctr', 'Скопируй код и вставь его в ' + (IDE[st.workshop.language] || 'редактор') + '.'),
        codeBox
      ],
      footCls: 'mo-f-ctr',
      buttons: [
        { label: 'Скопировать код', cls: 'btn-p btn-lg', icon: 'copy', autofocus: true, action: function (close, btn) {
          ui.copyText(code).then(function (ok) {
            btn.lastChild.textContent = ok ? 'Скопировано' : 'Код выделен — нажми Ctrl+C';
            if (!ok) selectAll(codeBox);
          });
        } },
        { label: 'Закрыть', cls: 'btn-lg' }
      ]
    });
  }

  function selectAll(node) {
    var r = document.createRange();
    r.selectNodeContents(node);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    node.focus();
  }

  // ─── клавиатура: Tab по блокам, Enter — поставить / вернуть, ↑↓ — переставить ───
  function onKey(e) {
    var b = e.target;
    if (!b.classList || !b.classList.contains('pz') || !b.dataset.id) return;
    var path = b.dataset.path ? b.dataset.path.split('.').map(Number) : null;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (path) remove(path);
      else {
        var free = S.firstEmpty(st);
        if (free) place(b.dataset.id, free);
      }
    } else if (path && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      var to = path.slice();
      to[to.length - 1] += e.key === 'ArrowUp' ? -1 : 1;
      if (to[to.length - 1] >= 0 && S.slotAt(st, to)) move(path, to);
    }
  }

  function onField(e) {
    var f = e.target.dataset && e.target.dataset.field;
    if (!f || !st) return;
    st.values[f] = e.target.value;
    // перерисовка на каждый символ сбила бы фокус — только когда ввод закончен
    if (view.result && e.type === 'change') changed(true);
  }

  function init() {
    var root = $('scr-student');
    ui.initDrag(root, onDrop);
    root.addEventListener('keydown', onKey);
    root.addEventListener('input', onField);
    root.addEventListener('change', onField);
    $('stu-hint').addEventListener('click', hint);
    $('stu-check').addEventListener('click', check);
    // Ширина колонки меняется и без resize окна (появилась полоса прокрутки) —
    // контуры пазлов рисуются по ширине, их надо пересчитать
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function (list) {
        list.forEach(function (en) { ui.shapeAll(en.target); });
      });
      ro.observe($('stu-work'));
      ro.observe($('stu-pal'));
    }
  }

  MKB.ui.student = {
    init: init,
    open: open,
    get state() { return st; },
    isStarted: function () { return !!st && !S.isEmpty(st); },
    place: place,
    remove: remove,
    move: move,
    hint: hint,
    check: check
  };
})();
