#!/usr/bin/env python3
"""Measure how wide every image is displayed, per page, and write src/image-sizes.json (the `sizes`
attribute build.py adds). Re-run after layout changes, with the site served on localhost:8000:

    python3 build.py --serve &      # in another terminal
    python3 tools/measure_image_sizes.py

Uses headless Google Chrome (macOS path below). Widths: 375 / 768 / 1100 / 1440 px, written as
"(max-width: 560px) Avw, (max-width: 900px) Bvw, (max-width: 1280px) Cvw, Dpx" (largest use wins).
"""
import base64, json, os, socket, struct, subprocess, sys, time, urllib.request, urllib.parse, difflib

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PORT = 9333
OUT = '/tmp/measure-image-sizes'


def ensure_chrome():
    try:
        urllib.request.urlopen('http://127.0.0.1:%d/json/version' % PORT, timeout=1); return
    except Exception:
        pass
    subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
                      '--remote-debugging-port=%d' % PORT, '--remote-allow-origins=*',
                      '--user-data-dir=' + os.path.join(OUT, 'chrome-prof'), 'about:blank'],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            urllib.request.urlopen('http://127.0.0.1:%d/json/version' % PORT, timeout=1); return
        except Exception:
            time.sleep(.2)


class WS:
    def __init__(self, url):
        rest = url[len('ws://'):]; hostport, path = rest.split('/', 1); host, port = hostport.split(':')
        self.s = socket.create_connection((host, int(port)))
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall(('GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                        'Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n' % (path, hostport, key)).encode())
        buf = b''
        while b'\r\n\r\n' not in buf: buf += self.s.recv(4096)
        self.buf = buf.split(b'\r\n\r\n', 1)[1]; self.id = 0

    def _recv(self, n):
        while len(self.buf) < n:
            c = self.s.recv(1 << 20)
            if not c: raise EOFError
            self.buf += c
        d, self.buf = self.buf[:n], self.buf[n:]; return d

    def send(self, obj):
        data = json.dumps(obj).encode(); hdr = bytearray([0x81]); n = len(data)
        if n < 126: hdr.append(0x80 | n)
        elif n < 65536: hdr.append(0x80 | 126); hdr += struct.pack('>H', n)
        else: hdr.append(0x80 | 127); hdr += struct.pack('>Q', n)
        mask = os.urandom(4); hdr += mask
        self.s.sendall(bytes(hdr) + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def recv(self):
        msg = b''
        while True:
            b1, b2 = self._recv(2); n = b2 & 0x7f
            if n == 126: n = struct.unpack('>H', self._recv(2))[0]
            elif n == 127: n = struct.unpack('>Q', self._recv(8))[0]
            msg += self._recv(n)
            if b1 & 0x80: return json.loads(msg)

    def call(self, method, **params):
        self.id += 1; self.send({'id': self.id, 'method': method, 'params': params})
        while True:
            m = self.recv()
            if m.get('id') == self.id:
                if 'error' in m: raise RuntimeError(m['error'])
                return m.get('result', {})


def open_page(url, width, height=900, motion=False, mobile=None):
    ensure_chrome()
    req = urllib.request.Request('http://127.0.0.1:%d/json/new?about:blank' % PORT, method='PUT')
    tab = json.loads(urllib.request.urlopen(req).read())
    ws = WS(tab['webSocketDebuggerUrl']); ws.tab = tab['id']
    if mobile is None: mobile = width < 768
    ws.call('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=mobile)
    if mobile: ws.call('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=5)
    if not motion: ws.call('Emulation.setEmulatedMedia', features=[{'name': 'prefers-reduced-motion', 'value': 'reduce'}])
    ws.call('Network.enable'); ws.call('Network.setCacheDisabled', cacheDisabled=True)
    ws.call('Page.enable')
    ws.call('Page.addScriptToEvaluateOnNewDocument', source="window.__errs=[];addEventListener('error',e=>__errs.push(String(e.message)));")
    ws.call('Page.navigate', url=url)
    t0 = time.time()
    while time.time() - t0 < 20:
        r = ws.call('Runtime.evaluate', expression='document.readyState', returnByValue=True)
        if r['result'].get('value') == 'complete': break
        time.sleep(.2)
    ws.call('Runtime.evaluate', expression='document.fonts.ready.then(()=>1)', awaitPromise=True, returnByValue=True)
    time.sleep(float(os.environ.get('WAIT', 1.2 if motion else .6)))
    return ws


def close(ws):
    try: urllib.request.urlopen('http://127.0.0.1:%d/json/close/%s' % (PORT, ws.tab))
    except Exception: pass


def ev(ws, js):
    r = ws.call('Runtime.evaluate', expression=js, returnByValue=True, awaitPromise=True)
    if 'exceptionDetails' in r: return 'EXC: ' + json.dumps(r['exceptionDetails'])[:800]
    return r['result'].get('value')




ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = r"""(() => { const o = {};
  for (const i of document.images) { const s = i.getAttribute('src'); if (!s || !s.startsWith('/assets/img/')) continue;
    const w = i.getBoundingClientRect().width; if (w > o[s] || o[s] === undefined) o[s] = w; }
  return o; })()"""


def routes():
    out = []
    for d, _, files in os.walk(os.path.join(ROOT, 'src', 'pages')):
        if 'index.html' in files:
            rel = os.path.relpath(d, os.path.join(ROOT, 'src', 'pages'))
            out.append('/' if rel == '.' else '/%s/' % rel)
    return sorted(out)


def main():
    widths = [375, 768, 1100, 1440]
    result = {}
    for r in routes():
        per = {}
        for w in widths:
            ws = open_page('http://localhost:8000' + r, w)
            try:
                for s, px in (ev(ws, JS) or {}).items(): per.setdefault(s, {})[w] = px
            finally:
                close(ws)
        entry = {}
        for s, m in per.items():
            if not any(m.values()): continue
            vw = lambda w: max(1, int(-(-100 * m.get(w, 0) // w)))
            entry[s] = '(max-width: 560px) %dvw, (max-width: 900px) %dvw, (max-width: 1280px) %dvw, %dpx' % (
                vw(375), vw(768), vw(1100), max(1, int(-(-m.get(1440, 0) // 1))))
        result[r] = dict(sorted(entry.items()))
        print('%-32s %d images' % (r, len(entry)))
    with open(os.path.join(ROOT, 'src', 'image-sizes.json'), 'w') as f:
        json.dump(result, f, indent=1, ensure_ascii=False)
        f.write('\n')


if __name__ == '__main__':
    main()
