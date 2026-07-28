@echo off
cd /d "%~dp0"
echo Starting PodcastOS at http://localhost:3000
call npm.cmd run dev
