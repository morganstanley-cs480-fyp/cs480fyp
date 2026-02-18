#!/usr/bin/env python3
"""
Code quality check script for search service.
Runs pylint and flake8 on the codebase.
"""

import sys
import subprocess
from pathlib import Path

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


def print_header(message):
    """Print colored header"""
    print(f"\n{BLUE}{'=' * 60}{RESET}")
    print(f"{BLUE}{message}{RESET}")
    print(f"{BLUE}{'=' * 60}{RESET}\n")


def run_command(cmd, description):
    """Run a command and return success status"""
    print(f"{YELLOW}Running: {description}{RESET}")
    print(f"Command: {' '.join(cmd)}\n")
    
    try:
        result = subprocess.run(
            cmd, 
            cwd=Path(__file__).parent.parent,
            capture_output=False,
            text=True
        )
        
        if result.returncode == 0:
            print(f"{GREEN}✓ {description} passed{RESET}")
            return True
        else:
            print(f"{RED}✗ {description} failed{RESET}")
            return False
    except FileNotFoundError as e:
        print(f"{RED}✗ {description} - command not found{RESET}")
        print(f"{RED}Error: {e}{RESET}")
        print(f"{YELLOW}Hint: Make sure you've installed requirements: pip install -r requirements.txt{RESET}")
        return False


def main():
    """Run all linting checks"""
    print_header("SEARCH SERVICE - CODE QUALITY CHECKS")
    
    results = []
    
    # Use sys.executable to run Python modules (cross-platform compatible)
    python_exe = sys.executable
    
    # Run Pylint
    results.append(run_command(
        [python_exe, '-m', 'pylint', 'app/'],
        'Pylint (code quality)'
    ))
    
    # Run Flake8
    results.append(run_command(
        [python_exe, '-m', 'flake8', 'app/'],
        'Flake8 (style guide)'
    ))
    
    # Summary
    print_header("SUMMARY")
    
    passed = sum(results)
    total = len(results)
    
    print(f"Passed: {passed}/{total}")
    
    if all(results):
        print(f"\n{GREEN}🎉 All checks passed!{RESET}\n")
        return 0
    else:
        print(f"\n{RED}⚠️  Some checks failed. Please fix the issues above.{RESET}\n")
        return 1


if __name__ == '__main__':
    sys.exit(main())
