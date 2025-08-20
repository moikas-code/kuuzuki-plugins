#!/bin/bash

# Kuuzuki OpenCode Plugin Installer
echo "🌸 Installing Kuuzuki OpenCode Plugin..."

# Function to install globally
install_global() {
    echo "Installing globally for all OpenCode sessions..."
    mkdir -p ~/.config/opencode/plugin
    cp src/index.js ~/.config/opencode/plugin/kuuzuki-agentrc.js
    echo "✅ Plugin installed globally at ~/.config/opencode/plugin/"
}

# Function to install in current project
install_project() {
    echo "Installing for current project only..."
    mkdir -p .opencode/plugin  
    cp src/index.js .opencode/plugin/kuuzuki-agentrc.js
    echo "✅ Plugin installed in project at .opencode/plugin/"
}

# Function to create sample .agentrc
create_sample_agentrc() {
    if [ ! -f ".agentrc" ]; then
        echo "Creating sample .agentrc file..."
        cat > .agentrc << 'EOF'
{
  "project": {
    "name": "my-project",
    "type": "javascript-project",
    "description": "Enhanced with kuuzuki .agentrc support"
  },
  "commands": {
    "build": "npm run build",
    "test": "npm test",
    "dev": "npm run dev",
    "lint": "npm run lint"
  },
  "rules": [
    "Follow existing code patterns",
    "Write tests for new features",
    "Use semantic commit messages"
  ],
  "tools": {
    "packageManager": "npm",
    "formatter": "prettier"
  }
}
EOF
        echo "✅ Sample .agentrc created"
    else
        echo "ℹ️  .agentrc already exists, skipping sample creation"
    fi
}

# Main installation logic
case "${1:-prompt}" in
    "global")
        install_global
        ;;
    "project")
        install_project
        create_sample_agentrc
        ;;
    "both")
        install_global
        install_project
        create_sample_agentrc
        ;;
    "prompt"|"")
        echo "🌸 Kuuzuki OpenCode Plugin Installer"
        echo ""
        echo "Choose installation type:"
        echo "1) Global (affects all OpenCode sessions)"
        echo "2) Project only (current directory)" 
        echo "3) Both global and project"
        echo "4) Cancel"
        echo ""
        read -p "Enter choice (1-4): " choice
        
        case $choice in
            1)
                install_global
                ;;
            2)
                install_project
                create_sample_agentrc
                ;;
            3)
                install_global
                install_project
                create_sample_agentrc
                ;;
            4)
                echo "Cancelled"
                exit 0
                ;;
            *)
                echo "Invalid choice"
                exit 1
                ;;
        esac
        ;;
    *)
        echo "Usage: $0 [global|project|both]"
        echo "  global  - Install globally for all OpenCode sessions"
        echo "  project - Install for current project only"
        echo "  both    - Install both globally and in project"
        echo "  (no arg) - Interactive prompt"
        exit 1
        ;;
esac

echo ""
echo "🎉 Kuuzuki plugin installation complete!"
echo ""
echo "Next steps:"
echo "1. Restart OpenCode if it's running"
echo "2. Look for the kuuzuki welcome banner"
echo "3. Use 'memory action=list' to see your project configuration"
echo "4. Edit .agentrc to customize your project settings"
echo ""
echo "For help and documentation:"
echo "  https://github.com/moikas-code/kuuzuki"