/* модалки: пароль, успех, подтверждения. Разметка — .scrim > .modal из макетов. */
window.MKB = window.MKB || {};
MKB.ui = MKB.ui || {};

(function () {
  var ui = MKB.ui;
  var current = null;
  var COPY_WAIT = 700;      // мс ожидания navigator.clipboard

  // opts: { title, cls: 'wide' | 'wide done', head: узел над заголовком,
  //   center: заголовок по центру, body: [узлы], footCls, buttons: [{ label, cls, icon,
  //   action(close, btn), autofocus }], focus: узел для фокуса, onClose }
  // Кнопка без action просто закрывает. Esc и клик по затемнению — закрыть без действия.
  function open(opts) {
    close();
    var scrim = ui.el('div', 'scrim');
    var box = ui.el('div', 'modal' + (opts.cls ? ' ' + opts.cls : ''));
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    if (opts.head) box.appendChild(opts.head);
    var h = ui.el('div', 'mo-h' + (opts.center ? ' ctr' : ''), opts.title);
    h.id = 'mo-title';
    box.setAttribute('aria-labelledby', h.id);
    box.appendChild(h);
    var b = ui.el('div', 'mo-b');
    (opts.body || []).forEach(function (n) { b.appendChild(n); });
    box.appendChild(b);

    var foot = ui.el('div', 'mo-f' + (opts.footCls ? ' ' + opts.footCls : ''));
    var focusBtn = null;
    (opts.buttons || []).forEach(function (bt) {
      var btn = ui.el('button', 'btn' + (bt.cls ? ' ' + bt.cls : ''));
      btn.type = 'button';
      if (bt.icon) btn.appendChild(ui.icon(bt.icon));
      btn.appendChild(document.createTextNode(bt.label));
      btn.addEventListener('click', function () { (bt.action || finish)(finish, btn); });
      foot.appendChild(btn);
      if (!focusBtn || bt.autofocus) focusBtn = btn;
    });
    box.appendChild(foot);
    scrim.appendChild(box);

    var back = document.activeElement;
    function finish() {
      if (current !== state) return;
      current = null;
      scrim.remove();
      document.removeEventListener('keydown', onKey, true);
      if (opts.onClose) opts.onClose();
      if (back && back.isConnected) back.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); finish(); }
      if (e.key === 'Tab') trapFocus(e, box);
    }
    scrim.addEventListener('pointerdown', function (e) { if (e.target === scrim) finish(); });
    document.addEventListener('keydown', onKey, true);

    var root = document.querySelector('.screen:not([hidden])') || document.body;
    root.appendChild(scrim);
    var state = { close: finish, el: box };
    current = state;
    (opts.focus || focusBtn || box).focus();
    return state;
  }

  // Tab не уходит из модалки
  function trapFocus(e, box) {
    var list = box.querySelectorAll('button, input, select, textarea, [tabindex="0"]');
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function close() { if (current) current.close(); }

  // Предупреждение со значком: текст «что пропадёт»
  function warnText(text) {
    var w = ui.el('div', 'mo-warn');
    w.appendChild(ui.icon('warn'));
    w.appendChild(ui.el('div', null, text));
    return w;
  }

  // Копирование в буфер: navigator.clipboard по file:// может не сработать —
  // тогда скрытая textarea + execCommand('copy'). → Promise<boolean>
  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.className = 'copy-buf';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    }
    // Буфер может не ответить вовсе (нет фокуса, запрос разрешения) — не ждём дольше
    // COPY_WAIT: запасной путь ещё успевает внутри того же нажатия кнопки
    return new Promise(function (resolve) {
      var done = false;
      function end(ok) { if (!done) { done = true; resolve(ok); } }
      setTimeout(function () { end(fallback()); }, COPY_WAIT);
      try {
        navigator.clipboard.writeText(text).then(function () { end(true); }, function () { end(fallback()); });
      } catch (e) { end(fallback()); }
    });
  }

  MKB.ui.openModal = open;
  MKB.ui.closeModal = close;
  MKB.ui.warnText = warnText;
  MKB.ui.copyText = copyText;
})();
