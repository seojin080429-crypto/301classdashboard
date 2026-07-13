@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo.
echo GitHub 업로드 중...
echo.
git add .
git commit -m "dashboard update"
git push
echo.
echo 완료! GitHub에 올라갔어요
echo.
pause