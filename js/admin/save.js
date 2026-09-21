/* запись файлов: папка проекта через File System Access API (Chrome/Edge, по file://).
   Выбранная папка запоминается в IndexedDB — это настройка админки, не данные ученика.
   Любое обращение к хранилищам — в try/catch. */
window.MKB = window.MKB || {};
MKB.save = MKB.save || {};

(function () {
  var DB = 'mkb-admin', STORE = 'kv', KEY = 'projectDir';
  var IDB_WAIT = 1500;      // мс: хранилище не ответило — живём без него
  var dir = null;           // FileSystemDirectoryHandle папки проекта
  var granted = false;

  // ─── IndexedDB: одна запись — хэндл папки ───
  // Хранилище может не ответить вовсе (так бывает, например, в headless-Chrome
  // по file://) — тогда через IDB_WAIT считаем, что записи нет.
  function idb(mode, fn) {
    return new Promise(function (done) {
      var settled = false;
      function resolve(v) { if (!settled) { settled = true; done(v); } }
      setTimeout(function () { resolve(null); }, IDB_WAIT);
      try {
        var req = indexedDB.open(DB, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
        req.onerror = function () { resolve(null); };
        req.onsuccess = function () {
          try {
            var tx = req.result.transaction(STORE, mode);
            var r = fn(tx.objectStore(STORE));
            tx.oncomplete = function () { resolve(r && 'result' in r ? r.result : null); req.result.close(); };
            tx.onerror = tx.onabort = function () { resolve(null); req.result.close(); };
          } catch (e) { resolve(null); }
        };
      } catch (e) { resolve(null); }
    });
  }
  function loadHandle() { return idb('readonly', function (s) { return s.get(KEY); }); }
  function storeHandle(h) { return idb('readwrite', function (s) { return s.put(h, KEY); }); }

  function supported() { return typeof window.showDirectoryPicker === 'function'; }

  // При входе в админку: папка уже выбрана и разрешение есть — подключиться молча.
  // → 'granted' | 'prompt' (нужен один клик) | 'none' (папку надо выбрать)
  function restore() {
    if (!supported()) return Promise.resolve('none');
    if (dir && granted) return Promise.resolve('granted');   // уже подключена в этой вкладке
    return loadHandle().then(function (h) {
      if (!h) return 'none';
      dir = h;
      return h.queryPermission({ mode: 'readwrite' }).then(function (p) {
        granted = p === 'granted';
        return granted ? 'granted' : 'prompt';
      }, function () { return 'none'; });
    }, function () { return 'none'; });
  }

  // Это папка проекта? В ней должны быть index.html и workshops/
  function checkProject(h) {
    return h.getFileHandle('index.html').then(function () {
      return h.getDirectoryHandle('workshops');
    }).then(function () { return true; }, function () { return false; });
  }

  // «Подключить папку» (по клику): дать разрешение запомненной папке или выбрать новую.
  // → Promise<{ ok, error }>
  function connect() {
    if (!supported()) return Promise.resolve({ ok: false, error: 'Браузер не умеет записывать файлы. Нужен Chrome или Edge.' });
    var ask = dir && !granted
      ? dir.requestPermission({ mode: 'readwrite' }).then(function (p) { return p === 'granted' ? dir : pick(); }, pick)
      : pick();
    return ask.then(function (h) {
      return checkProject(h).then(function (isProject) {
        if (!isProject) {
          return { ok: false, error: 'В этой папке нет index.html и папки workshops. Выберите саму папку проекта.' };
        }
        dir = h;
        granted = true;
        return storeHandle(h).then(function () { return { ok: true }; });
      });
    }, function (e) {
      // закрыли диалог выбора — это не ошибка
      return { ok: false, error: e && e.name === 'AbortError' ? null : 'Не удалось открыть папку.' };
    });
  }
  function pick() { return window.showDirectoryPicker({ id: 'mkb-project', mode: 'readwrite' }); }

  function isConnected() { return !!dir && granted; }

  function readText(fileHandle) {
    return fileHandle.getFile().then(function (f) { return f.text(); });
  }
  function writeText(fileHandle, text) {
    return fileHandle.createWritable().then(function (w) {
      return w.write(text).then(function () { return w.close(); });
    });
  }
  function updateIndex(fn) {
    return dir.getFileHandle('index.html').then(function (fh) {
      return readText(fh).then(function (html) {
        var next = fn(html);
        return next === html ? null : writeText(fh, next);
      });
    });
  }

  // «Сохранить»: переписать workshops/<id>.js; новый мастер-класс — ещё и
  // дописать <script src> в index.html той же записью
  function writeWorkshop(w, isNew) {
    return dir.getDirectoryHandle('workshops').then(function (wd) {
      return wd.getFileHandle(w.id + '.js', { create: true });
    }).then(function (fh) {
      return writeText(fh, MKB.workshopToJs(w));
    }).then(function () {
      if (isNew) return updateIndex(function (html) { return MKB.addScriptTag(html, w.id); });
    });
  }

  // Удалить файл мастер-класса и строку подключения
  function deleteWorkshop(id) {
    return dir.getDirectoryHandle('workshops').then(function (wd) {
      return wd.removeEntry(id + '.js').catch(function () { /* файла уже нет */ });
    }).then(function () {
      return updateIndex(function (html) { return MKB.removeScriptTag(html, id); });
    });
  }

  // Запасной путь без File System Access API: скачать файл мастер-класса
  function download(w) {
    var blob = new Blob([MKB.workshopToJs(w)], { type: 'text/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = w.id + '.js';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  MKB.save.supported = supported;
  MKB.save.restore = restore;
  MKB.save.connect = connect;
  MKB.save.isConnected = isConnected;
  MKB.save.writeWorkshop = writeWorkshop;
  MKB.save.deleteWorkshop = deleteWorkshop;
  MKB.save.download = download;
})();
