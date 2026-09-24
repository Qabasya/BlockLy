/* разбор на шаги, перенос описаний. Режим «Шаги» редактора (mockups/02-admin.html, 2б–2в, 2ж). */
window.MKB = window.MKB || {};
MKB.admin = MKB.admin || {};

(function () {
  var A = MKB.admin;
  var ui = MKB.ui, el = ui.el, icon = ui.icon, $ = ui.$;
  function blocks() { return MKB.splitFragments(A.stage().fragments, A.s.w.language); }

  // Привести шаги к коду без вопросов, если ни одно описание не пропадёт.
  // → true, если шаги теперь совпадают с кодом. Зовётся из A.render: режим
  // «Шаги» переживает смену этапа и правку кода, пока ничего не теряется.
  function trySync() {
    var st = A.stage(), bs = blocks();
    if (!bs.length) return false;
    if (MKB.stepsInSync(bs, st.steps)) return true;
    if (MKB.reparseSummary(bs, st.steps).lost) return false;
    st.steps = MKB.transferSteps(bs, st.steps);
    A.changed();
    return true;
  }

  // «Разобрать на шаги →». Модалка — только если какие-то описания пропадут.
  function parse() {
    var st = A.stage(), bs = blocks();
    if (!bs.length) return;
    if (trySync()) return show();

    var sum = MKB.reparseSummary(bs, st.steps);
    var list = el('ul', 'mo-list');
    function li(before, n, after) {
      var x = el('li');
      x.appendChild(document.createTextNode(before));
      x.appendChild(el('b', null, String(n)));
      x.appendChild(document.createTextNode(after));
      list.appendChild(x);
    }
    li('Описания сохранятся у ', sum.kept, ' ' + word(sum.kept, 'строки, которая', 'строк, которые', 'строк, которые') + ' не изменились.');
    if (sum.lost) li('Описания ', sum.lost, ' ' + word(sum.lost, 'изменённой или удалённой строки', 'изменённых или удалённых строк', 'изменённых или удалённых строк') + ' пропадут.');
    if (sum.fresh) li('', sum.fresh, ' ' + word(sum.fresh, 'новая строка будет', 'новые строки будут', 'новых строк будут') + ' без описания.');
    ui.openModal({
      cls: 'wide',
      title: 'Разобрать код заново?',
      body: [el('span', null, 'Код фрагментов изменился с прошлого разбора.'), list],
      buttons: [
        { label: 'Отмена', autofocus: true },
        { label: 'Разобрать заново', cls: 'btn-p', action: function (close) { close(); apply(bs); } }
      ]
    });
  }

  function word(n, one, few, many) { return A.pluralWord(n, one, few, many); }

  function apply(bs) {
    var st = A.stage();
    var next = MKB.transferSteps(bs, st.steps);
    if (JSON.stringify(next) !== JSON.stringify(st.steps)) { st.steps = next; A.changed(); }
    show();
  }

  function show() {
    A.s.mode = 'steps';
    A.render();
    $('scr-admin').querySelector('.main').scrollTop = 0;
  }

  // Код строки: поля — плашками «White | Red | Blue»
  function codeEl(text) {
    var span = el('span');
    MKB.eachPart(text, function (chunk) {
      span.appendChild(document.createTextNode(chunk));
    }, function (i, inner) {
      span.appendChild(el('span', 'chip-f', inner.split('|').join(' | ')));
    });
    return span;
  }

  function missEl() {
    var m = el('span', 'miss-t');
    m.appendChild(icon('warn'));
    m.appendChild(document.createTextNode('Нет описания — ученик увидит пустой шаг'));
    return m;
  }

  function stepEl(b, step, i) {
    var row = el('div', 'step');
    row.style.setProperty('--d', b.depth);
    row.appendChild(el('div', 'sn', 'Шаг ' + (i + 1)));
    var sb = el('div', 'sb');
    var code = el('div', 'code');
    code.appendChild(codeEl(b.text));
    code.appendChild(el('span', 'ft', 'фрагмент ' + b.group));
    sb.appendChild(code);
    var input = el('input');
    input.type = 'text';
    input.value = step.text || '';
    input.placeholder = 'Что должен сделать ученик на этом шаге?';
    input.dataset.step = i;
    input.setAttribute('aria-label', 'Описание шага ' + (i + 1));
    sb.appendChild(input);
    var miss = missEl();
    sb.appendChild(miss);
    row.appendChild(sb);
    markMiss(input);
    return row;
  }

  function markMiss(input) {
    var empty = !input.value.trim();
    input.classList.toggle('miss', empty);
    input.nextSibling.hidden = !empty;
  }

  function renderMissCount() {
    var n = A.stage().steps.filter(function (s) { return !(s.text || '').trim(); }).length;
    var b = $('adm-steps-miss');
    b.hidden = !n;
    b.textContent = A.plural(n, 'шаг', 'шага', 'шагов') + ' без описания';
  }

  function render() {
    var st = A.stage(), bs = blocks();
    $('adm-steps-sub').textContent = 'Код разобран на ' + A.plural(bs.length, 'строку-блок', 'строки-блока', 'строк-блоков') +
      '. Каждая строка — один шаг; описание увидит ученик, когда дойдёт до неё.';
    var list = $('adm-steps');
    list.replaceChildren.apply(list, bs.map(function (b, i) { return stepEl(b, st.steps[i] || { text: '' }, i); }));
    renderMissCount();
  }

  function onInput(e) {
    var t = e.target;
    if (!t.matches('#adm-steps input')) return;
    var st = A.stage(), i = +t.dataset.step;
    st.steps[i].text = t.value;
    markMiss(t);
    renderMissCount();
    A.changed();
  }

  function init() {
    $('adm-parse').addEventListener('click', parse);
    $('adm-back').addEventListener('click', function () { A.s.mode = 'frags'; A.render(); });
    $('adm-steps').addEventListener('input', onInput);
  }

  MKB.admin.steps = { init: init, render: render, parse: parse, trySync: trySync };
})();
