/* Standalone mock checks: node tests/arduino-upload.test.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = {
  window: { isSecureContext: true }, navigator: { serial: {} },
  location: { protocol: 'http:' }, Uint8Array, Array, Date, Error, Promise,
  setTimeout, clearTimeout, fetch: null
};
context.window.MKB = {};
context.MKB = context.window.MKB;
vm.runInNewContext(fs.readFileSync('js/ui/arduino-upload.js', 'utf8'), context);
const api = context.MKB.arduinoUpload;

function record(address, type, bytes) {
  const raw = [bytes.length, address >> 8, address & 255, type, ...bytes];
  const sum = (-raw.reduce((a, b) => a + b, 0)) & 255;
  return ':' + [...raw, sum].map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
}
function image(bytes) {
  return record(0, 0, bytes) + '\n' + record(0, 1, []);
}

const parsed = api.parseHex(image([0x12, 0x34, 0x56]));
assert.equal(parsed.used, 3);
assert.equal(parsed.pages, 1);
assert.equal(parsed.flash[3], 255);
assert.throws(() => api.parseHex(image([1]).replace('FE', 'FF')), /контрольной суммы/);
assert.throws(() => api.parseHex(record(30720, 0, [1]) + '\n' + record(0, 1, [])), /предел/);
assert.throws(() => api.parseHex(record(0, 0, [1])), /не заверш/);
assert.throws(() => api.parseHex(record(0, 0, [1]) + '\n' + record(0, 0, [2]) + '\n' + record(0, 1, [])), /конфликт/);

function mockPort(corruptRead = false) {
  const pending = [], memory = new Uint8Array(30720).fill(255);
  let waiting, closed = false, address = 0, opened = false;
  const signals = [];
  function push(bytes) {
    // One byte per read exercises fragmented Web Serial responses.
    for (const b of bytes) pending.push(Uint8Array.of(b));
    if (waiting) { const done = waiting; waiting = null; done(); }
  }
  const reader = {
    async read() {
      while (!pending.length && !closed) await new Promise(resolve => { waiting = resolve; });
      return closed ? { done: true } : { done: false, value: pending.shift() };
    },
    async cancel() { closed = true; if (waiting) { const done = waiting; waiting = null; done(); } },
    releaseLock() {}
  };
  const writer = {
    async write(data) {
      assert.equal(data.at(-1), 0x20);
      const cmd = data[0];
      if (cmd === 0x55) address = ((data[2] << 8) | data[1]) * 2;
      if (cmd === 0x64) memory.set(data.slice(4, -1), address);
      let body = [];
      if (cmd === 0x75) body = [0x1e, 0x95, 0x0f];
      if (cmd === 0x74) { body = [...memory.slice(address, address + 128)]; if (corruptRead) body[0] ^= 1; }
      push([0x14, ...body, 0x10]);
    },
    releaseLock() {}
  };
  return {
    readable: { getReader: () => reader }, writable: { getWriter: () => writer },
    async open(options) { assert.equal(options.baudRate, 57600); opened = true; },
    async setSignals(value) { signals.push([value.dataTerminalReady, value.requestToSend]); },
    async close() { closed = true; },
    get closed() { return closed; }, get opened() { return opened; }, memory, signals
  };
}

(async () => {
  const port = mockPort();
  const progress = [];
  await api.flash(port, parsed, m => progress.push(m));
  assert.equal(port.memory[0], 0x12);
  assert.equal(port.memory[2], 0x56);
  assert.equal(port.memory[3], 255);
  assert.equal(port.closed, true);
  assert.deepEqual(port.signals, [[false, false], [true, true], [false, false]]);
  assert.match(progress.at(-1), /Готово/);
  const corrupt = mockPort(true);
  await assert.rejects(api.flash(corrupt, parsed, () => {}), /Проверка прошивки/);
  assert.equal(corrupt.closed, true);
  console.log('Arduino HEX parser and STK500 mock: OK');
})().catch(e => { console.error(e); process.exitCode = 1; });
