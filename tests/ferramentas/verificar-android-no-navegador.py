#!/usr/bin/env python3
"""
Verifica o jogo no AMBIENTE DO APP ANDROID (Capacitor), no Chromium de verdade (Playwright).

O app Android serve a pasta www/ por HTTPS no endereço https://localhost (um servidor local dentro do app),
com um sistema de arquivos que diferencia maiúsculas de minúsculas e SEM internet. Aqui isso é reproduzido:
  1. monta a www/ com scripts/preparar-web.js numa pasta temporária;
  2. serve por HTTPS em https://localhost:PORTA (certificado de teste), só a pasta www/;
  3. abre o jogo como um celular Android (toque, tela horizontal, agente de usuário Android) e confere:
       - todo recurso pedido (HTML, CSS, JS, MP3) responde 200 e vem do próprio app (nenhum endereço externo);
       - os 3 áudios carregam de verdade (sem erro de mídia);
       - o jogo roda: JOGAR, turbo pelo círculo, direção por toque, batida e Game Over, sem erros de JavaScript;
       - o armazenamento persiste ao recarregar: idioma, unidade, opção de som e recorde;
       - o layout usa a tela toda;
  4. repete em duas telas (Galaxy A37 horizontal e celular 16:9).

Uso:  pip install playwright && playwright install chromium
      python3 tests/ferramentas/verificar-android-no-navegador.py
"""
import http.server, json, pathlib, shutil, socketserver, ssl, subprocess, tempfile, threading
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parents[2]
UA_ANDROID = "Mozilla/5.0 (Linux; Android 15; SM-A376B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
TELAS = [("Galaxy A37 horizontal", 915, 412, 2.625), ("Celular 16:9", 640, 360, 2)]

class Servidor(http.server.SimpleHTTPRequestHandler):
    pedidos = []
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
    def do_GET(self):
        Servidor.pedidos.append(self.path); super().do_GET()

