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
import { 
  createSmartLogger
} from "./notifications.js";

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
const loadAgentrcConfig = async (app, logger) => {
  const locations = [
    path.join(app.path.root, ".agentrc"),           // Project .agentrc
    path.join(app.path.config, ".agentrc"),        // Global .agentrc
    path.join(process.env.HOME, ".config", "kuuzuki", ".agentrc"), // Kuuzuki global
  ];

  for (const configPath of locations) {
    try {
      const content = await fs.readFile(configPath, "utf-8");
      const config = validateAgentrcConfig(JSON.parse(content));
      if (logger) {
        await logger.config(`Loaded .agentrc from ${configPath}`);
      }
      return { config, path: configPath };
    } catch (error) {
      // Continue to next location
      continue;
    }
  }

  if (logger) {
    await logger.info("No .agentrc found, using OpenCode defaults");
  }
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

  // Ensure all objects and arrays exist before spreading
  const safeAgentrcConfig = agentrcConfig || {};
  const safeLegacyConfig = legacyConfig || {};
  
  return {
    ...safeAgentrcConfig,
    commands: { 
      ...(safeLegacyConfig.commands || {}), 
      ...(safeAgentrcConfig.commands || {}) 
    },
    rules: [
      ...(Array.isArray(safeLegacyConfig.rules) ? safeLegacyConfig.rules : []), 
      ...(Array.isArray(safeAgentrcConfig.rules) ? safeAgentrcConfig.rules : [])
    ],
    project: { 
      ...(safeLegacyConfig.project || {}), 
      ...(safeAgentrcConfig.project || {}) 
    },
  };
};

/**
 * Analyze project structure and package.json to determine project type and tools
 */
const analyzeProject = async (projectPath) => {
  const analysis = {
    type: "opencode-project",
    language: "javascript",
    framework: null,
    packageManager: "npm",
    testFramework: null,
    buildTool: null,
    hasTypescript: false,
    commands: {},
    dependencies: [],
    devDependencies: []
  };

  try {
    // Read package.json if it exists
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
    
    analysis.type = "node-project";
    analysis.commands = packageJson.scripts || {};
    analysis.dependencies = Object.keys(packageJson.dependencies || {});
    analysis.devDependencies = Object.keys(packageJson.devDependencies || {});

    // Detect package manager (prefer Bun)
    if (await fs.access(path.join(projectPath, "bun.lockb")).then(() => true).catch(() => false)) {
      analysis.packageManager = "bun";
    } else if (await fs.access(path.join(projectPath, "yarn.lock")).then(() => true).catch(() => false)) {
      analysis.packageManager = "yarn";
    } else if (await fs.access(path.join(projectPath, "pnpm-lock.yaml")).then(() => true).catch(() => false)) {
      analysis.packageManager = "pnpm";
    } else {
      // Default to Bun for new projects (kuuzuki team preference)
      analysis.packageManager = "bun";
    }

    // Detect TypeScript
    if (analysis.dependencies.includes("typescript") || analysis.devDependencies.includes("typescript") ||
        await fs.access(path.join(projectPath, "tsconfig.json")).then(() => true).catch(() => false)) {
      analysis.hasTypescript = true;
      analysis.language = "typescript";
    }

    // Detect frameworks
    if (analysis.dependencies.includes("react") || analysis.devDependencies.includes("react")) {
      analysis.framework = "react";
      analysis.type = "react-project";
    } else if (analysis.dependencies.includes("vue") || analysis.devDependencies.includes("vue")) {
      analysis.framework = "vue";
      analysis.type = "vue-project";
    } else if (analysis.dependencies.includes("next") || analysis.devDependencies.includes("next")) {
      analysis.framework = "next";
      analysis.type = "nextjs-project";
    } else if (analysis.dependencies.includes("express") || analysis.devDependencies.includes("express")) {
      analysis.framework = "express";
      analysis.type = "express-project";
    }

    // Detect test frameworks
    if (analysis.dependencies.includes("jest") || analysis.devDependencies.includes("jest")) {
      analysis.testFramework = "jest";
    } else if (analysis.dependencies.includes("vitest") || analysis.devDependencies.includes("vitest")) {
      analysis.testFramework = "vitest";
    } else if (analysis.dependencies.includes("mocha") || analysis.devDependencies.includes("mocha")) {
      analysis.testFramework = "mocha";
    }

    // Detect build tools
    if (analysis.dependencies.includes("vite") || analysis.devDependencies.includes("vite")) {
      analysis.buildTool = "vite";
    } else if (analysis.dependencies.includes("webpack") || analysis.devDependencies.includes("webpack")) {
      analysis.buildTool = "webpack";
    }

  } catch (error) {
    // No package.json or other error, try to detect other project types
    try {
      if (await fs.access(path.join(projectPath, "Cargo.toml")).then(() => true).catch(() => false)) {
        analysis.type = "rust-project";
        analysis.language = "rust";
        analysis.packageManager = "cargo";
      } else if (await fs.access(path.join(projectPath, "go.mod")).then(() => true).catch(() => false)) {
        analysis.type = "go-project";
        analysis.language = "go";
        analysis.packageManager = "go";
      } else if (await fs.access(path.join(projectPath, "requirements.txt")).then(() => true).catch(() => false)) {
        analysis.type = "python-project";
        analysis.language = "python";
        analysis.packageManager = "pip";
      }
    } catch {
      // Default to generic project
    }
  }

  return analysis;
};

