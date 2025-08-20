# 🌸 @kuuzuki/agentrc

The complete kuuzuki experience for OpenCode - transforming your development workflow with project intelligence, advanced configuration management, and enhanced AI assistance.

## ✨ Complete Feature Set

### 🌸 **Project Intelligence**
- Context-aware AI that understands your codebase structure and conventions
- Beautiful kuuzuki branding that transforms the OpenCode experience
- Project-specific guidance and assistance

### 📋 **Advanced Configuration**
- **Full .agentrc support** - Complete compatibility with kuuzuki's configuration format
- **Legacy file parsing** - Automatic support for AGENTS.md, CLAUDE.md, .cursorrules, and more
- **Hierarchical loading** - Project → Global → Kuuzuki global configuration cascade

### 🔧 **Intelligent Command Management**
- **Automatic command mapping** - Use project-specific build, test, lint, dev commands
- **Seamless integration** - Works with existing workflows without changes
- **Command enhancement** - Project-aware command execution

### 💾 **Memory & Learning**
- **Interactive memory tool** - Manage project rules and configuration on-the-fly
- **Persistent storage** - Rules and settings persist across sessions
- **Session learning** - Adapts to your development patterns over time

### 🛡️ **Security & Safety**
- **File access control** - Configurable restrictions for sensitive files
- **Data protection** - Prevents exposure of secrets and environment variables
- **Security policies** - Enforces project-specific security rules

## Installation

### From Source (Recommended)

```bash
# Clone the monorepo
git clone https://github.com/moikas-code/kuuzuki.git
cd kuuzuki/packages/agentrc

# Global installation
npm run install-global

# Project-specific installation  
npm run install-project
```

### Method 3: Manual installation

```bash
# Copy plugin to global OpenCode plugin directory
mkdir -p ~/.config/opencode/plugin
cp src/index.js ~/.config/opencode/plugin/kuuzuki-agentrc.js

# OR copy to project-specific directory
mkdir -p .opencode/plugin
cp src/index.js .opencode/plugin/kuuzuki-agentrc.js
```

## Usage

Once installed, the plugin automatically:

1. **Loads .agentrc configuration** from:
   - `./agentrc` (project level)
   - `~/.config/opencode/.agentrc` (global)
   - `~/.config/kuuzuki/.agentrc` (kuuzuki global)

2. **Displays kuuzuki welcome banner** with project information

3. **Maps commands** based on your .agentrc:
   ```json
   {
     "commands": {
       "test": "bun test",
       "build": "./run.sh build all",
       "lint": "bun run lint"
     }
   }
   ```

4. **Enforces security rules** from .agentrc configuration

## Memory Tool Commands

Interact with your project configuration using the memory tool:

```bash
# List current rules and configuration
memory action=list

# Add a new rule
memory action=add rule="Always use TypeScript strict mode"

# Remove a rule by index
memory action=remove ruleId=0

# Show help
memory
```

## .agentrc Configuration

Create a `.agentrc` file in your project root:

```json
{
  "project": {
    "name": "my-awesome-project",
    "type": "typescript-react-app", 
    "description": "My project description"
  },
  "commands": {
    "build": "npm run build",
    "test": "npm test",
    "dev": "npm run dev",
    "lint": "eslint src/"
  },
  "rules": [
    "Follow existing code patterns",
    "Write tests for new features", 
    "Use semantic commit messages"
  ],
  "tools": {
    "packageManager": "npm",
    "formatter": "prettier"
  },
  "security": {
    "sensitiveFiles": ["*.env", "*.key"],
    "restrictedPaths": ["node_modules/**"]
  }
}
```

## Legacy File Support

The plugin automatically parses existing configuration files:

- **AGENTS.md** - OpenCode/kuuzuki agent configuration  
- **CLAUDE.md** - Claude-specific instructions
- **.cursorrules** - Cursor editor rules
- **.github/copilot-instructions.md** - GitHub Copilot instructions

## Example Output

When the plugin is active, you'll see:

```
┌─────────────────────────────────────────────────────────┐
│  🌸 kuuzuki compatibility layer active                 │
│  Bringing .agentrc support to OpenCode                 │
│                                                         │  
│  Project: my-awesome-project                            │
│  Type: typescript-react-app                             │
│  Rules: 5                                               │
└─────────────────────────────────────────────────────────┘

🌸 Kuuzuki session started with .agentrc support
[🌸 Kuuzuki] Using .agentrc test command: bun test
🌸 Command executed successfully
```

## Features in Detail

### Command Mapping
- Replaces `npm test` with your .agentrc test command
- Replaces `npm run build` with your .agentrc build command  
- Replaces lint commands with your .agentrc lint command
- Replaces `npm run dev` with your .agentrc dev command

### Security Features  
- Blocks access to .env files if configured
- Warns about restricted file modifications
- Enforces file access policies from .agentrc

### AI Enhancement
- Adds project context to all AI interactions
- Includes project type and conventions in metadata
- Provides project-aware assistance

## Troubleshooting

### Plugin not loading
- Ensure the file is in the correct location (`.opencode/plugin/` or `~/.config/opencode/plugin/`)
- Check that the file has proper permissions
- Verify OpenCode can access the plugin directory

### .agentrc not found
- Create a `.agentrc` file in your project root
- Use `memory action=list` to check if legacy configs were found
- Check the console for loading messages

### Commands not mapping
- Verify your .agentrc has the correct `commands` section
- Check console output for mapping messages
- Ensure command names match exactly

## Contributing

This plugin is part of the kuuzuki-plugins repository. Contributions welcome!

- 🐛 [Report issues](https://github.com/moikas-code/kuuzuki-plugins/issues)
- 💡 [Submit PRs](https://github.com/moikas-code/kuuzuki-plugins/pulls)
- 📖 [Main repository](https://github.com/moikas-code/kuuzuki-plugins)

## License

MIT - See [LICENSE](https://github.com/moikas-code/kuuzuki-plugins/blob/main/LICENSE) for details