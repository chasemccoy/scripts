#!/bin/bash

# Setup script for Claude Code configuration
# Creates symlinks from this repo to ~/.claude

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

echo "Setting up Claude Code configuration..."

# Create .claude directory if it doesn't exist
mkdir -p "$CLAUDE_DIR"

# Symlink CLAUDE.md
if [ -L "$CLAUDE_DIR/CLAUDE.md" ]; then
    echo "✓ CLAUDE.md symlink already exists"
elif [ -f "$CLAUDE_DIR/CLAUDE.md" ]; then
    echo "⚠ Backing up existing CLAUDE.md to CLAUDE.md.backup"
    mv "$CLAUDE_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md.backup"
    ln -s "$SCRIPT_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"
    echo "✓ Created CLAUDE.md symlink"
else
    ln -s "$SCRIPT_DIR/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"
    echo "✓ Created CLAUDE.md symlink"
fi

# Symlink skills directory
if [ -L "$CLAUDE_DIR/skills" ]; then
    echo "✓ skills symlink already exists"
elif [ -d "$CLAUDE_DIR/skills" ]; then
    echo "⚠ Backing up existing skills directory to skills.backup"
    mv "$CLAUDE_DIR/skills" "$CLAUDE_DIR/skills.backup"
    ln -s "$SCRIPT_DIR/skills" "$CLAUDE_DIR/skills"
    echo "✓ Created skills symlink"
else
    ln -s "$SCRIPT_DIR/skills" "$CLAUDE_DIR/skills"
    echo "✓ Created skills symlink"
fi

# Symlink commands directory
if [ -L "$CLAUDE_DIR/commands" ]; then
    echo "✓ commands symlink already exists"
elif [ -d "$CLAUDE_DIR/commands" ]; then
    echo "⚠ Backing up existing commands directory to commands.backup"
    mv "$CLAUDE_DIR/commands" "$CLAUDE_DIR/commands.backup"
    ln -s "$SCRIPT_DIR/commands" "$CLAUDE_DIR/commands"
    echo "✓ Created commands symlink"
else
    ln -s "$SCRIPT_DIR/commands" "$CLAUDE_DIR/commands"
    echo "✓ Created commands symlink"
fi

echo ""
echo "Setup complete! Claude Code will now use:"
echo "  • Configuration: $SCRIPT_DIR/CLAUDE.md"
echo "  • Skills: $SCRIPT_DIR/skills"
echo "  • Commands: $SCRIPT_DIR/commands"
