from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import os, socket

PORT = 8080
UPBIT = "https://api.upbit.com"  # 모든 /upbit/* 를 여기에 프록시

# 서버 루트 폴더를 이 파일 위치로 고정
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Requested-With")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        try:
            # ✅ 모든 업비트 API 프록시: /upbit/v1/..., /upbit/v1/candles/... 등 전부 처리
            if self.path.startswith("/upbit/"):
                target = UPBIT + self.path[len("/upbit"):]  # 예) /v1/market/all?...
                req = Request(target, headers={"User-Agent": "zzeol-wallet/9.2"})
                try:
                    with urlopen(req, timeout=10) as resp:
                        data = resp.read()
                        self.send_response(resp.status)
                        self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json; charset=utf-8"))
                        self.send_header("Cache-Control", "no-store")
                        self._cors()
                        self.send_header("Content-Length", str(len(data)))
                        self.end_headers()
                        self.wfile.write(data)
                except HTTPError as e:
                    body = e.read() or b"{}"
                    self.send_response(e.code)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self._cors()
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                except URLError:
                    body = b'{"error":"Bad Gateway"}'
                    self.send_response(502)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self._cors()
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                return

            # 정적 파일(index.html 등)
            return super().do_GET()

        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError, socket.error):
            # 브라우저 탭 이동 중 끊김 등은 조용히 무시
            pass

    def log_message(self, fmt, *args):
        print(f"[쩔어지갑] {self.log_date_time_string()} - {fmt % args}")

if __name__ == "__main__":
    print(f"쩔어지갑 서버 실행 중 👉 http://localhost:{PORT}")
    ThreadingHTTPServer(("localhost", PORT), Handler).serve_forever()
