@echo off
title Blogger 10 Recipe Drafts Automation
echo ============================================================
echo   Running Daily Batch: 10 Recipe Drafts to Blogger
echo ============================================================
cd /d "%~dp0"
node src/index.js --batch 10
echo.
echo ============================================================
echo   Batch Complete! Check your Blogger Drafts dashboard.
echo ============================================================
pause
