@echo off
echo ========================================
echo   WPH Training System - Setup Database
echo ========================================
echo.

echo [1/2] Creating database schema...
mysql -u root -p -e "source database/schema.sql"

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to create database schema
    echo Please check your MySQL connection
    pause
    exit /b 1
)

echo [2/2] Initializing default users...
node server/scripts/init-database.js

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to initialize database
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Setup completed successfully!
echo ========================================
echo.
pause
