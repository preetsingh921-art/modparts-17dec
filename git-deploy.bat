@echo off
REM Git Deployment Script for ModParts Project (Windows)
REM Usage: git-deploy.bat [commit-message] [branch]

setlocal enabledelayedexpansion

REM Default values
set DEFAULT_BRANCH=main
set DEFAULT_MESSAGE=Update: %date% %time%

REM Colors (if supported)
set RED=[91m
set GREEN=[92m
set YELLOW=[93m
set BLUE=[94m
set NC=[0m

REM Parse arguments
if "%~1"=="" (
    set COMMIT_MESSAGE=%DEFAULT_MESSAGE%
) else if "%~1"=="-h" (
    goto :show_help
) else if "%~1"=="--help" (
    goto :show_help
) else (
    set COMMIT_MESSAGE=%~1
)

if "%~2"=="" (
    set BRANCH=%DEFAULT_BRANCH%
) else (
    set BRANCH=%~2
)

echo %BLUE%[INFO]%NC% ModParts Git Deployment Script
echo %BLUE%[INFO]%NC% ===============================

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%NC% Not a git repository. Please run this script from your project root.
    exit /b 1
)

echo %BLUE%[INFO]%NC% Starting git deployment process...
echo %BLUE%[INFO]%NC% Commit message: %COMMIT_MESSAGE%
echo %BLUE%[INFO]%NC% Target branch: %BRANCH%

REM Step 1: Show current status
echo %BLUE%[INFO]%NC% Checking git status...
git status --porcelain

REM Step 2: Add all changes
echo %BLUE%[INFO]%NC% Adding all changes...
git add .

REM Step 3: Show what will be committed
echo %BLUE%[INFO]%NC% Files to be committed:
git diff --cached --name-status

REM Step 4: Commit changes
git diff-index --quiet --cached HEAD
if errorlevel 1 (
    echo %BLUE%[INFO]%NC% Committing changes...
    git commit -m "%COMMIT_MESSAGE%"
    if errorlevel 1 (
        echo %RED%[ERROR]%NC% Failed to commit changes.
        exit /b 1
    )
    echo %GREEN%[SUCCESS]%NC% Changes committed successfully!
) else (
    echo %YELLOW%[WARNING]%NC% No changes to commit.
)

REM Step 5: Get current branch
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i

REM Step 6: Switch to target branch if different
if not "%CURRENT_BRANCH%"=="%BRANCH%" (
    echo %BLUE%[INFO]%NC% Switching to branch: %BRANCH%
    git show-ref --verify --quiet refs/heads/%BRANCH%
    if errorlevel 1 (
        echo %BLUE%[INFO]%NC% Creating new branch: %BRANCH%
        git checkout -b %BRANCH%
    ) else (
        git checkout %BRANCH%
    )
    if errorlevel 1 (
        echo %RED%[ERROR]%NC% Failed to switch to branch %BRANCH%
        exit /b 1
    )
)

REM Step 7: Pull latest changes
echo %BLUE%[INFO]%NC% Pulling latest changes from remote...
git remote get-url origin >nul 2>&1
if not errorlevel 1 (
    git ls-remote --exit-code --heads origin %BRANCH% >nul 2>&1
    if not errorlevel 1 (
        git pull origin %BRANCH%
        if errorlevel 1 (
            echo %YELLOW%[WARNING]%NC% Pull failed. You may need to resolve conflicts manually.
        )
    ) else (
        echo %YELLOW%[WARNING]%NC% Remote branch %BRANCH% doesn't exist. Will create it on push.
    )
) else (
    echo %YELLOW%[WARNING]%NC% No remote 'origin' found. Skipping pull.
)

REM Step 8: Merge changes if we switched branches
if not "%CURRENT_BRANCH%"=="%BRANCH%" (
    if not "%CURRENT_BRANCH%"=="" (
        echo %BLUE%[INFO]%NC% Merging changes from %CURRENT_BRANCH% to %BRANCH%...
        git merge %CURRENT_BRANCH%
        if errorlevel 1 (
            echo %RED%[ERROR]%NC% Merge failed. Please resolve conflicts manually.
            exit /b 1
        )
    )
)

REM Step 9: Push to remote
git remote get-url origin >nul 2>&1
if not errorlevel 1 (
    echo %BLUE%[INFO]%NC% Pushing to remote repository...
    git push origin %BRANCH%
    if errorlevel 1 (
        echo %RED%[ERROR]%NC% Push failed. Please check your remote configuration.
        exit /b 1
    )
    echo %GREEN%[SUCCESS]%NC% Successfully pushed to origin/%BRANCH%!
) else (
    echo %YELLOW%[WARNING]%NC% No remote 'origin' found. Changes committed locally only.
)

REM Step 10: Show final status
echo %BLUE%[INFO]%NC% Final repository status:
git log --oneline -5

echo %GREEN%[SUCCESS]%NC% Deployment completed successfully! 🚀

REM Show deployment summary
echo.
echo ===========================
echo DEPLOYMENT SUMMARY
echo ===========================
echo Branch: %BRANCH%
for /f "tokens=*" %%i in ('git rev-parse --short HEAD') do echo Commit: %%i
echo Message: %COMMIT_MESSAGE%
echo Time: %date% %time%
git remote get-url origin >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%i in ('git remote get-url origin') do echo Remote: %%i
)
echo ===========================

goto :end

:show_help
echo Git Deployment Script for ModParts Project
echo.
echo Usage:
echo   %~nx0 [commit-message] [branch]
echo.
echo Examples:
echo   %~nx0                                    # Use default message and branch
echo   %~nx0 "Fix user authentication"         # Custom message, default branch
echo   %~nx0 "Add new feature" develop         # Custom message and branch
echo.
echo Options:
echo   -h, --help    Show this help message
echo.
echo Default branch: %DEFAULT_BRANCH%
echo Default message format: Update: MM/DD/YYYY HH:MM:SS

:end
endlocal
