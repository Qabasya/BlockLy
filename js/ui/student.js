/* экран ученика: действия со сборкой, проверка, подсказка, клавиатура, успех.
   Сборка — MKB.state, отрисовка — MKB.ui.renderBoard. */
window.MKB = window.MKB || {};
MKB.ui = MKB.ui || {};

(function () {
  var ui = MKB.ui, S = MKB.state, $ = ui.$;
  var IDE = { arduino: 'Arduino IDE', python: 'PyCharm' };

  var st = null;
  var view = { result: null, hint: null };

  function open(workshop, stageIndex) {
    st = S.create(workshop, stageIndex);
    view = { result: null, hint: null };
    var reference = st.blocks.slice().sort(function (a, b) { return a.position - b.position; });
    var answers = {};
    reference.forEach(function (b) {
      b.fields.forEach(function (f) { answers[f.id] = f.range ? String(f.range.min) : f.answer; });
    });
    $('stu-reference').textContent = MKB.buildCode(reference.map(function (b) { return b.id; }),
      reference, answers, st.indent);
    $('stu-reference-scroll').scrollTop = 0;
    $('stu-palette-scroll').scrollTop = 0;
    render();
  }

  function updatePaletteMore() {
    var box = $('stu-palette-scroll');
    $('stu-palette-more').hidden = box.scrollHeight <= box.clientHeight + 2 ||
      box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
  }

  // Перерисовать и вернуть фокус туда, где он был: на блок (клавиатура, клик)
  // или на поле ввода — выбор в списке перерисовывает доску целиком
  function render() {
    var a = document.activeElement, sel = null;
    if (a && a.classList && a.dataset) {
      if (a.classList.contains('pz') && a.dataset.id) sel = '.pz[data-id="' + a.dataset.id + '"]';
      else if (a.dataset.field) sel = '[data-field="' + a.dataset.field + '"]';
    }
    // подсказка гаснет, когда её блок поставили
    if (view.hint && S.palette(st).indexOf(view.hint) < 0) stopHint();
    ui.renderBoard(st, view);
    requestAnimationFrame(updatePaletteMore);
    if (sel) {
      var e = document.querySelector('#scr-student ' + sel);
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
      if (t.filled && !S.remove(st, t.path).length) return false;
      return changed(S.place(st, src.id, t.path));
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
    render();
    var e = document.querySelector('#stu-pal .pz[data-id="' + id + '"]');
    if (e) e.scrollIntoView({ block: 'nearest' });
  }
  function stopHint() { view.hint = null; }

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
    var arduino = st.workshop.language === 'arduino';
    var upload = arduino && MKB.arduinoUpload;
    var unavailable = upload && upload.availability();
    var controller = new AbortController();
    var okc = ui.el('div', 'okc');
    okc.appendChild(ui.icon('check'));
    var codeBox = ui.el('div', 'code-view', code);
    codeBox.tabIndex = 0;
    var status = ui.el('div', 'upload-status', unavailable || 'Подключите Arduino Nano (ATmega328P, Old Bootloader) и нажмите «Загрузить на плату».');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    var buttons = [
      { label: 'Скопировать код', cls: 'btn-p btn-lg', icon: 'copy', autofocus: true, action: function (close, btn) {
        ui.copyText(code).then(function (ok) {
          btn.lastChild.textContent = ok ? 'Скопировано' : 'Код выделен — нажми Ctrl+C';
          if (!ok) selectAll(codeBox);
        });
      } }
    ];
    if (upload) buttons.push({ label: 'Загрузить на плату', cls: 'btn-lg', disabled: !!unavailable, title: unavailable || '', action: function (close, btn) {
      if (unavailable || btn.disabled) return;
      btn.disabled = true;
      status.classList.remove('upload-error');
      status.textContent = 'Выберите порт Arduino…';
      upload.upload(code, function (message) { if (!controller.signal.aborted) status.textContent = message; }, controller.signal)
        .catch(function (e) {
          if (controller.signal.aborted) return;
          status.classList.add('upload-error');
          status.textContent = uploadError(e);
        }).finally(function () { if (!controller.signal.aborted) btn.disabled = false; });
    } });
    buttons.push({ label: 'Закрыть', cls: 'btn-lg' });
    ui.openModal({
      cls: 'wide done',
      head: okc,
      center: true,
      title: 'Молодец! Этап собран верно',
      body: [
        ui.el('span', 'ctr', arduino ? 'Скопируй код для Arduino IDE или загрузи его на плату.' : 'Скопируй код и вставь его в ' + (IDE[st.workshop.language] || 'редактор') + '.'),
        codeBox,
        ...(arduino ? [status] : [])
      ],
      footCls: 'mo-f-ctr',
      buttons: buttons,
      onClose: function () { controller.abort(); }
    });
  }

  function uploadError(error) {
    if (error && (error.name === 'NotFoundError' || error.name === 'NotAllowedError')) return 'Порт не выбран или доступ к нему отклонён. Нажмите «Загрузить на плату» и выберите Arduino.';
    if (error && error.name === 'SecurityError') return 'Браузер запретил доступ к порту. Откройте приложение через localhost в Chrome или Edge.';
    if (error && (error.name === 'NetworkError' || error.name === 'InvalidStateError')) return 'Порт занят другой программой. Закройте Arduino IDE или Serial Monitor и повторите.';
    if (error && error.name === 'TypeError' && /fetch/i.test(error.message)) return 'Не удалось связаться с локальным компилятором. Запустите сервер приложения.';
    return error && error.message ? error.message : 'Не удалось загрузить программу на плату.';
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
    if (!b.classList || !b.classList.contains('pz') || !b.dataset.id || b.dataset.locked) return;
    var path = ui.pathOf(b);
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
    var paletteScroll = $('stu-palette-scroll');
    ui.studentLayout.init();
    ui.initDrag(root, onDrop);
    root.addEventListener('keydown', onKey);
    root.addEventListener('input', onField);
    root.addEventListener('change', onField);
    $('stu-hint').addEventListener('click', hint);
    $('stu-check').addEventListener('click', check);
    paletteScroll.addEventListener('scroll', updatePaletteMore);
    $('stu-palette-more').addEventListener('click', function () {
      paletteScroll.focus();
      paletteScroll.scrollBy({ top: paletteScroll.clientHeight * .8, behavior: 'smooth' });
    });
    window.addEventListener('resize', updatePaletteMore);
    // Ширина колонки меняется и без resize окна (появилась полоса прокрутки) —
    // контуры пазлов рисуются по ширине, их надо пересчитать
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function (list) {
        list.forEach(function (en) { ui.shapeAll(en.target); });
        updatePaletteMore();
      });
      ro.observe($('stu-work'));
      ro.observe($('stu-pal'));
      ro.observe(paletteScroll);
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
