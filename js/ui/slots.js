/* доска ученика: дерево слотов, палитра, строка шага, счётчик — из MKB.state.
   Рисует заново целиком; вид и тексты — mockups/03-student.html. */
window.MKB = window.MKB || {};
MKB.ui = MKB.ui || {};

(function () {
  var ui = MKB.ui, S = MKB.state, $ = ui.$;

  // Дерево слотов. view.result — результат MKB.validate: статусы по индексу обхода
  function renderWork(st, view) {
    var res = view.result, idx = 0;
    var fieldSt = {};
    if (res) res.fields.forEach(function (f) { fieldSt[f.id] = f.status; });

    function slotEl(s, path) {
      var i = idx++;
      var e;
      if (!s.id) {
        e = ui.emptyEl();
      } else {
        var b = st.byId[s.id];
        var opts = {
          state: res ? res.slots[i].status : 'slot',
          diffs: st.diffs[b.id],
          values: st.values,
          options: st.options,
          fields: res ? fieldSt : null
        };
        if (ui.isOpener(b)) {
          var kids = s.kids.map(function (k, j) { return slotEl(k, path.concat(j)); });
          e = ui.openerEl(b, opts, kids);
        } else {
          e = ui.blockEl(b, opts);
        }
      }
      e.dataset.path = path.join('.');
      return e;
    }

    var work = $('stu-work');
    work.replaceChildren.apply(work, st.slots.map(function (s, i) { return slotEl(s, [i]); }));
  }

  // Палитра в её перемешанном порядке; пустая — «Все блоки разложены»
  function renderPalette(st, view) {
    var pal = $('stu-pal');
    var ids = S.palette(st);
    if (!ids.length) {
      var box = ui.el('div', 'pal-empty');
      var round = ui.el('span', 'round');
      round.appendChild(ui.icon('check'));
      box.appendChild(round);
      box.appendChild(ui.el('b', null, 'Все блоки разложены'));
      box.appendChild(ui.el('span', null, 'Чтобы вернуть блок, перетащи его сюда.'));
      pal.replaceChildren(box);
    } else {
      pal.replaceChildren.apply(pal, ids.map(function (id) {
        return ui.blockEl(st.byId[id], {
          state: id === view.hint ? 'hint' : 'pal',
          diffs: st.diffs[id],
          values: st.values,
          options: st.options
        });
      }));
    }
    $('stu-count').textContent = ids.length;
  }

  // Строка под шапкой: следующий шаг или итог проверки
  function renderBar(st, view) {
    var box = ui.el('div', 'stepbox');
    var res = view.result;
    if (res && res.ok) {
      box.classList.add('okb');
      box.appendChild(ui.icon('check'));
      box.appendChild(ui.el('span', 'steptx', 'Всё верно!'));
    } else if (res) {
      box.classList.add('warn');
      box.appendChild(ui.icon('warn'));
      box.appendChild(ui.el('span', 'steptx', 'Почти получилось! Проверь подсвеченные блоки.'));
    } else {
      var next = S.nextBlock(st);
      if (!next || S.isFull(st)) {
        box.appendChild(ui.el('span', 'steptx', 'Всё поставлено. Нажми «Проверить»!'));
      } else {
        var step = st.stage.steps[next.position];
        box.appendChild(ui.el('span', 'stepno', 'Шаг ' + (next.position + 1) + ' из ' + st.blocks.length));
        box.appendChild(ui.el('span', 'steptx', step ? step.text : ''));
      }
    }
    $('stu-bar').replaceChildren(box);
  }

  // Низ колонки и шапка: «Проверить» активна, когда заполнены все слоты;
  // тогда же подсказывать нечего — «Подсказка» гаснет, «Проверить» светится.
  function renderControls(st, view) {
    var full = S.isFull(st), res = view.result;
    var check = $('stu-check'), hint = $('stu-hint');
    check.disabled = !full;
    check.classList.toggle('glow', full && !res);
    hint.disabled = full;
    hint.classList.toggle('btn-hint', !full);
    $('stu-foot').textContent = !full ? 'Заполни все слоты, чтобы проверить'
      : !res ? 'Все слоты заполнены'
      : res.ok ? 'Этап собран верно'
      : 'Поправь подсвеченные блоки и проверь ещё раз';
  }

  // view: { result: Result | null, hint: id блока с подсказкой | null }
  function renderBoard(st, view) {
    view = view || {};
    var w = st.workshop;
    $('stu-title').textContent = w.title;
    $('stu-stage-n').textContent = 'Этап ' + (st.stageIndex + 1) + ' из ' + w.stages.length;
    $('stu-stage-t').textContent = st.stage.title;
    renderBar(st, view);
    renderWork(st, view);
    renderPalette(st, view);
    renderControls(st, view);
    ui.shapeAll($('scr-student'));
  }

  MKB.ui.renderBoard = renderBoard;
})();
