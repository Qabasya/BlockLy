/* редактор мастер-класса и этапов; фрагменты — fragments.js. Разметка — mockups/02-admin.html.
   Правит черновик MKB.admin.s.w; о каждой правке сообщает MKB.admin.changed(). */
window.MKB = window.MKB || {};
MKB.admin = MKB.admin || {};

(function () {
  var A = MKB.admin;
  var ui = MKB.ui, el = ui.el, icon = ui.icon, $ = ui.$;

  // Форма слова по числу: «строка», «строки», «строк»
  function pluralWord(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    return m10 === 1 && m100 !== 11 ? one
      : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
  }

  // «1 строка», «2 строки», «5 строк»
  function plural(n, one, few, many) { return n + ' ' + pluralWord(n, one, few, many); }

  function renderStages() {
    var w = A.s.w;
    $('adm-stage-cnt').textContent = plural(w.stages.length, 'этап', 'этапа', 'этапов');
    var tabs = $('adm-stabs');
    tabs.replaceChildren();
    w.stages.forEach(function (s, i) {
      var b = el('button', 'stab' + (i === A.s.si ? ' on' : ''));
      b.type = 'button';
      b.dataset.i = i;
      b.appendChild(el('span', 'sq2', String(i + 1)));
      b.appendChild(el('span', 'stab-t', s.title || 'Новый этап'));
      tabs.appendChild(b);
    });
    var plus = el('button', 'stab plus');
    plus.type = 'button';
    plus.dataset.act = 'add-stage';
    plus.appendChild(icon('plus'));
    plus.appendChild(document.createTextNode('Этап'));
    tabs.appendChild(plus);
    $('adm-stage-name').value = A.stage().title || '';
    var del = $('adm-stage-del');
    del.disabled = w.stages.length < 2;
    del.title = del.disabled ? 'Нельзя удалить единственный этап' : '';
  }

  // Весь центр редактора
  function render() {
    var w = A.s.w;
    $('adm-name').value = w.title || '';
    $('adm-lang').value = w.language || '';
    renderStages();
    A.frags.render();
  }

  // ─── правки ───
  function selectStage(i) {
    A.s.si = i;
    A.s.mode = 'frags';
    A.frags.setOpenFor(A.stage());
    A.render();
  }

  function addStage() {
    var w = A.s.w;
    var n = w.stages.length + 1, id = 'stage' + n;
    while (w.stages.some(function (s) { return s.id === id; })) id = 'stage' + ++n;
    w.stages.push({ id: id, title: '', fragments: [{ free: false, code: '' }], steps: [] });
    selectStage(w.stages.length - 1);
    A.changed();
    $('adm-stage-name').focus();
  }

  // Копия этапа встаёт сразу за исходным: код фрагментов и описания шагов
  // сохраняются, дальше правится только то, что изменилось.
  function duplicateStage() {
    var w = A.s.w, src = A.stage();
    var copy = JSON.parse(JSON.stringify(src));
    var n = w.stages.length + 1, id = 'stage' + n;
    while (w.stages.some(function (s) { return s.id === id; })) id = 'stage' + ++n;
    copy.id = id;
    copy.title = src.title ? src.title + ' (копия)' : '';
    w.stages.splice(A.s.si + 1, 0, copy);
    selectStage(A.s.si + 1);
    A.changed();
    $('adm-stage-name').select();
  }

  function deleteStage() {
    var st = A.stage(), w = A.s.w;
    if (w.stages.length < 2) return;
    var nSteps = MKB.splitFragments(st.fragments, w.language).length;
    ui.openModal({
      cls: 'wide',
      title: 'Удалить этап?',
      body: [ui.warnText('Этап «' + (st.title || 'Новый этап') + '» будет удалён вместе с ' +
        plural(st.fragments.length, 'фрагментом', 'фрагментами', 'фрагментами') + ' и описаниями ' +
        plural(nSteps, 'шага', 'шагов', 'шагов') + '. Изменения вступят в силу после сохранения.')],
      buttons: [
        { label: 'Отмена', autofocus: true },
        { label: 'Удалить этап', cls: 'btn-d', icon: 'trash', action: function (close) {
          close();
          w.stages.splice(A.s.si, 1);
          selectStage(Math.max(0, A.s.si - 1));
          A.changed();
        } }
      ]
    });
  }

  function onClick(e) {
    var t = e.target.closest('button');
    if (!t || !$('scr-admin').contains(t)) return;
    var card = t.closest('.frag');
    var act = t.dataset.act;
    if (t.classList.contains('stab') && !act) return selectStage(+t.dataset.i);
    if (act === 'add-stage') return addStage();
    if (t.id === 'adm-stage-dup') return duplicateStage();
    if (t.id === 'adm-stage-del') return deleteStage();
    if (t.id === 'adm-frag-add' || card) return A.frags.onClick(t, card);
  }

  // Текст правится на месте, без перерисовки поля — иначе сбился бы курсор
  function onInput(e) {
    var t = e.target, w = A.s.w;
    if (t.id === 'adm-name') { w.title = t.value; A.changed(); return; }
    if (t.id === 'adm-lang') { w.language = t.value; A.frags.render(); A.changed(); return; }
    if (t.id === 'adm-stage-name') {
      A.stage().title = t.value;
      var tab = document.querySelector('#adm-stabs .stab.on .stab-t');
      if (tab) tab.textContent = t.value || 'Новый этап';
      A.changed();
      return;
    }
    if (t.matches('#adm-frags textarea')) A.frags.onInput(t);
  }

  function init() {
    var root = $('scr-admin');
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);        // у select тоже приходит input
  }

  MKB.admin.plural = plural;
  MKB.admin.pluralWord = pluralWord;
  MKB.admin.editor = { init: init, render: render };
})();
