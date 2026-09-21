/* Минимальный прогон тестов: регистрация, сравнение, вывод в страницу. Только для tests.html. */
window.MKB = window.MKB || {};

(function () {
  var list = [];

  // регистрация теста; выполняется потом, в MKB.runTests
  MKB.test = function (name, fn) { list.push({ name: name, fn: fn }); };

  // глубокое сравнение через JSON: ядро работает с простыми объектами
  MKB.eq = function (actual, expected, what) {
    var a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a !== e) throw new Error((what ? what + ': ' : '') + 'получено ' + a + ', ожидалось ' + e);
  };

  MKB.ok = function (cond, what) {
    if (!cond) throw new Error(what || 'условие не выполнено');
  };

  function line(parent, cls, text) {
    var el = document.createElement('div');
    el.className = cls;
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  MKB.runTests = function (root) {
    var failed = 0;
    var box = document.createElement('div');
    list.forEach(function (t) {
      try {
        t.fn();
        line(box, 't t-ok', '✓ ' + t.name);
      } catch (err) {
        failed++;
        line(box, 't t-bad', '✕ ' + t.name + ' — ' + err.message);
      }
    });
    var sum = line(root, 'sum ' + (failed ? 't-bad' : 't-ok'),
      'Тестов: ' + list.length + ', ошибок: ' + failed);
    sum.id = 'summary';
    root.appendChild(box);
  };
})();
