/**
 * Kuuzuki .agentrc Plugin for OpenCode
 * 
 * This plugin brings kuuzuki's .agentrc functionality to OpenCode, providing:
 * - Project configuration management
 * - Command mapping from .agentrc
 * - Security rules enforcement
 * - Project-aware AI behavior
 * - Kuuzuki branding and experience
 */

import path from "path";
import fs from "fs/promises";

/**
 * Simple .agentrc schema validation (without zod dependency)
 */
const validateAgentrcConfig = (config) => {
  if (typeof config !== 'object' || config === null) {
    throw new Error('Invalid .agentrc: must be an object');
  }
  return config; // Basic validation, can be enhanced
};

/**
 * Load .agentrc configuration from project or global location
 */
const loadAgentrcConfig = async (app) => {
  const locations = [
    path.join(app.path.root, ".agentrc"),           // Project .agentrc
    path.join(app.path.config, ".agentrc"),        // Global .agentrc
    path.join(process.env.HOME, ".config", "kuuzuki", ".agentrc"), // Kuuzuki global
  ];

  for (const configPath of locations) {
    try {
      const content = await fs.readFile(configPath, "utf-8");
      const config = validateAgentrcConfig(JSON.parse(content));
      console.log(`[🌸 Kuuzuki] Loaded .agentrc from ${configPath}`);
      return { config, path: configPath };
    } catch (error) {
      // Continue to next location
      continue;
    }
  }

  console.log("[🌸 Kuuzuki] No .agentrc found, using OpenCode defaults");
  return { config: null, path: null };
};

/**
 * Load legacy configuration files (AGENTS.md, CLAUDE.md, etc.)
 */
