@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
    py -3 --version >nul 2>nul
    if not errorlevel 1 (
        py -3 jalankan.py %*
        goto selesai
    )
)
where python >nul 2>nul
if not errorlevel 1 (
    python -c "import sys; sys.exit(sys.version_info.major != 3)" >nul 2>nul
    if not errorlevel 1 (
        python jalankan.py %*
        goto selesai
    )
)
echo Python 3 belum terpasang.
echo Instal Python 3 dari https://www.python.org/downloads/
echo Saat instalasi, centang Add Python to PATH.
echo Alternatif: buka index.html langsung di browser.
:selesai
pause
