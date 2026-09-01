@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === 1/3 建立 GitHub repo（yaoshi, 公開）並推送 ===
gh repo create yaoshi --public --source=. --push
if errorlevel 1 (
  echo repo 可能已存在，改為直接推送...
  git push -u origin main
)
echo === 2/3 開啟 GitHub Pages（main 分支根目錄） ===
gh api -X POST "repos/{owner}/{repo}/pages" -f "source[branch]=main" -f "source[path]=/" 2>nul
if errorlevel 1 echo Pages 可能已開啟過，略過。
echo === 3/3 完成。你的遊戲網址： ===
for /f "tokens=*" %%u in ('gh api repos/{owner}/{repo}/pages --jq .html_url') do echo   %%u
echo.
echo 用手機開上面的網址即可遊玩（可加入主畫面）。
pause
