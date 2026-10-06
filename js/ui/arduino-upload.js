/* Arduino Nano ATmega328P (Old Bootloader): Intel HEX and STK500v1 over Web Serial.
   Protocol: https://github.com/avrdudes/avrdude/blob/main/src/stk500.c
   Arduino reset: https://github.com/avrdudes/avrdude/blob/main/src/arduino.c */
window.MKB = window.MKB || {};

(function () {
  var MAX_BYTES = 30720, PAGE_BYTES = 128, BAUD = 57600;
  var INSYNC = 0x14, OK = 0x10, EOP = 0x20;
  var BOARD = 'arduino:avr:nano:cpu=atmega328old';

  function fail(message) { throw new Error(message); }
  function pause(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function cancelled(signal) { if (signal && signal.aborted) fail('Загрузка отменена.'); }

  function parseHex(hex) {
    if (typeof hex !== 'string') fail('Компилятор не вернул HEX прошивки.');
    var lines = hex.trim().split(/\r?\n/), flash = new Uint8Array(MAX_BYTES);
    flash.fill(0xff);
    var seen = new Uint8Array(MAX_BYTES), base = 0, eof = false, highest = 0, used = 0;
    lines.forEach(function (line, row) {
      line = line.trim();
      if (!line) return;
      if (eof) fail('HEX: данные после конца файла, строка ' + (row + 1) + '.');
      if (!/^:[0-9A-Fa-f]+$/.test(line) || line.length < 11 || line.length % 2 !== 1)
        fail('HEX: неверная строка ' + (row + 1) + '.');
      var raw = new Uint8Array((line.length - 1) / 2);
      for (var i = 0; i < raw.length; i++) raw[i] = parseInt(line.slice(1 + i * 2, 3 + i * 2), 16);
      var count = raw[0], addr = (raw[1] << 8) | raw[2], type = raw[3], sum = 0;
      if (raw.length !== count + 5) fail('HEX: неверная длина строки ' + (row + 1) + '.');
      for (i = 0; i < raw.length; i++) sum = (sum + raw[i]) & 255;
      if (sum !== 0) fail('HEX: ошибка контрольной суммы в строке ' + (row + 1) + '.');
      if (type === 0) {
        var start = base + addr;
        if (start + count > MAX_BYTES) fail('Прошивка превышает предел Nano: 30 720 байт.');
        for (i = 0; i < count; i++) {
          var at = start + i, value = raw[4 + i];
          if (seen[at] && flash[at] !== value) fail('HEX: конфликт данных по адресу ' + at + '.');
          if (!seen[at]) { seen[at] = 1; used++; }
          flash[at] = value;
        }
        highest = Math.max(highest, start + count);
      } else if (type === 1) {
        if (count !== 0 || addr !== 0) fail('HEX: неверная запись конца файла.');
        eof = true;
      } else if (type === 2 || type === 4) {
        if (count !== 2 || addr !== 0) fail('HEX: неверная запись адреса.');
        base = type === 2 ? (((raw[4] << 8) | raw[5]) << 4) : (((raw[4] << 8) | raw[5]) * 65536);
      } else if (type === 3 || type === 5) {
        if (count !== 4) fail('HEX: неверная запись стартового адреса.');
      } else fail('HEX: неподдерживаемый тип записи ' + type + '.');
    });
    if (!eof || !used) fail('HEX прошивки пустой или не завершён.');
    return { flash: flash, highest: highest, used: used, pages: Math.ceil(highest / PAGE_BYTES) };
  }

  // Единственный reader.read() живёт в насосе. Ожидание ответа не запускает
  // конкурирующее чтение; таймаут отбрасывает операцию, а finally отменяет насос.
  function Bytes(reader) {
    this.reader = reader;
    this.queue = [];
    this.waiter = null;
    this.error = null;
    var self = this;
    this.pump = (async function () {
      try {
        while (true) {
          var result = await reader.read();
          if (result.done) throw new Error('Соединение с платой прервано.');
          for (var i = 0; i < result.value.length; i++) self.queue.push(result.value[i]);
          if (self.waiter) { self.waiter(); self.waiter = null; }
        }
      } catch (e) {
        self.error = e;
        if (self.waiter) { self.waiter(); self.waiter = null; }
      }
    })();
  }
  Bytes.prototype.take = async function (count, timeout, signal) {
    var self = this, deadline = Date.now() + timeout, out = [];
    while (out.length < count) {
      cancelled(signal);
      if (self.queue.length) { out.push(self.queue.shift()); continue; }
      if (self.error) throw self.error;
      var left = deadline - Date.now();
      if (left <= 0) fail('Плата не ответила вовремя. Проверьте порт и режим Old Bootloader.');
      await new Promise(function (resolve) {
        var timer = setTimeout(function () { if (self.waiter === wake) self.waiter = null; resolve(); }, Math.min(left, 250));
        function wake() { clearTimeout(timer); resolve(); }
        self.waiter = wake;
      });
    }
    return out;
  };

  async function command(writer, bytes, cmd, payloadCount, timeout, signal) {
    cancelled(signal);
    await writer.write(new Uint8Array(cmd.concat(EOP)));
    var response = await bytes.take(payloadCount + 2, timeout || 1500, signal);
    if (response[0] !== INSYNC || response[response.length - 1] !== OK)
      fail('Плата вернула неверный ответ загрузчика. Проверьте выбор Arduino Nano Old Bootloader.');
    return response.slice(1, -1);
  }
  function loadAddress(writer, bytes, byteAddress, signal) {
    var word = byteAddress / 2;
    return command(writer, bytes, [0x55, word & 255, word >> 8], 0, 1200, signal);
  }

  async function flash(port, image, progress, signal) {
    var reader, writer, input;
    try {
      progress('Подключение к Arduino…');
      await port.open({ baudRate: BAUD, bufferSize: 256 });
      reader = port.readable.getReader();
      writer = port.writable.getWriter();
      input = new Bytes(reader);
      // AVRDUDE arduino_open(): deassert DTR/RTS to discharge the Nano's reset
      // capacitor, assert briefly, then deassert before talking to bootloader.
      // Web Serial's true/false mean OS assert/deassert of these same signals.
      // The two awaited calls make the pulse as short as Web Serial permits.
      // https://github.com/avrdudes/avrdude/blob/main/src/arduino.c
      // https://developer.mozilla.org/en-US/docs/Web/API/SerialPort/setSignals
      await port.setSignals({ dataTerminalReady: false, requestToSend: false });
      await pause(250);
      await port.setSignals({ dataTerminalReady: true, requestToSend: true });
      await port.setSignals({ dataTerminalReady: false, requestToSend: false });
      await pause(100);
      var synced = false;
      for (var attempt = 0; attempt < 8; attempt++) {
        cancelled(signal);
        input.queue.length = 0;
        try { await command(writer, input, [0x30], 0, 400, signal); synced = true; break; }
        catch (e) { if (attempt === 7) throw e; await pause(180); }
      }
      if (!synced) fail('Не удалось связаться с загрузчиком Nano.');
      await command(writer, input, [0x50], 0, 1200, signal);
      var signature = await command(writer, input, [0x75], 3, 1200, signal);
      if (signature.join(',') !== '30,149,15')
        fail('Подключена другая плата: ожидалась Arduino Nano ATmega328P (сигнатура 1E950F).');
      var page, address, len;
      for (page = 0; page < image.pages; page++) {
        cancelled(signal);
        address = page * PAGE_BYTES;
        await loadAddress(writer, input, address, signal);
        var data = Array.from(image.flash.subarray(address, address + PAGE_BYTES));
        await command(writer, input, [0x64, 0, PAGE_BYTES, 0x46].concat(data), 0, 2500, signal);
        progress('Загрузка: ' + Math.round((page + 1) / image.pages * 100) + '%');
      }
      for (page = 0; page < image.pages; page++) {
        cancelled(signal);
        address = page * PAGE_BYTES;
        await loadAddress(writer, input, address, signal);
        var actual = await command(writer, input, [0x74, 0, PAGE_BYTES, 0x46], PAGE_BYTES, 2500, signal);
        for (len = 0; len < PAGE_BYTES; len++) {
          if (actual[len] !== image.flash[address + len])
            fail('Проверка прошивки не прошла по адресу 0x' + (address + len).toString(16).toUpperCase() + '.');
        }
        progress('Проверка: ' + Math.round((page + 1) / image.pages * 100) + '%');
      }
      await command(writer, input, [0x51], 0, 1200, signal);
      progress('Готово: программа записана и проверена.');
    } finally {
      if (input && reader) { try { await reader.cancel(); } catch (e) {} try { await input.pump; } catch (e) {} }
      if (reader) { try { reader.releaseLock(); } catch (e) {} }
      if (writer) { try { writer.releaseLock(); } catch (e) {} }
      if (port) { try { await port.close(); } catch (e) {} }
    }
  }

  function availability() {
    if (location.protocol === 'file:') return 'Для загрузки на плату откройте приложение через локальный сервер (localhost).';
    if (!window.isSecureContext || !navigator.serial) return 'Для загрузки нужен Chrome или Edge с Web Serial на localhost.';
    return '';
  }

  function upload(code, progress, signal) {
    var unavailable = availability();
    if (unavailable) return Promise.reject(new Error(unavailable));
    // Вызов requestPort обязан произойти прямо в обработчике нажатия, до fetch
    // или первого await: иначе браузер потеряет пользовательскую активацию.
    var portPromise;
    try { portPromise = navigator.serial.requestPort(); }
    catch (e) { return Promise.reject(e); }
    return portPromise.then(async function (port) {
      try {
        cancelled(signal);
        progress('Компиляция программы…');
        var response = await fetch('/api/compile', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code }), signal: signal
        });
        var result;
        try { result = await response.json(); } catch (e) { fail('Локальный компилятор вернул неверный ответ.'); }
        if (!response.ok) fail(result.error || 'Компиляция не удалась.');
        if (result.board !== BOARD) fail('Компилятор вернул прошивку для другой платы.');
        var image = parseHex(result.hex);
        if (result.bytes != null && result.bytes !== image.used)
          fail('Размер прошивки не совпадает с ответом компилятора.');
        if (result.maxBytes != null && result.maxBytes !== MAX_BYTES)
          fail('Компилятор настроен на другой предел памяти платы.');
        cancelled(signal);
        await flash(port, image, progress, signal);
      } catch (e) {
        // Порт выбран, но не открыт: flash не смог бы закрыть его.
        try { if (port.readable || port.writable) await port.close(); } catch (_) {}
        throw e;
      }
    });
  }

  MKB.arduinoUpload = { parseHex: parseHex, flash: flash, upload: upload, availability: availability };
})();
