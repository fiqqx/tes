#!/usr/bin/env python3
"""Jalankan Aetheria dengan Python standar, tanpa package tambahan."""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import threading
import webbrowser


def main():
    parser = argparse.ArgumentParser(description="Jalankan Aetheria Chronicles di browser.")
    parser.add_argument("--port", type=int, default=8000, help="Port server (default: 8000)")
    parser.add_argument("--no-browser", action="store_true", help="Jangan buka browser otomatis")
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent
    handler = functools.partial(SimpleHTTPRequestHandler, directory=str(directory))
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError as error:
        print("Server tidak dapat dimulai: {}".format(error), file=sys.stderr)
        print("Coba port lain: python jalankan.py --port 8001", file=sys.stderr)
        return 1
    address = "http://127.0.0.1:{}/".format(server.server_port)
    print("\nAetheria Chronicles", flush=True)
    print("Buka browser: " + address, flush=True)
    print("Biarkan terminal ini terbuka. Tekan Ctrl+C untuk berhenti.\n", flush=True)
    timer = None
    if not args.no_browser:
        timer = threading.Timer(0.5, webbrowser.open, args=(address,))
        timer.daemon = True
        timer.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nSampai jumpa di petualangan berikutnya!")
    finally:
        if timer:
            timer.cancel()
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