const loadLegacyConfigs = async (app) => {
  const legacyFiles = [
    { path: path.join(app.path.root, "AGENTS.md"), type: "agents" },
    { path: path.join(app.path.root, "CLAUDE.md"), type: "claude" },
    { path: path.join(app.path.root, ".cursorrules"), type: "cursor" },
    { path: path.join(app.path.root, ".github", "copilot-instructions.md"), type: "copilot" },
  ];

  const legacyConfig = {
    rules: [],
    commands: {},
    project: {},
  };

  for (const { path: filePath, type } of legacyFiles) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      console.log(`[🌸 Kuuzuki] Found legacy config: ${path.basename(filePath)}`);
      
      // Basic parsing of legacy files (can be enhanced)
      if (type === "agents" || type === "claude") {
        // Extract commands and rules from markdown
        const lines = content.split('\n');
        lines.forEach(line => {
          if (line.startsWith('- ') && line.includes(':')) {
            legacyConfig.rules.push(line.substring(2));
          }
          if (line.includes('`npm ') || line.includes('`bun ') || line.includes('`yarn ')) {
            // Extract commands (basic implementation)
            const match = line.match(/`([^`]+)`/);
            if (match) {
              const cmd = match[1];
              if (cmd.includes('test')) legacyConfig.commands.test = cmd;
              if (cmd.includes('build')) legacyConfig.commands.build = cmd;
              if (cmd.includes('lint')) legacyConfig.commands.lint = cmd;
            }
          }
        });
      }
    } catch (error) {
      // File doesn't exist, continue
      continue;
    }
  }

  return legacyConfig.rules.length > 0 || Object.keys(legacyConfig.commands).length > 0 ? legacyConfig : null;
};

/**
 * Merge .agentrc config with legacy configs
 */
const mergeConfigs = (agentrcConfig, legacyConfig) => {
  if (!agentrcConfig && !legacyConfig) return null;
  if (!agentrcConfig) return legacyConfig;
  if (!legacyConfig) return agentrcConfig;

  return {
    ...agentrcConfig,
    commands: { ...legacyConfig.commands, ...agentrcConfig.commands },
    rules: [...(legacyConfig.rules || []), ...(agentrcConfig.rules || [])],
    project: { ...legacyConfig.project, ...agentrcConfig.project },
  };
};

/**
 * Create default .agentrc file for a project
 */
const createDefaultAgentrc = async (projectPath) => {
  const defaultConfig = {
    project: {
      name: path.basename(projectPath),
      type: "opencode-project",
      description: "Project enhanced with kuuzuki .agentrc support"
    },
    commands: {
      build: "npm run build",
      test: "npm test", 
      dev: "npm run dev",
      lint: "npm run lint"
    },
    rules: [
      "Follow existing code style and patterns",
      "Write tests for new functionality",
      "Use semantic commit messages"
    ],
    tools: {
      packageManager: "npm"
    },
    metadata: {
      version: "1.0.0",
      generator: "kuuzuki-opencode-plugin",
      created: new Date().toISOString()
    }
  };

  const agentrcPath = path.join(projectPath, ".agentrc");
  await fs.writeFile(agentrcPath, JSON.stringify(defaultConfig, null, 2));
  console.log(`[🌸 Kuuzuki] Created default .agentrc at ${agentrcPath}`);
  return defaultConfig;
};

/**
 * Display kuuzuki welcome banner
 */
const displayKuuzukiBanner = (config) => {
  const banner = `
┌─────────────────────────────────────────────────────────┐
│  🌸 kuuzuki compatibility layer active                 │
│  Bringing .agentrc support to OpenCode                 │
│                                                         │
│  Project: ${(config?.project?.name || 'Unknown').padEnd(42)} │
│  Type: ${(config?.project?.type || 'Not specified').padEnd(45)} │
│  Rules: ${String(config?.rules?.length || 0).padEnd(44)} │
└─────────────────────────────────────────────────────────┘`;
  
  console.log(banner);
};

/**
 * Handle memory/rules management commands
 */
const handleMemoryCommand = async (args, config, configPath) => {
  const { action, rule, ruleId } = args;

  switch (action) {
    case "list":
      return {
        title: "📋 Project Rules",
        output: JSON.stringify({
          rules: config?.rules || [],
          commands: config?.commands || {},
          project: config?.project || {}
        }, null, 2)
      };

    case "add":
      if (!rule) throw new Error("Rule text required");
      if (!config) throw new Error("No .agentrc config found");
      
      config.rules = config.rules || [];
      config.rules.push(rule);
      
      if (configPath) {
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        console.log("[🌸 Kuuzuki] Added rule to .agentrc");
      }
      
      return {
        title: "✅ Rule Added",
        output: `Added rule: ${rule}`
      };

    case "remove":
      if (ruleId === undefined) throw new Error("Rule ID required");
      if (!config?.rules) throw new Error("No rules found");
      
      const removedRule = config.rules[ruleId];
      config.rules.splice(ruleId, 1);
      
      if (configPath) {
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        console.log("[🌸 Kuuzuki] Removed rule from .agentrc");
      }
      
      return {
        title: "🗑️ Rule Removed", 
        output: `Removed rule: ${removedRule}`
      };

    default:
      return {
        title: "🌸 Kuuzuki Memory Tool",
        output: "Available actions: list, add, remove\nUsage: memory action=list | memory action=add rule='Your rule' | memory action=remove ruleId=0"
      };
  }
};

/**
 * Main Kuuzuki Plugin for OpenCode
 */
export const KuuzukiAgentrcPlugin = async ({ app, client, $ }) => {
  console.log("🌸 Kuuzuki .agentrc plugin initializing...");
  
  // Load configuration
  let { config: agentrcConfig, path: configPath } = await loadAgentrcConfig(app);
  const legacyConfig = await loadLegacyConfigs(app);
  const mergedConfig = mergeConfigs(agentrcConfig, legacyConfig);
  
  // Use merged config
  agentrcConfig = mergedConfig;
  
  // Display welcome banner
  if (agentrcConfig) {
    displayKuuzukiBanner(agentrcConfig);
  }

  return {
    /**
     * Handle system events
     */
    event: async ({ event }) => {
      switch (event.type) {
        case "session.start":
          console.log("🌸 Kuuzuki session started with .agentrc support");
          if (!agentrcConfig && !configPath) {
            console.log("[🌸 Kuuzuki] No .agentrc found. Use 'memory action=init' to create one");
          }
          break;

        case "file.changed":
          // Reload config when .agentrc changes
          if (event.data?.path?.endsWith(".agentrc")) {
            console.log("[🌸 Kuuzuki] .agentrc file changed, reloading...");
            const { config: newConfig, path: newPath } = await loadAgentrcConfig(app);
            agentrcConfig = newConfig;
            configPath = newPath;
            if (agentrcConfig) {
              displayKuuzukiBanner(agentrcConfig);
            }
          }
          break;

        case "session.end":
          console.log("🌸 Thank you for using kuuzuki .agentrc support!");
          break;
      }
    },

    /**
     * Modify tool execution based on .agentrc commands and settings
     */
    "tool.execute.before": async (input, output) => {
      // Handle memory tool commands
      if (input.tool === "memory" || 
          (input.tool === "bash" && output.args.command?.startsWith("memory "))) {
        
        // Parse memory command arguments
        let args = {};
        if (input.tool === "memory") {
          args = output.args;
        } else {
          // Parse from bash command: "memory action=list"
          const cmd = output.args.command.replace("memory ", "");
          const parts = cmd.split(" ");
          parts.forEach(part => {
            const [key, value] = part.split("=");
            if (key && value) {
              args[key] = value.replace(/['"]/g, ""); // Remove quotes
            }
          });
        }

        // Handle memory command
        try {
          const result = await handleMemoryCommand(args, agentrcConfig, configPath);
          output.args = { __kuuzuki_memory_result: result };
          return;
        } catch (error) {
          console.error("[🌸 Kuuzuki] Memory command error:", error.message);
          throw error;
        }
      }

      // Command mapping from .agentrc
      if (input.tool === "bash" && agentrcConfig?.commands) {
        const command = output.args.command;
        
        // Map common commands to .agentrc equivalents
        if (command === "npm test" && agentrcConfig.commands.test) {
          output.args.command = agentrcConfig.commands.test;
          console.log(`[🌸 Kuuzuki] Using .agentrc test command: ${agentrcConfig.commands.test}`);
        }
        
        if (command === "npm run build" && agentrcConfig.commands.build) {
          output.args.command = agentrcConfig.commands.build;
          console.log(`[🌸 Kuuzuki] Using .agentrc build command: ${agentrcConfig.commands.build}`);
        }

        if (command.includes("lint") && agentrcConfig.commands.lint) {
          output.args.command = agentrcConfig.commands.lint;
          console.log(`[🌸 Kuuzuki] Using .agentrc lint command: ${agentrcConfig.commands.lint}`);
        }

        if (command === "npm run dev" && agentrcConfig.commands.dev) {
          output.args.command = agentrcConfig.commands.dev;
          console.log(`[🌸 Kuuzuki] Using .agentrc dev command: ${agentrcConfig.commands.dev}`);
        }
      }

      // Security rules enforcement
      if (input.tool === "read" && output.args.filePath?.includes(".env")) {
        if (agentrcConfig?.security?.sensitiveFiles?.includes("*.env") ||
            agentrcConfig?.rules?.some(rule => rule.toLowerCase().includes("protect .env"))) {
          throw new Error("[🌸 Kuuzuki] .env file access blocked by .agentrc security rules");
        }
      }

      // File operation restrictions
      if (input.tool === "write" || input.tool === "edit") {
        const filePath = output.args.filePath;
        if (filePath && agentrcConfig?.security?.restrictedPaths) {
          const isRestricted = agentrcConfig.security.restrictedPaths.some(pattern => 
            filePath.includes(pattern.replace("*", ""))
          );
          if (isRestricted) {
            console.warn(`[🌸 Kuuzuki] Warning: Modifying restricted file ${filePath}`);
          }
        }
      }
    },

    /**
     * Enhance tool outputs with project context and kuuzuki metadata
     */
    "tool.execute.after": async (input, output) => {
      // Handle memory tool results
      if (output.args?.__kuuzuki_memory_result) {
        const result = output.args.__kuuzuki_memory_result;
        output.title = result.title;
        output.output = result.output;
        delete output.args.__kuuzuki_memory_result;
        return;
      }

      // Add project context to all tool outputs
      if (agentrcConfig) {
        output.metadata = {
          ...output.metadata,
          kuuzuki: {
            project: agentrcConfig.project?.name,
            projectType: agentrcConfig.project?.type,
            hasAgentrc: true,
            rulesCount: agentrcConfig.rules?.length || 0,
          }
        };
      }

      // Enhance file read outputs with project context
      if (input.tool === "read" && agentrcConfig) {
        const conventions = agentrcConfig.conventions;
        const tools = agentrcConfig.tools;
        
        if (conventions || tools) {
          output.output += `\n\n<!-- 🌸 Kuuzuki Project Context -->`;
          if (conventions) {
            output.output += `\n<!-- Naming: ${conventions.fileNaming || 'not specified'} -->`;
          }
          if (tools?.packageManager) {
            output.output += `\n<!-- Package Manager: ${tools.packageManager} -->`;
          }
        }
      }

      // Add kuuzuki branding to certain outputs
      if (input.tool === "bash" && output.title) {
        output.title = `🌸 ${output.title}`;
      }
    },
  };
};