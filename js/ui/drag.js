/* перетаскивание с «подтягиванием» за курсором. Pointer events: мышь и тачпад.
   Сам ничего не меняет в сборке — сообщает, что куда отпустили. */
window.MKB = window.MKB || {};
MKB.ui = MKB.ui || {};

(function () {
  var THRESHOLD = 4;        // px: меньше — это клик (фокус, поле ввода), не перенос
  var EDGE = 40;            // px от края колонки, где она начинает прокручиваться
  var SPEED = 12;           // px за кадр
  var DROP_TEXT = 'Отпусти, чтобы поставить';

  function pathOf(e) {
    return e.dataset.path ? e.dataset.path.split('.').map(Number) : null;
  }

  // root — экран ученика. onDrop(src, target):
  //   src    = { id, path }  — path null, если блок из палитры
  //   target = { kind: 'slot', path, filled } | { kind: 'pal' }
  // Отпустили вне слота и палитры — onDrop не зовётся, блок остаётся где был.
  function initDrag(root, onDrop) {
    var d = null;

    root.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || d) return;
      if (e.target.closest('select, input, textarea')) return;
      var src = e.target.closest('.pz[data-id]');
      if (!src || !root.contains(src)) return;
      d = { src: src, x0: e.clientX, y0: e.clientY, started: false, target: null, drop: null };
    });

    document.addEventListener('pointermove', function (e) {
      if (!d) return;
      d.x = e.clientX; d.y = e.clientY;
      if (!d.started) {
        if (Math.abs(d.x - d.x0) + Math.abs(d.y - d.y0) < THRESHOLD) return;
        start();
      }
      e.preventDefault();
      d.ghost.style.left = (d.x - d.dx) + 'px';
      d.ghost.style.top = (d.y - d.dy) + 'px';
      hover();
    });

    document.addEventListener('pointerup', function () {
      if (!d) return;
      var done = d.started ? d.target : null, src = d.src;
      finish();
      if (done) onDrop({ id: src.dataset.id, path: pathOf(src) }, done);
    });
    document.addEventListener('pointercancel', finish);
    document.addEventListener('keydown', function (e) {
      if (d && d.started && e.key === 'Escape') finish();
    });

    // Блок «подтягивается»: копия приподнята, наклонена, с тенью; на месте — бледный след
    function start() {
      var r = d.src.getBoundingClientRect();
      d.started = true;
      d.dx = d.x0 - r.left; d.dy = d.y0 - r.top;
      var g = d.src.cloneNode(true);
      // значения списков при копировании узла не переносятся
      var from = d.src.querySelectorAll('select'), to = g.querySelectorAll('select');
      for (var i = 0; i < from.length; i++) to[i].value = from[i].value;
      g.classList.add('st-lift', 'dragging');
      g.removeAttribute('tabindex');
      g.style.width = r.width + 'px';
      root.appendChild(g);
      d.ghost = g;
      d.src.classList.add('drag-src');
      document.body.classList.add('is-dragging');
      d.raf = requestAnimationFrame(autoScroll);
    }

    // Что под курсором: слот (пустой или занятый) или палитра
    function hover() {
      var hit = document.elementFromPoint(d.x, d.y);
      var t = null, mark = null;
      var slot = hit && hit.closest('#stu-work [data-path]');
      if (slot && slot !== d.src && !d.src.contains(slot)) {
        t = { kind: 'slot', path: pathOf(slot), filled: !!slot.dataset.id };
        mark = slot;
      } else if (hit && hit.closest('.pnl') && hit.closest('.pnl').querySelector('#stu-pal') && d.src.dataset.path) {
        t = { kind: 'pal' };
        mark = hit.closest('.pnl');
      }
      if (mark !== d.drop) {
        unmark();
        if (mark) {
          mark.classList.add(t.kind === 'pal' ? 'pal-drop' : 'drop');
          var ph = mark.querySelector(':scope > .ph');
          if (ph) { d.phText = ph.textContent; ph.textContent = DROP_TEXT; }
        }
        d.drop = mark;
      }
      d.target = t;
    }

    function unmark() {
      if (!d.drop) return;
      d.drop.classList.remove('drop', 'pal-drop');
      var ph = d.drop.querySelector(':scope > .ph');
      if (ph && d.phText != null) ph.textContent = d.phText;
      d.phText = null;
    }

    // У верхнего и нижнего края колонки она прокручивается сама
    function autoScroll() {
      if (!d || !d.started) return;
      var hit = document.elementFromPoint(d.x, d.y);
      var box = hit && hit.closest('.pnl-b');
      if (box) {
        var r = box.getBoundingClientRect();
        if (d.y < r.top + EDGE) box.scrollTop -= SPEED;
        else if (d.y > r.bottom - EDGE) box.scrollTop += SPEED;
      }
      d.raf = requestAnimationFrame(autoScroll);
    }

    function finish() {
      if (!d) return;
      if (d.started) {
        cancelAnimationFrame(d.raf);
        unmark();
        d.ghost.remove();
        d.src.classList.remove('drag-src');
        document.body.classList.remove('is-dragging');
      }
      d = null;
    }
  }

  MKB.ui.initDrag = initDrag;
})();
