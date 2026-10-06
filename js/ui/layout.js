/* Размеры панелей ученика и управление эталонным кодом. */
window.MKB = window.MKB || {};
MKB.ui = MKB.ui || {};

(function () {
  var ui = MKB.ui, $ = ui.$;
  var cols, side, work, reference, columnHandle, rowHandle, toggle, minus, plus;
  var columnShare = null, rowShare = null, collapsed = false, fontSize = 12;
  var COLUMN_HANDLE = 16, ROW_HANDLE = 12;

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function isGrid() { return window.getComputedStyle(cols).display === 'grid'; }

  function columnSpace() {
    var style = window.getComputedStyle(cols);
    return cols.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - COLUMN_HANDLE;
  }

  function setColumn(width) {
    var space = columnSpace();
    if (!isGrid() || space <= 0) return;
    width = clamp(width, Math.min(300, space / 2), space - Math.min(300, space / 2));
    columnShare = width / space;
    cols.style.gridTemplateColumns = width + 'px ' + COLUMN_HANDLE + 'px minmax(0, 1fr)';
    columnHandle.setAttribute('aria-valuenow', Math.round(columnShare * 100));
  }

  function rowSpace() { return side.clientHeight - ROW_HANDLE; }

  function setRow(height) {
    var space = rowSpace();
    if (space <= 0) return;
    height = clamp(height, Math.min(120, space / 2), space - Math.min(120, space / 2));
    rowShare = height / space;
    if (!collapsed) side.style.gridTemplateRows = height + 'px ' + ROW_HANDLE + 'px minmax(0, 1fr)';
    rowHandle.setAttribute('aria-valuenow', Math.round(rowShare * 100));
  }

  function refresh() {
    if (isGrid()) {
      var space = columnSpace();
      if (space > 0) setColumn(columnShare === null ? work.getBoundingClientRect().width : space * columnShare);
    } else {
      cols.style.gridTemplateColumns = '';
    }
    var height = rowSpace();
    if (height > 0) setRow(rowShare === null ? reference.getBoundingClientRect().height : height * rowShare);
  }

  function setCollapsed(value) {
    collapsed = value;
    side.classList.toggle('reference-collapsed', value);
    side.style.gridTemplateRows = value ? '40px 0 minmax(0, 1fr)' : '';
    toggle.textContent = value ? 'Показать' : 'Скрыть';
    toggle.title = value ? 'Показать эталонный код' : 'Скрыть эталонный код';
    toggle.setAttribute('aria-expanded', String(!value));
    if (!value) refresh();
  }

  function setFont(size) {
    fontSize = clamp(size, 10, 22);
    $('stu-reference').style.fontSize = fontSize + 'px';
    minus.disabled = fontSize === 10;
    plus.disabled = fontSize === 22;
  }

  function makeDrag(handle, axis, panel, setSize, getSpace) {
    var start = null;
    handle.addEventListener('pointerdown', function (event) {
      if (event.button !== 0 || (axis === 'x' && !isGrid()) || collapsed && axis === 'y') return;
      start = { pointer: event.pointerId, point: axis === 'x' ? event.clientX : event.clientY,
        size: axis === 'x' ? panel.getBoundingClientRect().width : panel.getBoundingClientRect().height };
      try { handle.setPointerCapture(event.pointerId); }
      catch (error) { start = null; return; }
      event.preventDefault();
    });
    handle.addEventListener('pointermove', function (event) {
      if (!start || event.pointerId !== start.pointer) return;
      setSize(start.size + (axis === 'x' ? event.clientX : event.clientY) - start.point);
    });
    function end(event) {
      if (start && event.pointerId === start.pointer) start = null;
    }
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('lostpointercapture', function () { start = null; });
    handle.addEventListener('keydown', function (event) {
      if (axis === 'x' && !isGrid() || axis === 'y' && collapsed) return;
      var step = axis === 'x' ? (event.key === 'ArrowLeft' ? -24 : event.key === 'ArrowRight' ? 24 : 0) :
        (event.key === 'ArrowUp' ? -24 : event.key === 'ArrowDown' ? 24 : 0);
      if (!step && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      var space = getSpace();
      var current = axis === 'x' ? panel.getBoundingClientRect().width : panel.getBoundingClientRect().height;
      setSize(event.key === 'Home' ? 0 : event.key === 'End' ? space : current + step);
    });
  }

  function init() {
    cols = document.querySelector('#scr-student .cols');
    side = $('stu-side');
    work = $('stu-work-panel');
    reference = $('stu-reference-panel');
    columnHandle = $('stu-cols-divider');
    rowHandle = $('stu-side-divider');
    toggle = $('stu-reference-toggle');
    minus = $('stu-font-minus');
    plus = $('stu-font-plus');
    toggle.addEventListener('click', function () { setCollapsed(!collapsed); });
    minus.addEventListener('click', function () { setFont(fontSize - 2); });
    plus.addEventListener('click', function () { setFont(fontSize + 2); });
    makeDrag(columnHandle, 'x', work, setColumn, columnSpace);
    makeDrag(rowHandle, 'y', reference, setRow, rowSpace);
    window.addEventListener('resize', refresh);
    setFont(fontSize);
  }

  ui.studentLayout = { init: init, refresh: refresh };
})();
