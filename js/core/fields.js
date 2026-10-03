/* разбор {{ }} и проверка значений. Ядро: без DOM, только namespace MKB. */
window.MKB = window.MKB || {};

(function () {
  var FIELD_RE = /\{\{(.*?)\}\}/g;

  // Обход строки по кускам: единственное место, где разбирается разметка полей.
  //   onText(chunk, at) — кусок текста и его начало в text (нужно для спанов
  //                       различий: они считаны по text целиком)
  //   onField(i, inner) — i: номер поля внутри строки, inner: «White|Red|Blue»
  function eachPart(text, onText, onField) {
    var last = 0, i = 0, m;
    FIELD_RE.lastIndex = 0;
    while ((m = FIELD_RE.exec(text))) {
      onText(text.slice(last, m.index), last);
      onField(i++, m[1]);
      last = m.index + m[0].length;
    }
    onText(text.slice(last), last);
  }

  var NUM = '-?\\d+(?:\\.\\d+)?';
  var RANGE_RE = new RegExp('^\\s*(' + NUM + ')\\s*-\\s*(' + NUM + ')\\s*$');

  // Диапазон чисел: «0-255», «-10-10», «0.1-1.5» → { min, max, int }.
  // int — обе границы целые: тогда и от ученика ждём целое.
  // Не два числа или левое больше правого — не диапазон, обычный свободный ввод.
  function parseRange(inner) {
    var m = RANGE_RE.exec(inner);
    if (!m || Number(m[1]) > Number(m[2])) return null;
    return { min: Number(m[1]), max: Number(m[2]), int: (m[1] + m[2]).indexOf('.') < 0 };
  }

  // Поля в строке: {{White}} — свободный ввод, {{White|Red|Blue}} — список,
  // {{0-255}} — число из диапазона (range, границы включены).
  // У свободного ввода answer — эталон, options пусты. У списка верен любой
  // вариант; answer — первый, по нему только считается ширина.
  function parseFields(text) {
    var fields = [], norm = '';
    eachPart(text, function (chunk) { norm += chunk; }, function (i, inner) {
      var values = inner.split('|');
      fields.push({
        answer: values[0],
        options: values.length > 1 ? values : [],
        range: values.length > 1 ? null : parseRange(inner)
      });
      // маркер — номер поля внутри строки: шаблон не зависит от места строки в этапе
      norm += '<F' + i + '>';
    });
    return { norm: norm, fields: fields };
  }

  // Заполняет norm и fields у блоков этапа. id полей сквозные: F0, F1, … —
  // по ним хранятся введённые значения.
  function applyFields(blocks) {
    var n = 0;
    blocks.forEach(function (b) {
      var p = parseFields(b.text);
      b.norm = p.norm;
      b.fields = p.fields.map(function (f) {
        return { id: 'F' + n++, blockId: b.id, answer: f.answer, options: f.options, range: f.range };
      });
    });
    return blocks;
  }

  // Пробелы по краям обрезаются, внутри схлопываются; у знаков препинания и
  // операторов пробелы не значимы: `(leds,NUM_LEDS)` = `(leds, NUM_LEDS)`.
  // Пробел между двумя словами значим: `int x` ≠ `intx`.
  // Буква — буква любого письма (\p{L}), не только латиница: с /\w/
  // `Привет мир` схлопывалось в `Приветмир`, и неверный ответ засчитывался.
  function normalizeValue(s) {
    return String(s == null ? '' : s).trim()
      .replace(/\s+/g, ' ')
      .replace(/ ?([^\p{L}\p{N}_ ]) ?/gu, '$1');
  }

  // Число в привычной записи, без ведущих нулей: `08` не скомпилируется ни в
  // Arduino, ни в Python, а `010` в Arduino — восьмеричное 8.
  var INT_RE = /^-?(0|[1-9]\d*)$/, DEC_RE = /^-?(0|[1-9]\d*)(\.\d+)?$/;

  // → "ok" | "wrong" | "case" | "empty". Регистр учитывается.
  // options — варианты списка: верен любой из них. Пусты — сравнение с answer.
  // range — диапазон: верно любое число от min до max включительно.
  function checkValue(value, answer, options, range) {
    var v = normalizeValue(value);
    if (!v) return 'empty';
    if (range) {
      if (!(range.int ? INT_RE : DEC_RE).test(v)) return 'wrong';
      return Number(v) >= range.min && Number(v) <= range.max ? 'ok' : 'wrong';
    }
    var ok = (options && options.length ? options : [answer]).map(normalizeValue);
    if (ok.indexOf(v) >= 0) return 'ok';
    var low = v.toLowerCase();
    if (ok.some(function (a) { return a.toLowerCase() === low; })) return 'case';
    return 'wrong';
  }

  // Ширина поля в символах: длина самого длинного значения + 2. У свободного
  // ввода это эталон — шире нельзя, поле выдало бы длину ответа. У списка все
  // варианты и так видны, поэтому ширина по самому длинному: иначе обрежется.
  // У диапазона — по самой длинной границе.
  function fieldWidth(field) {
    if (field.range) return Math.max(String(field.range.min).length, String(field.range.max).length) + 2;
    var n = String(field.answer == null ? '' : field.answer).length;
    (field.options || []).forEach(function (o) { n = Math.max(n, String(o).length); });
    return n + 2;
  }

  // Текст строки с подставленными значениями полей (введёнными, не эталонными)
  function fillFields(block, values) {
    var out = '';
    eachPart(block.text, function (chunk) { out += chunk; }, function (i) {
      var f = block.fields[i];
      var v = f && values ? values[f.id] : '';
      out += v == null ? '' : String(v).trim();
    });
    return out;
  }

  MKB.eachPart = eachPart;
  MKB.parseRange = parseRange;
  MKB.parseFields = parseFields;
  MKB.applyFields = applyFields;
  MKB.normalizeValue = normalizeValue;
  MKB.checkValue = checkValue;
  MKB.fieldWidth = fieldWidth;
  MKB.fillFields = fillFields;
})();
