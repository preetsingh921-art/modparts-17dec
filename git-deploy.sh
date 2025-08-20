#!/bin/bash

# Git Deployment Script for ModParts Project
# Usage: ./git-deploy.sh [commit-message] [branch]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEFAULT_BRANCH="main"
DEFAULT_MESSAGE="Update: $(date '+%Y-%m-%d %H:%M:%S')"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not a git repository. Please run this script from your project root."
        exit 1
    fi
}

# Function to check for uncommitted changes
check_uncommitted_changes() {
    if ! git diff-index --quiet HEAD --; then
        print_warning "You have uncommitted changes."
        return 1
    fi
    return 0
}

# Function to get current branch
get_current_branch() {
    git branch --show-current
}

# Function to check if branch exists
branch_exists() {
    git show-ref --verify --quiet refs/heads/$1
}

# Function to check if remote exists
remote_exists() {
    git remote get-url origin > /dev/null 2>&1
}

# Main deployment function
deploy() {
    local commit_message="$1"
    local target_branch="$2"
    local current_branch=$(get_current_branch)
    
    print_status "Starting git deployment process..."
    print_status "Current branch: $current_branch"
    print_status "Target branch: $target_branch"
    print_status "Commit message: $commit_message"
    
    # Step 1: Check git status
    print_status "Checking git status..."
    git status --porcelain
    
    # Step 2: Add all changes
    print_status "Adding all changes..."
    git add .
    
    # Step 3: Show what will be committed
    print_status "Files to be committed:"
    git diff --cached --name-status
    
    # Step 4: Commit changes
    if git diff-index --quiet --cached HEAD --; then
        print_warning "No changes to commit."
    else
        print_status "Committing changes..."
        git commit -m "$commit_message"
        print_success "Changes committed successfully!"
    fi
    
    # Step 5: Switch to target branch if different
    if [ "$current_branch" != "$target_branch" ]; then
        print_status "Switching to branch: $target_branch"
        if branch_exists "$target_branch"; then
            git checkout "$target_branch"
        else
            print_status "Creating new branch: $target_branch"
            git checkout -b "$target_branch"
        fi
    fi
    
    # Step 6: Pull latest changes (if remote exists)
    if remote_exists; then
        print_status "Pulling latest changes from remote..."
        if git ls-remote --exit-code --heads origin "$target_branch" > /dev/null 2>&1; then
            git pull origin "$target_branch" || {
                print_warning "Pull failed. You may need to resolve conflicts manually."
            }
        else
            print_warning "Remote branch $target_branch doesn't exist. Will create it on push."
        fi
    else
        print_warning "No remote 'origin' found. Skipping pull."
    fi
    
    # Step 7: Merge changes if we switched branches
    if [ "$current_branch" != "$target_branch" ] && [ "$current_branch" != "" ]; then
        print_status "Merging changes from $current_branch to $target_branch..."
        git merge "$current_branch" || {
            print_error "Merge failed. Please resolve conflicts manually."
            exit 1
        }
    fi
    
    # Step 8: Push to remote
    if remote_exists; then
        print_status "Pushing to remote repository..."
        git push origin "$target_branch" || {
            print_error "Push failed. Please check your remote configuration."
            exit 1
        }
        print_success "Successfully pushed to origin/$target_branch!"
    else
        print_warning "No remote 'origin' found. Changes committed locally only."
    fi
    
    # Step 9: Show final status
    print_status "Final repository status:"
    git log --oneline -5
    
    print_success "Deployment completed successfully! 🚀"
    
    # Show deployment summary
    echo ""
    echo "=== DEPLOYMENT SUMMARY ==="
    echo "Branch: $target_branch"
    echo "Commit: $(git rev-parse --short HEAD)"
    echo "Message: $commit_message"
    echo "Time: $(date)"
    if remote_exists; then
        echo "Remote: $(git remote get-url origin)"
    fi
    echo "=========================="
}

# Function to show help
show_help() {
    echo "Git Deployment Script for ModParts Project"
    echo ""
    echo "Usage:"
    echo "  $0 [commit-message] [branch]"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Use default message and branch"
    echo "  $0 \"Fix user authentication\"         # Custom message, default branch"
    echo "  $0 \"Add new feature\" develop        # Custom message and branch"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "Default branch: $DEFAULT_BRANCH"
    echo "Default message format: Update: YYYY-MM-DD HH:MM:SS"
}

# Parse command line arguments
case "$1" in
    -h|--help)
        show_help
        exit 0
        ;;
    "")
        COMMIT_MESSAGE="$DEFAULT_MESSAGE"
        BRANCH="$DEFAULT_BRANCH"
        ;;
    *)
        COMMIT_MESSAGE="$1"
        BRANCH="${2:-$DEFAULT_BRANCH}"
        ;;
esac

# Main execution
print_status "ModParts Git Deployment Script"
print_status "==============================="

# Pre-flight checks
check_git_repo

# Run deployment
deploy "$COMMIT_MESSAGE" "$BRANCH"
