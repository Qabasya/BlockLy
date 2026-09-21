/* редактор мастер-класса, этапов и фрагментов. Разметка и классы — из mockups/02-admin.html. */
window.MKB = window.MKB || {};
MKB.admin = MKB.admin || {};

(function () {
  var el = function () { return MKB.ui.el.apply(null, arguments); };
  var icon = function (n) { return MKB.ui.icon(n); };

  // «1 строка», «2 строки», «5 строк»
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    var w = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
    return n + ' ' + w;
  }

  // Короткий код для свёрнутого сайдбара: «МК-3: …» → «МК3»
  function shortCode(w) {
    var head = String(w.title || '').split(':')[0].replace(/[\s-]/g, '');
    return head.slice(0, 4) || '—';
  }

  function codeLines(code) {
    return String(code || '').split('\n').filter(function (l) { return l.trim(); });
  }

  function iconBtn(cls, name, label, disabled) {
    var b = el('button', cls);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.disabled = !!disabled;
    b.appendChild(icon(name));
    return b;
  }

  // Сводка под кодом фрагмента: блоки, хвосты, шаг отступа, поля
  function fragmentMeta(frag, language) {
    var bs = MKB.splitFragments([frag], language);
    var tails = bs.filter(function (b) { return b.closer !== null; }).length;
    var fields = [];
    bs.forEach(function (b) { fields = fields.concat(b.fields); });
    var parts = ['Блоков: ' + bs.length, 'хвост: ' + tails,
      'шаг отступа: ' + MKB.detectIndentStep([frag], language)];
    var f = 'полей ввода: ' + fields.length;
    if (fields.length === 1 && fields[0].options.length) {
      f += ' (список из ' + fields[0].options.length + ' значений)';
    }
    parts.push(f);
    return parts.join(' · ');
  }

  // Карточка фрагмента: свёрнутая — превью первой строки и счётчик
  function fragmentEl(frag, i, count, open, language) {
    var card = el('div', 'frag' + (open ? ' open' : ''));
    var h = el('div', 'frag-h');
    h.appendChild(el('span', 'frag-n', String(i + 1)));
    var lines = codeLines(frag.code);
    if (open) {
      h.appendChild(el('span', 'ttl', 'Фрагмент ' + (i + 1)));
    } else {
      h.appendChild(el('span', 'frag-prev', lines[0] ? lines[0].trim() : ''));
      if (frag.free) h.appendChild(el('span', 'badge b-info', 'строки меняются'));
    }
    h.appendChild(el('span', 'cnt', plural(lines.length, 'строка', 'строки', 'строк')));
    h.appendChild(iconBtn('ib', 'up', 'Выше', i === 0));
    h.appendChild(iconBtn('ib', 'down', 'Ниже', i === count - 1));
    h.appendChild(iconBtn('ib del', 'trash', 'Удалить фрагмент'));
    h.appendChild(iconBtn('ib', open ? 'up' : 'down', open ? 'Свернуть' : 'Развернуть'));
    card.appendChild(h);
    if (!open) return card;

    var body = el('div', 'frag-b');
    var ta = el('textarea', 'code');
    ta.spellcheck = false;
    ta.value = frag.code || '';
    body.appendChild(ta);
    var tools = el('div', 'tools');
    var sw = el('span', 'switch' + (frag.free ? ' on' : ''));
    sw.appendChild(el('span', 'track'));
    sw.appendChild(el('b', null, frag.free ? 'Включено' : 'Выключено'));
    sw.appendChild(el('span', null, 'Строки можно менять местами'));
    tools.appendChild(sw);
    var align = el('button', 'btn btn-s');
    align.type = 'button';
    align.appendChild(icon('align'));
    align.appendChild(document.createTextNode('Выровнять отступы'));
    tools.appendChild(align);
    body.appendChild(tools);
    body.appendChild(el('p', 'meta', fragmentMeta(frag, language)));
    card.appendChild(body);
    return card;
  }

  function stageTab(stage, i, on) {
    var b = el('button', 'stab' + (on ? ' on' : ''));
    b.type = 'button';
    b.appendChild(el('span', 'sq2', String(i + 1)));
    b.appendChild(document.createTextNode(stage.title || 'Без названия'));
    return b;
  }

  function sidebarItem(w, on) {
    var row = el('div', 'mk' + (on ? ' on' : ''));
    row.appendChild(el('span', 'sq', shortCode(w)));
    row.appendChild(el('span', 't', w.title || 'Новый мастер-класс'));
    row.appendChild(iconBtn('del', 'trash', 'Удалить мастер-класс'));
    return row;
  }

  // Заполнить экран админки мастер-классом w, этапом si; openFrag — индекс развёрнутого фрагмента
  function render(w, si, openFrag) {
    var $ = function (id) { return document.getElementById(id); };
    var stage = w.stages[si];
    $('adm-title').textContent = w.title || 'Новый мастер-класс';
    $('adm-name').value = w.title || '';
    $('adm-lang').value = w.language || '';

    $('adm-stage-cnt').textContent = plural(w.stages.length, 'этап', 'этапа', 'этапов');
    var tabs = $('adm-stabs');
    tabs.replaceChildren();
    w.stages.forEach(function (s, i) { tabs.appendChild(stageTab(s, i, i === si)); });
    var plus = el('button', 'stab plus');
    plus.type = 'button';
    plus.appendChild(icon('plus'));
    plus.appendChild(document.createTextNode('Этап'));
    tabs.appendChild(plus);
    $('adm-stage-name').value = stage.title || '';
    $('adm-stage-del').disabled = w.stages.length < 2;

    $('adm-frag-cnt').textContent = plural(stage.fragments.length, 'фрагмент', 'фрагмента', 'фрагментов');
    var list = $('adm-frags');
    list.replaceChildren();
    stage.fragments.forEach(function (f, i) {
      list.appendChild(fragmentEl(f, i, stage.fragments.length, i === openFrag, w.language));
    });

    var side = $('adm-list');
    side.replaceChildren();
    MKB.workshops.forEach(function (x) { side.appendChild(sidebarItem(x, x === w)); });
  }

  MKB.admin.plural = plural;
  MKB.admin.render = render;
})();
