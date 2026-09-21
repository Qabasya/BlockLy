/* разбор {{ }} и проверка значений. Ядро: без DOM, только namespace MKB. */
window.MKB = window.MKB || {};

(function () {
  var FIELD_RE = /\{\{(.*?)\}\}/g;

  // Поля в строке: {{White}} — свободный ввод, {{White|Red|Blue}} — список.
  // Первое значение — правильное. options пусты у свободного ввода.
  function parseFields(text) {
    var fields = [];
    var norm = text.replace(FIELD_RE, function (m, inner) {
      var values = inner.split('|');
      fields.push({ answer: values[0], options: values.length > 1 ? values : [] });
      // маркер — номер поля внутри строки: шаблон не зависит от места строки в этапе
      return '<F' + (fields.length - 1) + '>';
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
  function normalizeValue(s) {
    return String(s == null ? '' : s).trim()
      .replace(/\s+/g, ' ')
      .replace(/ ?([^\w ]) ?/g, '$1');
  }

  // → "ok" | "wrong" | "case" | "empty". Регистр учитывается.
  function checkValue(value, answer) {
    var v = normalizeValue(value), a = normalizeValue(answer);
    if (!v) return 'empty';
    if (v === a) return 'ok';
    if (v.toLowerCase() === a.toLowerCase()) return 'case';
    return 'wrong';
  }

  // Ширина поля в символах: длина эталона + 2, не больше — иначе поле выдаёт ответ
  function fieldWidth(field) { return field.answer.length + 2; }

  // Текст строки с подставленными значениями полей (введёнными, не эталонными)
  function fillFields(block, values) {
    var i = 0;
    return block.text.replace(FIELD_RE, function () {
      var f = block.fields[i++];
      var v = f && values ? values[f.id] : '';
      return v == null ? '' : String(v).trim();
    });
  }

  MKB.parseFields = parseFields;
  MKB.applyFields = applyFields;
  MKB.normalizeValue = normalizeValue;
  MKB.checkValue = checkValue;
  MKB.fieldWidth = fieldWidth;
  MKB.fillFields = fillFields;
})();
