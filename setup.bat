@echo off
echo ============================
echo   OGFN 24.20 Setup
echo ============================

echo.
echo Installing dependencies...
npm install

echo.
echo Building shared package...
cd shared && npm run build && cd ..

echo.
echo Building server...
cd server && npm run build && cd ..

echo.
echo Building launcher...
cd launcher && npm run build && cd ..

echo.
echo ============================
echo   Setup Complete!
echo ============================
echo.
echo To start the server:  npm run server
echo To start launcher:    npm run launcher
echo.
pause
