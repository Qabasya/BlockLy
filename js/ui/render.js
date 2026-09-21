/* рекурсивная отрисовка слотов и пазлов. Разметка и классы — из mockups/03-student.html.
   Данные мастер-класса в DOM попадают только через textContent: в коде есть <, > и &. */
window.MKB = window.MKB || {};
MKB.ui = MKB.ui || {};

(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var FIELD_RE = /\{\{(.*?)\}\}/g;

  // Элемент с классом и текстом; текст — только textContent
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function icon(name) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'ic');
    var u = document.createElementNS(NS, 'use');
    u.setAttribute('href', '#i-' + name);
    s.appendChild(u);
    return s;
  }

  // Тип строки — цвет полоски: открывающая / с полем ввода / обычная.
  // Поле важнее: его ученик должен заметить и заполнить, а открывающую строку
  // в слоте и так видно по форме буквы «С».
  function blockType(b) {
    if (b.fields.length) return 'field';
    if (b.bodyCount > 0 || b.closer !== null) return 'open';
    return 'plain';
  }

  // Цвет кружка фрагмента: жёлтый, розовый, голубой, тёмно-серый, дальше по кругу
  function fragClass(group) { return 'f' + ((group - 1) % 4 + 1); }

  // Кусок кода с подсветкой различий: спаны [start, end) в координатах text
  function appendMarked(parent, text, offset, spans) {
    var pos = 0;
    (spans || []).forEach(function (sp) {
      var s = Math.max(sp[0] - offset, pos), e = Math.min(sp[1] - offset, text.length);
      if (s >= e) return;
      if (s > pos) parent.appendChild(document.createTextNode(text.slice(pos, s)));
      parent.appendChild(el('mark', null, text.slice(s, e)));
      pos = e;
    });
    if (pos < text.length) parent.appendChild(document.createTextNode(text.slice(pos)));
  }

  // Поле ввода внутри строки: список (▾) или свободный ввод.
  // Ширина — по длине эталона + 2, иначе поле выдаёт длину ответа.
  function fieldEl(field, value) {
    var box = el('span', 'inl');
    var width = MKB.fieldWidth(field) + 'ch';
    var ctl;
    if (field.options.length) {
      ctl = el('select');
      ctl.appendChild(el('option', null, ''));
      field.options.forEach(function (o) { ctl.appendChild(el('option', null, o)); });
    } else {
      ctl = el('input');
      ctl.type = 'text';
      ctl.spellcheck = false;
      ctl.autocomplete = 'off';
    }
    ctl.value = value || '';
    ctl.style.width = width;
    ctl.dataset.field = field.id;
    ctl.setAttribute('aria-label', 'Поле ввода');
    box.appendChild(ctl);
    if (field.options.length) box.appendChild(icon('down'));
    return box;
  }

  // Текст строки: литералы с <mark>, поля — элементами управления
  function codeEl(b, opts) {
    var code = el('span', 'code');
    var last = 0, i = 0, m;
    FIELD_RE.lastIndex = 0;
    while ((m = FIELD_RE.exec(b.text))) {
      appendMarked(code, b.text.slice(last, m.index), last, opts.diffs);
      var f = b.fields[i++];
      code.appendChild(fieldEl(f, opts.values && opts.values[f.id]));
      last = m.index + m[0].length;
    }
    appendMarked(code, b.text.slice(last), last, opts.diffs);
    return code;
  }

  // Блок-строка. opts: { state: 'pal' | 'slot' | …, diffs, values }
  function blockEl(b, opts) {
    opts = opts || {};
    var e = el('div', 'pz ty-' + blockType(b) + ' st-' + (opts.state || 'pal'));
    e.dataset.id = b.id;
    e.appendChild(el('i', 'stripe'));
    e.appendChild(el('i', 'fdot ' + fragClass(b.group)));
    e.appendChild(codeEl(b, opts));
    return e;
  }

  // Пустой слот
  function emptyEl(text) {
    var e = el('div', 'pz empty');
    e.appendChild(el('span', 'ph', text || 'Перетащи блок сюда'));
    return e;
  }

  // Контур пазла: выступ снизу, выемка сверху, у «С» — вырез под тело.
  // Образец — shape() в mockups/03-student.html.
  function shape(e) {
    var w = e.offsetWidth, h = e.offsetHeight;
    if (!w || !h) return;
    var r = 8, d = 5;
    var p = 'M' + r + ',0H14L18,' + d + 'H34L38,0H' + (w - r) + 'Q' + w + ',0 ' + w + ',' + r +
      'V' + (h - r) + 'Q' + w + ',' + h + ' ' + (w - r) + ',' + h +
      'H38L34,' + (h + d) + 'H18L14,' + h + 'H' + r + 'Q0,' + h + ' 0,' + (h - r) + 'V' + r + 'Q0,0 ' + r + ',0Z';
    var m = e.querySelector(':scope > .mouth');
    if (m) {
      var x = m.offsetLeft, y = m.offsetTop, mw = m.offsetWidth, mh = m.offsetHeight;
      p += 'M' + x + ',' + y + 'H' + (x + 14) + 'L' + (x + 18) + ',' + (y + d) + 'H' + (x + 34) +
        'L' + (x + 38) + ',' + y + 'H' + (x + mw) + 'V' + (y + mh) + 'H' + x + 'Z';
    }
    e.querySelectorAll(':scope > svg').forEach(function (s) { s.remove(); });
    ['bg', 'ln'].forEach(function (cls) {
      var s = document.createElementNS(NS, 'svg');
      s.setAttribute('class', cls);
      s.setAttribute('width', w);
      s.setAttribute('height', h);
      (cls === 'bg' ? ['f', 'h'] : ['l']).forEach(function (c) {
        var pa = document.createElementNS(NS, 'path');
        pa.setAttribute('d', p);
        pa.setAttribute('class', c);
        pa.setAttribute('fill-rule', 'evenodd');
        s.appendChild(pa);
      });
      e.insertBefore(s, e.firstChild);
    });
  }

  // Перерисовать контуры всех пазлов внутри root (после вставки и при смене ширины).
  // Вложенные — раньше внешних: размер «С» зависит от содержимого.
  function shapeAll(root) {
    var list = Array.prototype.slice.call((root || document).querySelectorAll('.pz'));
    list.reverse().forEach(shape);
  }

  MKB.ui.el = el;
  MKB.ui.icon = icon;
  MKB.ui.blockType = blockType;
  MKB.ui.blockEl = blockEl;
  MKB.ui.emptyEl = emptyEl;
  MKB.ui.shape = shape;
  MKB.ui.shapeAll = shapeAll;
})();