/**
 * Create project-specific .agentrc file based on codebase analysis
 */
const createDefaultAgentrc = async (projectPath, logger = null) => {
  const analysis = await analyzeProject(projectPath);
  const projectName = path.basename(projectPath);

  // Build project-specific commands
  const commands = {};
  if (analysis.commands.build) commands.build = `${analysis.packageManager} run build`;
  else if (analysis.type === "rust-project") commands.build = "cargo build";
  else if (analysis.type === "go-project") commands.build = "go build";
  else commands.build = `${analysis.packageManager} run build`;

  if (analysis.commands.test) commands.test = `${analysis.packageManager} test`;
  else if (analysis.type === "rust-project") commands.test = "cargo test";
  else if (analysis.type === "go-project") commands.test = "go test";
  else commands.test = `${analysis.packageManager} test`;

  if (analysis.commands.dev) commands.dev = `${analysis.packageManager} run dev`;
  if (analysis.commands.start) commands.start = `${analysis.packageManager} start`;
  if (analysis.commands.lint) commands.lint = `${analysis.packageManager} run lint`;
  if (analysis.commands["type-check"] || analysis.commands.typecheck) {
    commands.typecheck = `${analysis.packageManager} run ${analysis.commands.typecheck ? 'typecheck' : 'type-check'}`;
  }

  // Build project-specific rules with kuuzuki team preferences
  const rules = [
    "Always use JavaScript/Bun - avoid TypeScript unless absolutely necessary",
    "Use functional programming paradigms combined with OOP when appropriate", 
    "Apply DRY (Don't Repeat Yourself) methodology rigorously",
    "Use descriptive, functional names for variables, functions, and classes",
    "Follow existing code style and patterns"
  ];
  
  // Add framework-specific functional programming rules
  if (analysis.framework === "react") {
    rules.push("Prefer functional components with hooks over class components");
    rules.push("Use custom hooks to extract and reuse stateful logic");
    rules.push("Implement pure functions for data transformations");
  }
  
  // Add language-specific rules (favor JS over TS)
  if (analysis.hasTypescript) {
    rules.push("Consider migrating TypeScript to JavaScript + JSDoc for type documentation");
    rules.push("If TypeScript is required, use it minimally with focus on interfaces");
  } else {
    rules.push("Use JSDoc comments for type documentation instead of TypeScript");
  }
  
  // Testing with functional approach
  if (analysis.testFramework) {
    rules.push(`Write functional tests using ${analysis.testFramework} - test behavior, not implementation`);
  } else {
    rules.push("Write tests for new functionality using functional testing approaches");
  }

  // Additional functional/OOP hybrid rules
  rules.push("Prefer pure functions - avoid side effects where possible");
  rules.push("Use higher-order functions for code reuse and composition");
  rules.push("When using classes, keep them focused with single responsibility");
  rules.push("Favor composition over inheritance");
  rules.push("Use semantic commit messages");
  rules.push("Prefer async/await over Promise.then() for readable async code");

  // Build project configuration
  const config = {
    project: {
      name: projectName,
      type: analysis.type,
      description: `${analysis.framework ? analysis.framework.charAt(0).toUpperCase() + analysis.framework.slice(1) : "Project"} enhanced with kuuzuki .agentrc support`,
      language: analysis.language,
      framework: analysis.framework
    },
    commands,
    codeStyle: {
      language: "javascript", // Kuuzuki team prefers JS over TS
      paradigm: "functional-oop-hybrid",
      methodology: "DRY",
      naming: "functional-descriptive",
      runtime: "bun",
      ...(analysis.testFramework && { testing: analysis.testFramework }),
      ...(analysis.buildTool && { bundler: analysis.buildTool }),
      ...(analysis.hasTypescript && { 
        typescript: "discouraged", 
        alternative: "jsdoc" 
      })
    },
    rules,
    tools: {
      packageManager: analysis.packageManager,
      ...(analysis.testFramework && { testing: analysis.testFramework }),
      ...(analysis.buildTool && { bundler: analysis.buildTool })
    },
    dependencies: {
      critical: analysis.dependencies.slice(0, 5), // Top 5 dependencies
      ...(analysis.devDependencies.length > 0 && { dev: analysis.devDependencies.slice(0, 3) })
    },
    metadata: {
      version: "1.0.0",
      generator: "kuuzuki-opencode-plugin",
      created: new Date().toISOString(),
      analyzed: true
    }
  };

  const agentrcPath = path.join(projectPath, ".agentrc");
  await fs.writeFile(agentrcPath, JSON.stringify(config, null, 2));
  
  if (logger) {
    await logger.success(`Created ${analysis.type} .agentrc at ${agentrcPath}`);
  } else {
    console.log(`[🌸 Kuuzuki] Created ${analysis.type} .agentrc at ${agentrcPath}`);
  }
  return config;
};

