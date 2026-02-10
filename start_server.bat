@echo off
echo Baslatiliyor: TMSA Curie...
echo Sunucu aktif ediliyor (NodeJS serve)...
echo Lutfen bu pencereyi KAPATMAYIN.
echo.
echo Tarayiciniz 3 saniye icinde acilacak.
start "" "http://localhost:3000"
npx -y serve .
pause
