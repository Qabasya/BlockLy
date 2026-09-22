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

  // Поля в строке: {{White}} — свободный ввод, {{White|Red|Blue}} — список.
  // Первое значение — правильное. options пусты у свободного ввода.
  function parseFields(text) {
    var fields = [], norm = '';
    eachPart(text, function (chunk) { norm += chunk; }, function (i, inner) {
      var values = inner.split('|');
      fields.push({ answer: values[0], options: values.length > 1 ? values : [] });
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
        return { id: 'F' + n++, blockId: b.id, answer: f.answer, options: f.options };
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

  // → "ok" | "wrong" | "case" | "empty". Регистр учитывается.
  function checkValue(value, answer) {
    var v = normalizeValue(value), a = normalizeValue(answer);
    if (!v) return 'empty';
    if (v === a) return 'ok';
    if (v.toLowerCase() === a.toLowerCase()) return 'case';
    return 'wrong';
  }

  // Ширина поля в символах: длина самого длинного значения + 2. У свободного
  // ввода это эталон — шире нельзя, поле выдало бы длину ответа. У списка все
  // варианты и так видны, поэтому ширина по самому длинному: иначе обрежется.
  function fieldWidth(field) {
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
  MKB.parseFields = parseFields;
  MKB.applyFields = applyFields;
  MKB.normalizeValue = normalizeValue;
  MKB.checkValue = checkValue;
  MKB.fieldWidth = fieldWidth;
  MKB.fillFields = fillFields;
})();
