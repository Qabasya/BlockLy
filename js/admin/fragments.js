/* карточки фрагментов: код, «Строки можно менять местами», ↑↓, удаление, выравнивание.
   Разметка — mockups/02-admin.html. Правит этап черновика MKB.admin.s. */
window.MKB = window.MKB || {};
MKB.admin = MKB.admin || {};

(function () {
  var A = MKB.admin;
  function ui() { return MKB.ui; }
  function el() { return MKB.ui.el.apply(null, arguments); }
  function icon(n) { return MKB.ui.icon(n); }
  function $(id) { return document.getElementById(id); }
  function plural() { return A.plural.apply(null, arguments); }

  function codeLines(code) {
    return String(code || '').split('\n').filter(function (l) { return l.trim(); });
  }
  function stage() { return A.s.w.stages[A.s.si]; }
  function hasCode(st) { return st.fragments.some(function (f) { return codeLines(f.code).length; }); }

  function btnIcon(cls, name, label, act, disabled) {
    var b = el('button', cls);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.title = label;
    b.dataset.act = act;
    b.disabled = !!disabled;
    b.appendChild(icon(name));
    return b;
  }

  // Сводка под кодом фрагмента: блоки, хвосты, шаг отступа, поля
  function fragmentMeta(frag) {
    var lang = A.s.w.language;
    var bs = MKB.splitFragments([frag], lang);
    var tails = bs.filter(function (b) { return b.closer !== null; }).length;
    var fields = [];
    bs.forEach(function (b) { fields = fields.concat(b.fields); });
    var f = 'полей ввода: ' + fields.length;
    if (fields.length === 1 && fields[0].options.length) f += ' (список из ' + fields[0].options.length + ' значений)';
    return ['Блоков: ' + bs.length, 'хвост: ' + tails, 'шаг отступа: ' + MKB.detectIndentStep([frag], lang), f].join(' · ');
  }

  // Карточка фрагмента; свёрнутая — превью первой строки и счётчик
  function fragmentEl(frag, i, count, open) {
    var card = el('div', 'frag' + (open ? ' open' : ''));
    card.dataset.i = i;
    var h = el('div', 'frag-h');
    h.appendChild(el('span', 'frag-n', String(i + 1)));
    var lines = codeLines(frag.code);
    if (open) h.appendChild(el('span', 'ttl', 'Фрагмент ' + (i + 1)));
    else {
      h.appendChild(el('span', 'frag-prev', lines[0] ? lines[0].trim() : ''));
      if (frag.free) h.appendChild(el('span', 'badge b-info', 'строки меняются'));
    }
    h.appendChild(el('span', 'cnt', lines.length ? plural(lines.length, 'строка', 'строки', 'строк') : 'пусто'));
    h.appendChild(btnIcon('ib', 'up', 'Выше', 'up', i === 0));
    h.appendChild(btnIcon('ib', 'down', 'Ниже', 'down', i === count - 1));
    h.appendChild(btnIcon('ib del', 'trash', 'Удалить фрагмент', 'del', count < 2));
    h.appendChild(btnIcon('ib', open ? 'up' : 'down', open ? 'Свернуть' : 'Развернуть', 'toggle'));
    card.appendChild(h);
    if (!open) return card;

    var body = el('div', 'frag-b');
    var ta = el('textarea', 'code');
    ta.spellcheck = false;
    ta.placeholder = 'Вставьте сюда кусок рабочего кода';
    ta.value = frag.code || '';
    ta.rows = Math.max(4, Math.min(16, String(frag.code || '').split('\n').length + 1));
    body.appendChild(ta);
    var tools = el('div', 'tools');
    var sw = el('button', 'switch' + (frag.free ? ' on' : ''));
    sw.type = 'button';
    sw.dataset.act = 'free';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', String(!!frag.free));
    sw.appendChild(el('span', 'track'));
    sw.appendChild(el('b', null, frag.free ? 'Включено' : 'Выключено'));
    sw.appendChild(el('span', null, 'Строки можно менять местами'));
    tools.appendChild(sw);
    var align = el('button', 'btn btn-s');
    align.type = 'button';
    align.dataset.act = 'align';
    align.disabled = !lines.length;
    align.appendChild(icon('align'));
    align.appendChild(document.createTextNode('Выровнять отступы'));
    tools.appendChild(align);
    body.appendChild(tools);
    var meta = el('p', 'meta', lines.length ? fragmentMeta(frag) : '');
    meta.hidden = !lines.length;
    body.appendChild(meta);
    card.appendChild(body);
    return card;
  }

  function renderFragments() {
    var st = stage(), list = $('adm-frags');
    $('adm-frag-cnt').textContent = plural(st.fragments.length, 'фрагмент', 'фрагмента', 'фрагментов');
    list.replaceChildren.apply(list, st.fragments.map(function (f, i) {
      return fragmentEl(f, i, st.fragments.length, !!A.s.open[i]);
    }));
    renderParseRow();
  }

  function renderParseRow() {
    var ok = hasCode(stage());
    $('adm-parse').disabled = !ok;
    $('adm-parse-tx').textContent = ok
      ? 'Когда фрагменты вставлены, разберите код на шаги. К фрагментам можно вернуться.'
      : 'Вставьте код хотя бы в один фрагмент.';
  }

  // Развёрнуты пустые фрагменты: их надо заполнить
  function setOpenFor(st) {
    A.s.open = {};
    st.fragments.forEach(function (f, i) { if (!codeLines(f.code).length) A.s.open[i] = true; });
  }

  function deleteFragment(i) {
    var st = stage(), f = st.fragments[i];
    var lines = MKB.splitFragments([f], A.s.w.language).map(function (b) { return b.text; });
    var gone = st.steps.filter(function (s) { return s.text && lines.indexOf(s.line) >= 0; });
    var text = 'Фрагмент из ' + plural(codeLines(f.code).length, 'строки', 'строк', 'строк') + ' будет удалён';
    if (gone.length) {
      text += ', вместе с ним пропадут описания ' + plural(gone.length, 'шага', 'шагов', 'шагов') + ' (' +
        gone.slice(0, 3).map(function (s) { return '«' + s.line + '»'; }).join(', ') + (gone.length > 3 ? ', …' : '') + ')';
    }
    ui().openModal({
      cls: 'wide',
      title: 'Удалить фрагмент ' + (i + 1) + '?',
      body: [ui().warnText(text + '. Изменения вступят в силу после сохранения.')],
      buttons: [
        { label: 'Отмена', autofocus: true },
        { label: 'Удалить фрагмент', cls: 'btn-d', icon: 'trash', action: function (close) {
          close();
          st.fragments.splice(i, 1);
          var open = {};
          Object.keys(A.s.open).forEach(function (k) { k = +k; if (k < i) open[k] = true; else if (k > i) open[k - 1] = true; });
          A.s.open = open;
          renderFragments();
          A.changed();
        } }
      ]
    });
  }

  function moveFragment(i, d) {
    var fr = stage().fragments, j = i + d;
    if (j < 0 || j >= fr.length) return;
    var x = fr[i]; fr[i] = fr[j]; fr[j] = x;
    var oi = !!A.s.open[i], oj = !!A.s.open[j];
    A.s.open[i] = oj; A.s.open[j] = oi;
    renderFragments();
    A.changed();
    var btn = document.querySelector('#adm-frags .frag[data-i="' + j + '"] [data-act="' + (d < 0 ? 'up' : 'down') + '"]');
    if (btn && !btn.disabled) btn.focus();
  }

  // Кнопки карточки и «+ Фрагмент»
  function onClick(t, card) {
    if (t.id === 'adm-frag-add') {
      stage().fragments.push({ free: false, code: '' });
      A.s.open[stage().fragments.length - 1] = true;
      renderFragments();
      A.changed();
      var tas = document.querySelectorAll('#adm-frags textarea');
      if (tas.length) tas[tas.length - 1].focus();
      return;
    }
    var i = +card.dataset.i, act = t.dataset.act, f = stage().fragments[i];
    if (act === 'up') moveFragment(i, -1);
    else if (act === 'down') moveFragment(i, 1);
    else if (act === 'del') deleteFragment(i);
    else if (act === 'toggle') { A.s.open[i] = !A.s.open[i]; renderFragments(); }
    else if (act === 'free') { f.free = !f.free; renderFragments(); A.changed(); }
    else if (act === 'align') {
      var unit = (MKB.config.indent || {})[A.s.w.language] || MKB.detectIndentStep([f], A.s.w.language);
      f.code = MKB.alignIndent(f.code, unit);
      renderFragments();
      A.changed();
    }
  }

  // Код правится на месте, без перерисовки поля — иначе сбился бы курсор
  function onInput(t) {
    var card = t.closest('.frag'), f = stage().fragments[+card.dataset.i];
    f.code = t.value;
    var n = codeLines(f.code).length;
    card.querySelector('.frag-h .cnt').textContent = n ? plural(n, 'строка', 'строки', 'строк') : 'пусто';
    card.querySelector('[data-act="align"]').disabled = !n;
    var meta = card.querySelector('.meta');
    meta.hidden = !n;
    meta.textContent = n ? fragmentMeta(f) : '';
    renderParseRow();
    A.changed();
  }

  MKB.admin.frags = {
    render: renderFragments,
    setOpenFor: setOpenFor,
    onClick: onClick,
    onInput: onInput
  };
})();
