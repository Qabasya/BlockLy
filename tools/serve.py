#!/usr/bin/env python3
"""Serve BlockLy locally and compile Arduino Nano sketches for Web Serial.

Start with: python3 tools/serve.py
The server uses the Arduino CLI, AVR core and FastLED installed on this computer.
It listens only on 127.0.0.1 and never uploads to a board itself.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
from pathlib import Path
import signal
import shutil
import subprocess
import tempfile
import threading
from typing import Optional
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent.parent
BOARD = "arduino:avr:nano:cpu=atmega328old"
MAX_FLASH_BYTES = 30_720
MAX_CODE_BYTES = 128 * 1024
COMPILE_TIMEOUT_SECONDS = 120
COMPILE_LOCK = threading.Lock()


def find_cli() -> Optional[Path]:
    override = os.environ.get("BLOCKLY_ARDUINO_CLI")
    candidates = [
        override,
        shutil.which("arduino-cli"),
        "/Applications/Arduino IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli",
    ]
    for env_name in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"):
        base = os.environ.get(env_name)
        if base:
            for folder in ("Arduino IDE", "arduino-ide"):
                root = Path(base) / ("Programs" if env_name == "LOCALAPPDATA" else "")
                candidates.append(root / folder / "resources/app/lib/backend/resources/arduino-cli.exe")
    for candidate in candidates:
        if candidate and Path(candidate).is_file() and os.access(candidate, os.X_OK):
            return Path(candidate)
    return None


def find_ide1() -> Optional[Path]:
    candidates = [os.environ.get("BLOCKLY_ARDUINO_IDE1")]
    for env_name in ("PROGRAMFILES(X86)", "PROGRAMFILES", "LOCALAPPDATA"):
        base = os.environ.get(env_name)
        if base:
            candidates.extend((Path(base) / "Arduino/arduino_debug.exe",
                               Path(base) / "Programs/Arduino/arduino_debug.exe"))
    for candidate in candidates:
        if candidate and Path(candidate).is_file() and os.access(candidate, os.X_OK):
            return Path(candidate)
    return None


def find_fastled() -> Path:
    override = os.environ.get("BLOCKLY_FASTLED")
    onedrive = os.environ.get("OneDrive") or os.environ.get("OneDriveConsumer")
    candidates = [
        override,
        str(Path.home() / "Documents/Arduino/libraries/FastLED"),
        str(Path.home() / "Arduino/libraries/FastLED"),
    ]
    if onedrive:
        candidates.append(str(Path(onedrive) / "Documents/Arduino/libraries/FastLED"))
    for candidate in candidates:
        if candidate and (Path(candidate) / "src/FastLED.h").is_file():
            return Path(candidate)
    raise RuntimeError("Библиотека FastLED не найдена. Установите её через Arduino IDE или задайте BLOCKLY_FASTLED.")


def clean_compiler_error(output: str, sketch_dir: Path) -> str:
    """Keep useful compiler diagnostics, omitting optional discovery downloads."""
    # macOS may report the same temp path as /var/... or /private/var/....
    # Replace the longer alias first so no "/privateBlockLy" prefix remains.
    for path in sorted({str(sketch_dir), str(sketch_dir.resolve())}, key=len, reverse=True):
        output = output.replace(path, "BlockLy")
    lines = output.splitlines()
    lines = [line for line in lines if not (
        "Downloading missing tool builtin:" in line
        or "Error initializing instance: downloading builtin:" in line
    )]
    error = "\n".join(lines).strip()
    return error[-12_000:] if error else "Arduino CLI не смог собрать программу. Проверьте код и библиотеку FastLED."


def flash_bytes_in_hex(hex_text: str) -> int:
    """Count distinct flash addresses in the generated Intel HEX, excluding EEPROM."""
    addresses = set()
    upper = 0
    for line in hex_text.splitlines():
        if not line.startswith(":"):
            raise ValueError("Неверный формат HEX, созданного Arduino CLI.")
        raw = bytes.fromhex(line[1:])
        if len(raw) < 5:
            raise ValueError("Неполная запись HEX, созданная Arduino CLI.")
        length = raw[0]
        if len(raw) != length + 5 or sum(raw) & 0xFF:
            raise ValueError("Контрольная сумма HEX неверна.")
        address = (raw[1] << 8) | raw[2]
        record_type = raw[3]
        payload = raw[4:-1]
        if record_type == 0:
            addresses.update(range(upper + address, upper + address + length))
        elif record_type == 2:
            if len(payload) != 2:
                raise ValueError("Неверный адрес в HEX, созданном Arduino CLI.")
            upper = int.from_bytes(payload, "big") << 4
        elif record_type == 4:
            if len(payload) != 2:
                raise ValueError("Неверный адрес в HEX, созданном Arduino CLI.")
            upper = int.from_bytes(payload, "big") << 16
        elif record_type == 1:
            break
    if not addresses:
        raise ValueError("Arduino CLI создал пустую прошивку.")
    if max(addresses) >= MAX_FLASH_BYTES:
        raise ValueError("Программа выходит за пределы памяти Arduino Nano (30 720 байт).")
    return len(addresses)


def compile_code(code: str, compiler: Path, fastled: Path, mode: str = "cli") -> dict:
    if not isinstance(code, str) or not code.strip():
        raise ValueError("Код программы пуст.")
    if len(code.encode("utf-8")) > MAX_CODE_BYTES:
        raise ValueError("Код программы слишком большой для отправки.")
    with tempfile.TemporaryDirectory(prefix="blockly-nano-") as temp_name:
        temp = Path(temp_name)
        sketch_dir = temp / "BlockLy"
        sketch_dir.mkdir()
        (sketch_dir / "BlockLy.ino").write_text(code + "\n", encoding="utf-8")
        build_dir = temp / "build"
        build_dir.mkdir()
        if mode == "ide1":
            cmd = [str(compiler), "--verify", "--board", BOARD,
                   "--pref", f"build.path={build_dir}",
                   "--pref", f"sketchbook.path={fastled.parent.parent}",
                   str(sketch_dir / "BlockLy.ino")]
            hex_file = build_dir / "BlockLy.ino.hex"
        else:
            output_dir = temp / "output"
            cmd = [str(compiler), "compile", "--fqbn", BOARD,
                   "--jobs", "2",
                   "--build-path", str(build_dir),
                   "--output-dir", str(output_dir),
                   "--library", str(fastled),
                   str(sketch_dir)]
            hex_file = output_dir / "BlockLy.ino.hex"
        try:
            process = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True, errors="replace", start_new_session=os.name != "nt",
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
            )
        except OSError as exc:
            raise ValueError("Не удалось запустить компилятор Arduino. Проверьте установку Arduino IDE.") from exc
        try:
            stdout, stderr = process.communicate(timeout=COMPILE_TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired as exc:
            # The CLI launches avr-gcc subprocesses. Stop the whole build before
            # TemporaryDirectory removes its source and output files.
            if os.name == "nt":
                try:
                    subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                                   capture_output=True, check=False, timeout=5)
                except (OSError, subprocess.TimeoutExpired):
                    pass
                if process.poll() is None:
                    process.kill()
            else:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            process.communicate()
            raise ValueError("Компиляция заняла больше двух минут. Повторите попытку.") from exc
        if process.returncode:
            raise ValueError(clean_compiler_error(stdout + "\n" + stderr, sketch_dir))
        if not hex_file.is_file():
            raise ValueError("Компилятор Arduino завершил работу без HEX-файла.")
        hex_text = hex_file.read_text(encoding="ascii")
        used = flash_bytes_in_hex(hex_text)
        return {"hex": hex_text, "bytes": used, "maxBytes": MAX_FLASH_BYTES, "board": BOARD}


class Handler(BaseHTTPRequestHandler):
    compiler: Path
    compiler_mode: str
    fastled: Path

    def _host_allowed(self) -> bool:
        host = self.headers.get("Host", "")
        return host in (f"127.0.0.1:{self.server.server_port}",
                        f"localhost:{self.server.server_port}")

    def _send(self, status: int, data: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def _json(self, status: int, body: dict) -> None:
        self._send(status, json.dumps(body, ensure_ascii=False).encode("utf-8"),
                   "application/json; charset=utf-8")

    def do_GET(self) -> None:
        if not self._host_allowed():
            self._json(403, {"error": "Недопустимый адрес запроса."})
            return
        path = unquote(urlsplit(self.path).path)
        if path == "/":
            path = "/index.html"
        parts = Path(path.lstrip("/")).parts
        if not parts or any(part in ("..", ".") or part.startswith(".") for part in parts):
            self._json(404, {"error": "Файл не найден."})
            return
        file = (ROOT / Path(*parts)).resolve()
        if not file.is_relative_to(ROOT) or not file.is_file() or file.suffix.lower() not in {
            ".html", ".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".ico", ".webp", ".woff", ".woff2"
        }:
            self._json(404, {"error": "Файл не найден."})
            return
        content_type = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
        if file.suffix in (".html", ".js", ".css"):
            content_type += "; charset=utf-8"
        self._send(200, file.read_bytes(), content_type)

    def do_POST(self) -> None:
        if not self._host_allowed() or self.path != "/api/compile":
            self._json(404, {"error": "Адрес не найден."})
            return
        origin = self.headers.get("Origin")
        if origin and origin not in (f"http://127.0.0.1:{self.server.server_port}",
                                     f"http://localhost:{self.server.server_port}"):
            self._json(403, {"error": "Компиляция доступна только из BlockLy на этом компьютере."})
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            self._json(415, {"error": "Ожидался код в формате JSON."})
            return
        try:
            size = int(self.headers.get("Content-Length", ""))
        except ValueError:
            self._json(411, {"error": "Не указан размер запроса."})
            return
        if size < 1 or size > MAX_CODE_BYTES + 1024:
            self._json(413, {"error": "Код программы слишком большой."})
            return
        try:
            body = json.loads(self.rfile.read(size))
            if not isinstance(body, dict):
                raise ValueError("Ожидался объект с полем code.")
        except (ValueError, UnicodeError) as exc:
            self._json(422, {"error": str(exc)})
            return
        if not COMPILE_LOCK.acquire(blocking=False):
            self._json(429, {"error": "Уже компилируется другая программа. Повторите попытку после её завершения."})
            return
        try:
            result = compile_code(body.get("code"), self.compiler, self.fastled,
                                  self.compiler_mode)
        except (ValueError, UnicodeError) as exc:
            self._json(422, {"error": str(exc)})
            return
        finally:
            COMPILE_LOCK.release()
        self._json(200, result)


def main() -> None:
    parser = argparse.ArgumentParser(description="BlockLy: локальная компиляция для Arduino Nano")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--open-browser", action="store_true",
                        help="открыть BlockLy в браузере после запуска сервера")
    args = parser.parse_args()
    try:
        Handler.compiler = find_cli()
        Handler.compiler_mode = "cli"
        if Handler.compiler is None:
            Handler.compiler = find_ide1()
            Handler.compiler_mode = "ide1"
        if Handler.compiler is None:
            raise RuntimeError("Компилятор Arduino не найден. Установите Arduino IDE 1.8.19, Arduino IDE 2 или Arduino CLI.")
        Handler.fastled = find_fastled()
    except RuntimeError as exc:
        parser.exit(1, str(exc) + "\n")
    with ThreadingHTTPServer(("127.0.0.1", args.port), Handler) as server:
        address = f"http://127.0.0.1:{server.server_port}/"
        print(f"BlockLy: {address}", flush=True)
        print(f"Плата: {BOARD}; компилятор: {Handler.compiler}; FastLED: {Handler.fastled}", flush=True)
        if args.open_browser:
            open_browser(address)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nСервер остановлен.")


def open_browser(address: str) -> None:
    """Prefer Edge/Chrome on Windows, where Web Serial is available."""
    if os.name == "nt":
        locations = (
            ("PROGRAMFILES(X86)", "Microsoft/Edge/Application/msedge.exe"),
            ("PROGRAMFILES", "Microsoft/Edge/Application/msedge.exe"),
            ("LOCALAPPDATA", "Microsoft/Edge/Application/msedge.exe"),
            ("PROGRAMFILES", "Google/Chrome/Application/chrome.exe"),
            ("PROGRAMFILES(X86)", "Google/Chrome/Application/chrome.exe"),
            ("LOCALAPPDATA", "Google/Chrome/Application/chrome.exe"),
        )
        for env_name, relative in locations:
            base = os.environ.get(env_name)
            browser = Path(base) / relative if base else None
            if browser and browser.is_file():
                try:
                    subprocess.Popen([str(browser), address], stdout=subprocess.DEVNULL,
                                     stderr=subprocess.DEVNULL)
                    return
                except OSError:
                    pass
    if not webbrowser.open(address):
        print(f"Откройте адрес вручную в Chrome или Edge: {address}", flush=True)


if __name__ == "__main__":
    main()