/**
 * Display kuuzuki welcome banner
 */
const displayKuuzukiBanner = async (config, logger) => {
  const banner = `
┌─────────────────────────────────────────────────────────┐
│  🌸 kuuzuki compatibility layer active                 │
│  Bringing .agentrc support to OpenCode                 │
│                                                         │
│  Project: ${(config?.project?.name || 'Unknown').padEnd(42)} │
│  Type: ${(config?.project?.type || 'Not specified').padEnd(45)} │
│  Rules: ${String(config?.rules?.length || 0).padEnd(44)} │
└─────────────────────────────────────────────────────────┘`;
  
  if (logger) {
    await logger.info(banner);
  }
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
        // Note: logger not available in this context, using console.log as fallback
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
        // Note: logger not available in this context, using console.log as fallback
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
  try {
    // Create a basic logger for initialization with silent mode
    const pluginContext = { app, client, $ };
    const basicLogger = createSmartLogger(pluginContext, { 
      mode: 'in-app', 
      silent: true, 
      level: 'important' 
    });
    
    await basicLogger.session("🌸 Kuuzuki .agentrc plugin initializing...");
    
    // Load configuration
    let { config: agentrcConfig, path: configPath } = await loadAgentrcConfig(app, basicLogger);
    
    // Create smart logger with notification preferences
    const notificationConfig = agentrcConfig?.notifications || { mode: 'os', silent: true };
    const logger = createSmartLogger(pluginContext, notificationConfig);
    
    // Load legacy configs with error handling
    const legacyConfig = await loadLegacyConfigs(app);
    
    // Merge configs with error handling
    const mergedConfig = mergeConfigs(agentrcConfig, legacyConfig);
    
    // Use merged config
    agentrcConfig = mergedConfig;
  
  // Display welcome banner
  if (agentrcConfig) {
    await displayKuuzukiBanner(agentrcConfig, logger);
  }

  return {
    /**
     * Register custom commands
     */
    commands: {
      init: async () => {
        await logger.info("🌸 Kuuzuki initializing project with .agentrc...");
        
        // Check if .agentrc already exists
        const agentrcPath = path.join(app.path.root, ".agentrc");
        try {
          await fs.access(agentrcPath);
          return {
            title: "🌸 Kuuzuki Project Already Initialized",
            output: ".agentrc file already exists in this project"
          };
        } catch {
          // File doesn't exist, create it
        }
        
        const config = await createDefaultAgentrc(app.path.root, logger);
        
        return {
          title: "🌸 Kuuzuki Project Initialized",
          output: `Created .agentrc configuration for "${config.project.name}"\n\nNext steps:\n- Edit .agentrc to customize project settings\n- Use 'memory action=list' to view configuration\n- Use 'memory action=add rule="Your rule"' to add project rules`
        };
      },

    },

    /**
     * Handle system events
     */
    event: async ({ event }) => {
      switch (event.type) {
        case "session.start":
          await logger.session("Session started with .agentrc support");
          if (!agentrcConfig && !configPath) {
            await logger.info("No .agentrc found. Use 'kuuzuki init' or 'memory action=init' to create one");
            
            // Auto-suggest creating .agentrc if this looks like a new project
            try {
              const packageJsonPath = path.join(app.path.root, "package.json");
              await fs.access(packageJsonPath);
              const agentrcPath = path.join(app.path.root, ".agentrc");
              try {
                await fs.access(agentrcPath);
              } catch {
                await logger.info("💡 Detected Node.js project without .agentrc. Consider running 'kuuzuki init'");
              }
            } catch {
              // No package.json, probably not a Node project
            }
          }
          break;

        case "file.changed":
          // Reload config when .agentrc changes
          if (event.data?.path?.endsWith(".agentrc")) {
            await logger.config(".agentrc file changed, reloading...");
            const { config: newConfig, path: newPath } = await loadAgentrcConfig(app, logger);
            agentrcConfig = newConfig;
            configPath = newPath;
            if (agentrcConfig) {
              await displayKuuzukiBanner(agentrcConfig, logger);
            }
          }
          break;

        case "session.end":
          await logger.session("Thank you for using kuuzuki .agentrc support!");
          break;
      }
    },

    /**
     * Modify tool execution based on .agentrc commands and settings
     */
    "tool.execute.before": async (input, output) => {


      // Intercept AGENTS.md creation from /init command
      if (input.tool === "write" && output.args.filePath?.endsWith("AGENTS.md")) {
        await logger.info("🌸 Kuuzuki intercepting AGENTS.md creation, creating .agentrc instead...");
        
        // Check if .agentrc already exists
        const agentrcPath = path.join(app.path.root, ".agentrc");
        try {
          await fs.access(agentrcPath);
          await logger.info(".agentrc already exists, keeping both files");
        } catch {
          // Create .agentrc instead/alongside
          const config = await createDefaultAgentrc(app.path.root, logger);
        }
        
        // Let the original AGENTS.md creation proceed but add kuuzuki note
        output.args.content = `${output.args.content}\n\n<!-- 🌸 This project also has .agentrc support via kuuzuki plugin -->`;
        return;
      }

      // Handle /init command override (keeping for bash-based init commands)
      if (input.tool === "bash" && output.args.command === "/init") {
        await logger.info("🌸 Kuuzuki intercepting /init command...");
        
        // Check if .agentrc already exists
        const agentrcPath = path.join(app.path.root, ".agentrc");
        try {
          await fs.access(agentrcPath);
          output.args = { __kuuzuki_init_result: { 
            title: "🌸 Kuuzuki Project Already Initialized",
            output: ".agentrc file already exists in this project"
          }};
          return;
        } catch {
          // File doesn't exist, create it
        }
        
        const config = await createDefaultAgentrc(app.path.root, logger);
        
        output.args = { __kuuzuki_init_result: { 
          title: "🌸 Kuuzuki Project Initialized",
          output: `Created .agentrc configuration for "${config.project.name}"\n\nNext steps:\n- Edit .agentrc to customize project settings\n- Use 'memory action=list' to view configuration\n- Use 'memory action=add rule="Your rule"' to add project rules`
        }};
        return;
      }

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

        // Log what memory action is being performed
        const { action, rule, ruleId } = args;
        if (action === "list") {
          await logger.info("📋 Listing project configuration from .agentrc");
        } else if (action === "add" && rule) {
          await logger.info(`➕ Adding rule: "${rule}"`);
        } else if (action === "remove" && ruleId !== undefined) {
          await logger.info(`🗑️ Removing rule at index ${ruleId}`);
        }

        // Handle memory command
        try {
          const result = await handleMemoryCommand(args, agentrcConfig, configPath);
          
          // Success notifications
          if (action === "add" && rule) {
            await logger.success(`✅ Rule added to .agentrc: "${rule}"`);
          } else if (action === "remove" && ruleId !== undefined) {
            await logger.success(`✅ Rule removed from .agentrc`);
          }
          
          output.args = { __kuuzuki_memory_result: result };
          return;
        } catch (error) {
          await logger.error(`❌ Memory command failed: ${error.message}`);
          throw error;
        }
      }

      // Command mapping from .agentrc
      if (input.tool === "bash" && agentrcConfig?.commands) {
        const command = output.args.command;
        
        // Map common commands to .agentrc equivalents
        if (command === "npm test" && agentrcConfig.commands.test) {
          output.args.command = agentrcConfig.commands.test;
          await logger.success(`Command remapped: '${command}' → '${agentrcConfig.commands.test}'`);
        }
        
        if (command === "npm run build" && agentrcConfig.commands.build) {
          output.args.command = agentrcConfig.commands.build;
          await logger.success(`Command remapped: '${command}' → '${agentrcConfig.commands.build}'`);
        }

        if (command.includes("lint") && agentrcConfig.commands.lint) {
          output.args.command = agentrcConfig.commands.lint;
          await logger.success(`Command remapped: '${command}' → '${agentrcConfig.commands.lint}'`);
        }

        if (command === "npm run dev" && agentrcConfig.commands.dev) {
          output.args.command = agentrcConfig.commands.dev;
          await logger.success(`Command remapped: '${command}' → '${agentrcConfig.commands.dev}'`);
        }
        
        if (command === "npm run build" && agentrcConfig.commands.build) {
          output.args.command = agentrcConfig.commands.build;
          await logger.config(`Using .agentrc build command: ${agentrcConfig.commands.build}`);
        }

        if (command.includes("lint") && agentrcConfig.commands.lint) {
          output.args.command = agentrcConfig.commands.lint;
          await logger.config(`Using .agentrc lint command: ${agentrcConfig.commands.lint}`);
        }

        if (command === "npm run dev" && agentrcConfig.commands.dev) {
          output.args.command = agentrcConfig.commands.dev;
          await logger.config(`Using .agentrc dev command: ${agentrcConfig.commands.dev}`);
        }
      }

      // Security rules enforcement
      if (input.tool === "read" && output.args.filePath?.includes(".env")) {
        if (agentrcConfig?.security?.sensitiveFiles?.includes("*.env") ||
            agentrcConfig?.rules?.some(rule => rule.toLowerCase().includes("protect .env"))) {
          await logger.error(`🚨 Access denied: .env file reading blocked by .agentrc security rules`);
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
            await logger.warning(`⚠️ Modifying restricted path: ${filePath}`);
          }
        }
      }
    },

    /**
     * Enhance tool outputs with project context and kuuzuki metadata
     */
     "tool.execute.after": async (input, output) => {
       // Handle init command results
       if (output.args?.__kuuzuki_init_result) {
         const result = output.args.__kuuzuki_init_result;
         output.title = result.title;
         output.output = result.output;
         delete output.args.__kuuzuki_init_result;
         return;
       }

       // Handle memory tool results
       if (output.args?.__kuuzuki_memory_result) {
         const result = output.args.__kuuzuki_memory_result;
         output.title = result.title;
         output.output = result.output;
         delete output.args.__kuuzuki_memory_result;
         return;
       }



        // OS notifications are handled directly by the logger, no need for tool output modification

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
  } catch (error) {
    console.error('[🌸 Kuuzuki] Plugin initialization error:', error.message);
    console.error('[🌸 Kuuzuki] Stack:', error.stack);
    throw error;
  }
};