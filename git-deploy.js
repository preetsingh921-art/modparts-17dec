#!/usr/bin/env node

/**
 * Git Deployment Script for ModParts Project
 * Cross-platform Node.js version
 * 
 * Usage: node git-deploy.js [commit-message] [branch]
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Default configuration
const config = {
    defaultBranch: 'main',
    defaultMessage: `Update: ${new Date().toLocaleString()}`,
    remote: 'origin'
};

class GitDeployer {
    constructor() {
        this.currentBranch = '';
        this.hasRemote = false;
    }

    // Utility functions for colored output
    log(message, color = 'blue') {
        console.log(`${colors[color]}[INFO]${colors.reset} ${message}`);
    }

    success(message) {
        console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
    }

    warning(message) {
        console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
    }

    error(message) {
        console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
    }

    // Execute git command and return output
    execGit(command, options = {}) {
        try {
            const result = execSync(`git ${command}`, {
                encoding: 'utf8',
                stdio: options.silent ? 'pipe' : 'inherit',
                ...options
            });
            return result ? result.trim() : '';
        } catch (error) {
            if (!options.ignoreError) {
                throw error;
            }
            return null;
        }
    }

    // Check if we're in a git repository
    checkGitRepo() {
        try {
            this.execGit('rev-parse --git-dir', { silent: true });
            return true;
        } catch {
            this.error('Not a git repository. Please run this script from your project root.');
            process.exit(1);
        }
    }

    // Get current branch name
    getCurrentBranch() {
        try {
            this.currentBranch = this.execGit('branch --show-current', { silent: true });
            return this.currentBranch;
        } catch {
            this.warning('Could not determine current branch');
            return 'unknown';
        }
    }

    // Check if branch exists
    branchExists(branch) {
        try {
            this.execGit(`show-ref --verify --quiet refs/heads/${branch}`, { silent: true, ignoreError: true });
            return true;
        } catch {
            return false;
        }
    }

    // Check if remote exists
    checkRemote() {
        try {
            this.execGit(`remote get-url ${config.remote}`, { silent: true });
            this.hasRemote = true;
            return true;
        } catch {
            this.hasRemote = false;
            return false;
        }
    }

    // Check for uncommitted changes
    hasUncommittedChanges() {
        try {
            const status = this.execGit('status --porcelain', { silent: true });
            return status.length > 0;
        } catch {
            return false;
        }
    }

    // Show git status
    showStatus() {
        this.log('Current git status:');
        try {
            this.execGit('status --short');
        } catch {
            this.warning('Could not get git status');
        }
    }

    // Add all changes
    addChanges() {
        this.log('Adding all changes...');
        this.execGit('add .');
        
        // Show what will be committed
        this.log('Files to be committed:');
        try {
            this.execGit('diff --cached --name-status');
        } catch {
            this.log('No changes staged for commit');
        }
    }

    // Commit changes
    commitChanges(message) {
        try {
            const hasChanges = this.execGit('diff --cached --name-only', { silent: true });
            if (!hasChanges) {
                this.warning('No changes to commit.');
                return false;
            }
            
            this.log(`Committing with message: "${message}"`);
            this.execGit(`commit -m "${message}"`);
            this.success('Changes committed successfully!');
            return true;
        } catch (error) {
            this.error('Failed to commit changes');
            throw error;
        }
    }

    // Switch or create branch
    switchBranch(targetBranch) {
        if (this.currentBranch === targetBranch) {
            this.log(`Already on branch: ${targetBranch}`);
            return;
        }

        if (this.branchExists(targetBranch)) {
            this.log(`Switching to existing branch: ${targetBranch}`);
            this.execGit(`checkout ${targetBranch}`);
        } else {
            this.log(`Creating new branch: ${targetBranch}`);
            this.execGit(`checkout -b ${targetBranch}`);
        }
    }

    // Pull latest changes
    pullChanges(branch) {
        if (!this.hasRemote) {
            this.warning('No remote found. Skipping pull.');
            return;
        }

        try {
            // Check if remote branch exists
            this.execGit(`ls-remote --exit-code --heads ${config.remote} ${branch}`, { silent: true });
            this.log(`Pulling latest changes from ${config.remote}/${branch}...`);
            this.execGit(`pull ${config.remote} ${branch}`);
        } catch {
            this.warning(`Remote branch ${branch} doesn't exist. Will create it on push.`);
        }
    }

    // Merge changes from another branch
    mergeChanges(fromBranch, toBranch) {
        if (fromBranch === toBranch || !fromBranch) {
            return;
        }

        this.log(`Merging changes from ${fromBranch} to ${toBranch}...`);
        try {
            this.execGit(`merge ${fromBranch}`);
            this.success('Merge completed successfully!');
        } catch (error) {
            this.error('Merge failed. Please resolve conflicts manually.');
            throw error;
        }
    }

    // Push to remote
    pushChanges(branch) {
        if (!this.hasRemote) {
            this.warning('No remote found. Changes committed locally only.');
            return;
        }

        this.log(`Pushing to ${config.remote}/${branch}...`);
        try {
            this.execGit(`push ${config.remote} ${branch}`);
            this.success(`Successfully pushed to ${config.remote}/${branch}!`);
        } catch (error) {
            this.error('Push failed. Please check your remote configuration.');
            throw error;
        }
    }

    // Show deployment summary
    showSummary(commitMessage, branch) {
        this.log('Final repository status:');
        this.execGit('log --oneline -5');

        console.log('\n' + '='.repeat(50));
        console.log(`${colors.cyan}DEPLOYMENT SUMMARY${colors.reset}`);
        console.log('='.repeat(50));
        console.log(`Branch: ${branch}`);
        
        try {
            const commitHash = this.execGit('rev-parse --short HEAD', { silent: true });
            console.log(`Commit: ${commitHash}`);
        } catch {
            console.log('Commit: unknown');
        }
        
        console.log(`Message: ${commitMessage}`);
        console.log(`Time: ${new Date().toLocaleString()}`);
        
        if (this.hasRemote) {
            try {
                const remoteUrl = this.execGit(`remote get-url ${config.remote}`, { silent: true });
                console.log(`Remote: ${remoteUrl}`);
            } catch {
                console.log('Remote: unknown');
            }
        }
        
        console.log('='.repeat(50));
        this.success('Deployment completed successfully! 🚀');
    }

    // Main deployment process
    async deploy(commitMessage, targetBranch) {
        try {
            this.log('Starting git deployment process...');
            this.log(`Current branch: ${this.currentBranch}`);
            this.log(`Target branch: ${targetBranch}`);
            this.log(`Commit message: ${commitMessage}`);

            // Step 1: Show current status
            this.showStatus();

            // Step 2: Add all changes
            this.addChanges();

            // Step 3: Commit changes
            const hasNewCommit = this.commitChanges(commitMessage);

            // Step 4: Switch to target branch if needed
            this.switchBranch(targetBranch);

            // Step 5: Pull latest changes
            this.pullChanges(targetBranch);

            // Step 6: Merge changes if we switched branches
            this.mergeChanges(this.currentBranch, targetBranch);

            // Step 7: Push to remote
            this.pushChanges(targetBranch);

            // Step 8: Show summary
            this.showSummary(commitMessage, targetBranch);

        } catch (error) {
            this.error(`Deployment failed: ${error.message}`);
            process.exit(1);
        }
    }

    // Initialize and run deployment
    async run(args) {
        // Parse arguments
        const commitMessage = args[0] || config.defaultMessage;
        const targetBranch = args[1] || config.defaultBranch;

        // Pre-flight checks
        this.checkGitRepo();
        this.getCurrentBranch();
        this.checkRemote();

        // Run deployment
        await this.deploy(commitMessage, targetBranch);
    }
}

// Show help
function showHelp() {
    console.log(`${colors.cyan}Git Deployment Script for ModParts Project${colors.reset}`);
    console.log('');
    console.log('Usage:');
    console.log('  node git-deploy.js [commit-message] [branch]');
    console.log('');
    console.log('Examples:');
    console.log('  node git-deploy.js                              # Use default message and branch');
    console.log('  node git-deploy.js "Fix user authentication"    # Custom message, default branch');
    console.log('  node git-deploy.js "Add new feature" develop    # Custom message and branch');
    console.log('');
    console.log('Options:');
    console.log('  -h, --help    Show this help message');
    console.log('');
    console.log(`Default branch: ${config.defaultBranch}`);
    console.log('Default message format: Update: MM/DD/YYYY, HH:MM:SS AM/PM');
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('-h') || args.includes('--help')) {
        showHelp();
        process.exit(0);
    }

    const deployer = new GitDeployer();
    deployer.run(args);
}
