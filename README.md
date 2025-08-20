# 🌸 Kuuzuki Plugins

Official plugin collection for kuuzuki - bringing enhanced AI assistance and project intelligence to OpenCode.

## What are Kuuzuki Plugins?

Kuuzuki plugins extend OpenCode with powerful features that transform it into a project-aware AI assistant. These plugins understand your codebase, respect your development patterns, and enhance your workflow through intelligent configuration management.

## Available Plugins

### [@kuuzuki/agentrc](./packages/agentrc) - Core Plugin
The flagship plugin that provides the complete kuuzuki experience:

- 🌸 **Project Intelligence** - Context-aware AI assistance
- 📋 **Configuration Management** - Full `.agentrc` support + legacy parsing  
- 🔧 **Command Enhancement** - Project-specific command mapping
- 💾 **Memory & Rules** - Interactive memory tool for project rules
- 🛡️ **Security & Safety** - File access restrictions and policies

## Quick Start

```bash
# Clone the plugins repository
git clone https://github.com/moikas-code/kuuzuki-plugins.git
cd kuuzuki-plugins

# Install the core agentrc plugin globally
npm run install-global
```

Create a `.agentrc` file in your project:
```json
{
  "project": {
    "name": "my-project",
    "type": "typescript-react"
  },
  "commands": {
    "test": "npm test",
    "build": "npm run build"
  },
  "rules": [
    "Follow existing code patterns",
    "Write tests for new features"
  ]
}
```

Start OpenCode - kuuzuki will automatically enhance your session! 🌸

## Plugin Development

### Prerequisites
- Node.js >= 18.0.0
- npm

### Setup
```bash
# Clone and install
git clone https://github.com/moikas-code/kuuzuki-plugins.git
cd kuuzuki-plugins
npm install

# Test plugins
npm test

# Install for development
npm run dev
```

### Repository Structure

This repository contains official kuuzuki plugins organized as an npm workspaces monorepo:

```
kuuzuki-plugins/
├── packages/
│   └── agentrc/           # Core kuuzuki plugin
│       ├── src/           # Plugin source code
│       ├── examples/      # Sample configurations
│       └── README.md      # Plugin documentation
├── package.json           # Monorepo configuration
└── README.md             # This file
```

### Adding New Plugins

Future plugins will be added to `packages/` following the same structure:

- `@kuuzuki/memory-enhanced` - Advanced memory management
- `@kuuzuki/security-pro` - Enhanced security features
- `@kuuzuki/workflow-optimizer` - Workflow automation tools

## Plugin Philosophy

Kuuzuki plugins follow these principles:

- **Project-first** - Always understand the project context
- **Non-intrusive** - Enhance without breaking existing workflows  
- **Configurable** - Respect user preferences and project needs
- **Intelligent** - Learn and adapt to development patterns

## Contributing

We welcome contributions to kuuzuki plugins! 

- 🐛 [Report Issues](https://github.com/moikas-code/kuuzuki-plugins/issues)
- 💡 [Submit PRs](https://github.com/moikas-code/kuuzuki-plugins/pulls)
- 📖 [Plugin Documentation](./packages/agentrc/README.md)

### Plugin Development Guidelines

1. Follow the existing plugin structure in `packages/`
2. Include comprehensive documentation
3. Write tests for your plugin functionality
4. Ensure compatibility with existing kuuzuki features

## License

MIT - see [LICENSE](./LICENSE) for details