def main():
    falhas, total = [], 0
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="app-android-"))
    www = tmp / "www"

    # 1) Mesma cópia que o app empacota
    saida = subprocess.run(["node", str(RAIZ / "scripts" / "preparar-web.js"), "--destino", str(www)], capture_output=True, text=True)
    print(saida.stdout.strip()); 
    if saida.returncode: print(saida.stderr); raise SystemExit(1)

    # 2) HTTPS em localhost (como o app: https://localhost)
    subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", str(tmp / "k.pem"), "-out", str(tmp / "c.pem"),
                    "-days", "1", "-subj", "/CN=localhost"], capture_output=True, check=True)
    ctxssl = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); ctxssl.load_cert_chain(tmp / "c.pem", tmp / "k.pem")
    class H(Servidor):
        def __init__(self, *a, **k): super().__init__(*a, directory=str(www), **k)
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), H); srv.daemon_threads = True
    srv.socket = ctxssl.wrap_socket(srv.socket, server_side=True)
    porta = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    origem = f"https://localhost:{porta}"
    print(f"servindo {www} em {origem}")

    with sync_playwright() as p:
        nav = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required", "--host-resolver-rules=MAP localhost 127.0.0.1"])
        for nome, w, h, dpr in TELAS:
            ctx = nav.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr, has_touch=True, is_mobile=True,
                                  user_agent=UA_ANDROID, ignore_https_errors=True)
            pg = ctx.new_page(); erros, respostas, falhou = [], [], []
            pg.on("pageerror", lambda e: erros.append(str(e)))
            pg.on("response", lambda r: respostas.append((r.url, r.status)))
            pg.on("requestfailed", lambda r: falhou.append((r.url, r.failure)))
            Servidor.pedidos.clear()

            def checar(ok, msg):
                nonlocal total; total += 1
                if not ok: falhas.append(f"[{nome}] {msg}")

            print(f"\n{nome} {w}x{h}")
            pg.goto(origem + "/index.html"); pg.wait_for_timeout(700)
            checar(pg.evaluate("() => location.origin") == origem and pg.evaluate("() => isSecureContext"), "não abriu em contexto seguro https://localhost")
            checar(pg.evaluate("() => /Android/.test(navigator.userAgent)"), "agente de usuário não é Android")

            # --- jogo roda: JOGAR, turbo pelo círculo, direção por toque ---
            pg.tap("#playBtn"); pg.wait_for_timeout(900)
            checar(pg.evaluate("() => partidaAtiva()"), "a partida não começou")
            g = pg.evaluate("""() => { const c = document.getElementById('gameCanvas').getBoundingClientRect(); const u = c.height / GAME_HEIGHT;
                return { cx: c.x + (VISTA.largura - 52) * u, cy: c.y + (GAME_HEIGHT - 52) * u, w: c.width, x: c.x, h: c.height, y: c.y }; }""")
            checar(g["w"] >= w - 1 and g["x"] <= 1, f"o canvas não usa a largura toda: {g['w']:.0f} de {w}")
            cdp = ctx.new_cdp_session(pg)
            toque = lambda tipo, *ps: cdp.send("Input.dispatchTouchEvent", {"type": tipo, "touchPoints": [{"x": x, "y": y, "id": i} for i, (x, y) in enumerate(ps)] if tipo != "touchEnd" else []})
            pg.evaluate("() => { obstacles.length = 0; }")
            toque("touchStart", (g["cx"], g["cy"])); pg.wait_for_timeout(250)
            checar(pg.evaluate("() => gameState.isTurboActive") and not pg.evaluate("() => input.left || input.right"), "turbo pelo círculo / não deve dirigir")
            toque("touchEnd"); pg.wait_for_timeout(150)
            toque("touchStart", (w * 0.2, h * 0.5)); pg.wait_for_timeout(100)
            checar(pg.evaluate("() => input.left && !input.right"), "metade esquerda não dirigiu")
            toque("touchEnd")

            # --- batida e Game Over (usa o áudio de batida e freada) ---
            pg.evaluate("() => { obstacles.length = 0; const o = criarObstaculo('civilian', { faixa: 1, velocidade: 1 }); o.worldX = player.worldX; o.z = PLAYER_Z; o.prevZ = PLAYER_Z + 0.05; }")
            pg.wait_for_function("() => !document.getElementById('gameOverScreen').classList.contains('hidden')", timeout=8000)
            checar(True, "")

            # --- áudios: carregam do servidor local, sem erro de mídia ---
            estado = pg.evaluate("""async () => { const r = {}; for (const [n, a] of Object.entries(gerenciadorAudio.sons)) {
                a.load(); await new Promise(res => { a.addEventListener('loadedmetadata', res, { once: true }); a.addEventListener('error', res, { once: true }); setTimeout(res, 4000); });
                r[n] = { src: a.src, erro: a.error ? a.error.code : null, duracao: a.duration }; } return r; }""")
            for n, a in estado.items():
                checar(a["src"].startswith(origem + "/audio/"), f"áudio {n} não vem de {origem}/audio/: {a['src']}")
                checar(a["erro"] is None and a["duracao"] and a["duracao"] > 0.3, f"áudio {n} não carregou: {a}")
            print("   áudios:", {n: round(a["duracao"], 2) for n, a in estado.items()})

            # --- armazenamento: idioma, unidade, som e recorde persistem ao recarregar ---
            pg.evaluate("() => { definirIdioma('en'); }")
            ant = pg.evaluate("() => Object.keys(localStorage).sort()")
            pg.evaluate("() => { const o = JSON.parse(localStorage.getItem('retroTurboOptions') || '{}'); o.sound = false; localStorage.setItem('retroTurboOptions', JSON.stringify(o)); }")
            recorde = pg.evaluate("() => { try { return JSON.parse(localStorage.getItem('retroTurboRecords') || '[]'); } catch (e) { return null; } }")
            checar(isinstance(recorde, list) and len(recorde) >= 1, f"o recorde da batida não foi gravado: {recorde}")
            pg.reload(); pg.wait_for_timeout(700)
            depois = pg.evaluate("""() => ({ idioma: document.documentElement.lang, opcoes: JSON.parse(localStorage.getItem('retroTurboOptions') || '{}'),
                recordes: JSON.parse(localStorage.getItem('retroTurboRecords') || '[]').length, mudo: gerenciadorAudio.mudo,
                menu: document.querySelector('#playBtn').textContent.trim() })""")
            checar(depois["opcoes"].get("sound") is False and depois["mudo"] is True, f"opção de som não persistiu: {depois}")
            checar(depois["recordes"] == len(recorde), "recordes não persistiram")
            checar(depois["menu"] == "PLAY", f"o idioma não persistiu (menu: {depois['menu']!r})")
            print("   armazenamento:", ant, "→ recarregado:", depois["menu"], depois["recordes"], "recorde(s)")

            # --- toda requisição: 200, do próprio app, sem internet ---
            ruins = [(u, s) for u, s in respostas if s != 200 and not u.startswith("data:")]
            externos = [u for u, _ in respostas if not u.startswith(origem) and not u.startswith("data:")]
            checar(not ruins, f"respostas diferentes de 200: {ruins}")
            checar(not externos, f"pedidos fora do app: {externos}")
            checar(not falhou, f"requisições que falharam: {falhou}")
            tipos = {}
            for u, _ in respostas:
                ext = u.split("?")[0].rsplit(".", 1)[-1] if "." in u.split("?")[0].rsplit("/", 1)[-1] else "html"
                tipos[ext] = tipos.get(ext, 0) + 1
            print("   recursos:", tipos)
            for esperado in ("index.html", "css/estilos/layout.css", "js/config.js", "js/audio/gerenciador.js", "js/recompensas/interface.js", "audio/policia.mp3", "audio/batidaCarro.mp3", "audio/freadaCarro.mp3"):
                checar(any(u.split("?")[0].endswith("/" + esperado) for u, _ in respostas), f"não pediu {esperado}")

            checar(not erros, f"erros de JavaScript: {erros}")
            ctx.close()
        nav.close()

    srv.shutdown(); shutil.rmtree(tmp, ignore_errors=True)
    print(f"\n{total} verificações, {len(falhas)} falha(s)")
    for f in falhas: print("  FALHA", f)
    raise SystemExit(1 if falhas else 0)

if __name__ == "__main__":
    main()
