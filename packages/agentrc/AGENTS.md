# AGENTS.md - Development Guidelines

## Build/Test Commands
- Build: `npm run build` or `bun --bun build.js`
- Test: `npm test` (runs testtt/test-plugin.js)
- Single test: `node testtt/test-plugin.js` (direct test execution)
- Development: `npm run dev` (builds and symlinks for live development)
- Watch mode: `npm run build:watch` or `npm run dev:watch`
- Install globally: `npm run install-global`
- Install to project: `npm run install-project`

## Code Style
- **Imports**: Use ES6 imports with explicit file extensions (.js)
- **Format**: No semicolons, 2-space indentation, prefer const/let
- **Types**: Use JSDoc comments for type documentation (no TypeScript)
- **Naming**: Use camelCase for variables/functions, kebab-case for files
- **Comments**: Comprehensive JSDoc blocks for all exported functions
- **Error handling**: Use try/catch blocks with descriptive error messages

## Project Structure
- Entry point: `src/index.js` (exports KuuzukiAgentrcPlugin)
- Notifications: `src/notifications.js` (OS-level notification system)
- Build: `build.js` (custom bundler for OpenCode compatibility)
- Tests: `testtt/test-plugin.js` (mock OpenCode environment for testing)

## Plugin Development
- Follow OpenCode plugin API conventions
- Use .agentrc for configuration management
- Support both global and project-level configs
- Implement proper event handling for session lifecycle
- Always maintain backward compatibility with legacy config files

<!-- 🌸 This project also has .agentrc support via kuuzuki plugin -->