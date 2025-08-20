# Git Deployment Scripts

Automated git deployment scripts for the ModParts project. These scripts streamline the process of committing, pushing, and deploying code changes.

## 🚀 Quick Start

### Using npm scripts (Recommended)
```bash
# Quick deployment with default message
npm run deploy

# Quick deployment with timestamp
npm run deploy:quick

# Deploy to development branch
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

### Direct script usage
```bash
# Node.js version (cross-platform)
node git-deploy.js "Your commit message" main

# Shell script (Linux/Mac)
./git-deploy.sh "Your commit message" main

# Windows batch file
git-deploy.bat "Your commit message" main
```

## 📋 Available Scripts

### 1. **git-deploy.js** (Node.js - Recommended)
- ✅ Cross-platform (Windows, Mac, Linux)
- ✅ Colored output and progress indicators
- ✅ Comprehensive error handling
- ✅ Detailed deployment summary

### 2. **git-deploy.sh** (Shell Script)
- ✅ Fast execution on Unix systems
- ✅ Colored output
- ✅ Robust error handling

### 3. **git-deploy.bat** (Windows Batch)
- ✅ Native Windows support
- ✅ Basic error handling
- ✅ Compatible with older Windows versions

## 🔧 What These Scripts Do

### Automated Workflow:
1. **Check git status** - Shows current repository state
2. **Add all changes** - Stages all modified files
3. **Show staged files** - Lists what will be committed
4. **Commit changes** - Creates commit with your message
5. **Switch branches** - Changes to target branch if needed
6. **Pull latest** - Gets latest changes from remote
7. **Merge changes** - Merges from source branch if switched
8. **Push to remote** - Uploads changes to GitHub/remote
9. **Show summary** - Displays deployment results

### Safety Features:
- ✅ **Pre-flight checks** - Validates git repository
- ✅ **Error handling** - Stops on failures
- ✅ **Conflict detection** - Warns about merge conflicts
- ✅ **Remote validation** - Checks remote connectivity
- ✅ **Branch verification** - Confirms branch existence

## 📖 Usage Examples

### Basic Usage
```bash
# Default commit message and main branch
npm run deploy

# Custom commit message, default branch
npm run deploy "Fix user authentication bug"

# Custom message and branch
node git-deploy.js "Add new feature" develop
```

### Common Scenarios
```bash
# Quick bug fix
npm run deploy "Fix: Resolve login issue"

# Feature development
node git-deploy.js "Feature: Add category images" feature/category-images

# Production release
npm run deploy:prod "Release: Version 1.2.0"

# Emergency hotfix
./git-deploy.sh "Hotfix: Critical security patch" hotfix/security-fix
```

### NPM Script Options
```bash
# Quick deployment with auto-generated timestamp
npm run deploy:quick

# Development branch deployment
npm run deploy:dev

# Production deployment
npm run deploy:prod

# Custom deployment
npm run deploy -- "Custom message" custom-branch
```

## ⚙️ Configuration

### Default Settings
- **Default Branch**: `main`
- **Default Remote**: `origin`
- **Default Message**: `Update: [current date/time]`

### Customizing Defaults
Edit the configuration in the script files:

**git-deploy.js:**
```javascript
const config = {
    defaultBranch: 'main',        // Change default branch
    defaultMessage: 'Update...',  // Change default message format
    remote: 'origin'              // Change default remote
};
```

**git-deploy.sh:**
```bash
DEFAULT_BRANCH="main"
DEFAULT_MESSAGE="Update: $(date '+%Y-%m-%d %H:%M:%S')"
```

## 🛡️ Error Handling

### Common Issues and Solutions

**"Not a git repository"**
- Solution: Run from your project root directory

**"Push failed"**
- Check internet connection
- Verify remote repository access
- Ensure you have push permissions

**"Merge failed"**
- Resolve conflicts manually
- Run `git status` to see conflicted files
- Edit files, then run `git add .` and `git commit`

**"No changes to commit"**
- This is normal if no files were modified
- The script will still attempt to push existing commits

## 🎯 Best Practices

### Commit Messages
```bash
# Good commit messages
"Fix: Resolve user authentication issue"
"Feature: Add category backdrop images"
"Update: Improve error handling in API"
"Hotfix: Critical security vulnerability"

# Avoid
"update"
"fix"
"changes"
```

### Branch Strategy
```bash
# Development work
npm run deploy:dev

# Feature branches
node git-deploy.js "Feature description" feature/feature-name

# Bug fixes
node git-deploy.js "Fix description" bugfix/issue-name

# Production releases
npm run deploy:prod
```

### Workflow Tips
1. **Test locally** before deploying
2. **Use descriptive** commit messages
3. **Deploy frequently** with small changes
4. **Review changes** before running script
5. **Keep branches** up to date

## 🔍 Troubleshooting

### Debug Mode
Add `--verbose` flag for detailed output:
```bash
node git-deploy.js "Debug deployment" main --verbose
```

### Manual Recovery
If script fails midway:
```bash
# Check current status
git status

# See recent commits
git log --oneline -5

# Reset if needed
git reset --soft HEAD~1

# Force push (use carefully)
git push --force-with-lease origin branch-name
```

### Permissions
Make scripts executable:
```bash
chmod +x git-deploy.sh
chmod +x git-deploy.js
```

## 📊 Output Examples

### Successful Deployment
```
[INFO] ModParts Git Deployment Script
[INFO] ===============================
[INFO] Starting git deployment process...
[INFO] Current branch: main
[INFO] Target branch: main
[INFO] Commit message: Add category backdrop images
[INFO] Adding all changes...
[INFO] Files to be committed:
M  frontend/src/pages/Home.jsx
A  frontend/public/images/categories/README.md
[SUCCESS] Changes committed successfully!
[INFO] Pushing to origin/main...
[SUCCESS] Successfully pushed to origin/main!
[SUCCESS] Deployment completed successfully! 🚀

==================================================
DEPLOYMENT SUMMARY
==================================================
Branch: main
Commit: a1b2c3d
Message: Add category backdrop images
Time: 12/07/2024, 3:45:30 PM
Remote: https://github.com/user/modparts.git
==================================================
```

## 🤝 Contributing

To improve these scripts:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

These scripts are part of the ModParts project and follow the same license terms.
