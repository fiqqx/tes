#!/bin/sh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  exec python3 jalankan.py "$@"
fi
if command -v python >/dev/null 2>&1 && python -c 'import sys; sys.exit(sys.version_info.major != 3)' >/dev/null 2>&1; then
  exec python jalankan.py "$@"
fi
printf '%s\n' 'Python 3 belum terpasang. Instal dari python.org atau buka index.html langsung di browser.'
exit 1
