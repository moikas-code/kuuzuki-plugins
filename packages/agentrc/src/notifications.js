/**
 * OpenCode OS-Level Notification System for Kuuzuki
 * 
 * Provides cross-platform desktop notifications with proper Linux distribution support
 * including Arch Linux, Ubuntu, Fedora, and other distributions.
 */

/**
 * Detect Linux distribution for notification compatibility
 * @returns {string} Distribution identifier
 */
const detectLinuxDistro = async ($) => {
  try {
    // Check for common package managers silently
    if (await $`which pacman > /dev/null 2>&1`.then(() => true).catch(() => false)) {
      return 'arch';
    }
    if (await $`which apt > /dev/null 2>&1`.then(() => true).catch(() => false)) {
      return 'debian';
    }
    if (await $`which dnf > /dev/null 2>&1`.then(() => true).catch(() => false)) {
      return 'fedora';
    }
    if (await $`which zypper > /dev/null 2>&1`.then(() => true).catch(() => false)) {
      return 'opensuse';
    }
    return 'generic';
  } catch {
    return 'generic';
  }
};

/**
 * Check if notification dependencies are installed
 * @param {Function} $ - Shell execution function
 * @param {string} distro - Distribution identifier
 * @returns {Promise<boolean>} Whether dependencies are installed
 */
const checkNotificationDeps = async ($, distro) => {
  try {
    switch (distro) {
      case 'arch':
        // Check if libnotify is installed (suppress all output)
        await $`pacman -Qi libnotify > /dev/null 2>&1`;
        return true;
      case 'debian':
        // Check if libnotify-bin is installed
        await $`dpkg -l libnotify-bin > /dev/null 2>&1`;
        return true;
      case 'fedora':
        // Check if libnotify is installed
        await $`rpm -q libnotify > /dev/null 2>&1`;
        return true;
      case 'opensuse':
        // Check if libnotify-tools is installed
        await $`rpm -q libnotify-tools > /dev/null 2>&1`;
        return true;
      default:
        return false;
    }
  } catch {
    return false;
  }
};

/**
 * Install notification dependencies silently for Linux distributions
 * @param {Function} $ - Shell execution function
 * @param {string} distro - Distribution identifier
 */
const installNotificationDeps = async ($, distro) => {
  try {
    switch (distro) {
      case 'arch':
        // Install libnotify silently
        await $`sudo pacman -S --noconfirm --quiet libnotify > /dev/null 2>&1`;
        break;
      case 'debian':
        // Install libnotify-bin silently
        await $`sudo apt update -qq && sudo apt install -y -qq libnotify-bin > /dev/null 2>&1`;
        break;
      case 'fedora':
        // Install libnotify silently
        await $`sudo dnf install -y -q libnotify > /dev/null 2>&1`;
        break;
      case 'opensuse':
        // Install libnotify-tools silently
        await $`sudo zypper install -y --quiet libnotify-tools > /dev/null 2>&1`;
        break;
    }
  } catch (error) {
    // Silent failure - don't break the TUI
  }
};

/**
 * Create a notification system that uses OS-level notifications
 * @param {Object} context - Plugin context with shell execution
 * @returns {Object} Notification methods
 */
export const createNotifier = (context = {}) => {
  const { $ } = context;
  
  const notify = async (title, message, type = 'info') => {
    if (!$) {
      console.log(`[${title}] ${message}`);
      return;
    }

    try {
      const platform = process.platform;
      const escapedMessage = message.replace(/"/g, '\\"').replace(/'/g, "\\'");
      const escapedTitle = title.replace(/"/g, '\\"').replace(/'/g, "\\'");
      
      switch (platform) {
        case 'darwin': // macOS
          await $`osascript -e 'display notification "${escapedMessage}" with title "${escapedTitle}" subtitle "🌸 Kuuzuki"'`;
          break;
          
        case 'linux':
          // Try notify-send first (silently)
          try {
            await $`notify-send "${escapedTitle}" "${escapedMessage}" -i dialog-${type} -t 5000 -a "Kuuzuki" 2>/dev/null`;
            break;
          } catch {
            // Fall back to simpler notify-send
            try {
              await $`notify-send "${escapedTitle}" "${escapedMessage}" -t 5000 2>/dev/null`;
              break;
            } catch {
              // notify-send not available, check and install dependencies silently
              const distro = await detectLinuxDistro($);
              const depsInstalled = await checkNotificationDeps($, distro);
              
              if (!depsInstalled) {
                // Install dependencies silently
                await installNotificationDeps($, distro);
              }
              
              // Final retry (silently)
              try {
                await $`notify-send "${escapedTitle}" "${escapedMessage}" -t 5000 -a "Kuuzuki" 2>/dev/null`;
              } catch {
                // Silent failure - don't break TUI
              }
            }
          }
          break;
          
        case 'win32': // Windows
          try {
            await $`powershell -Command "New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}'"`;
          } catch {
            // Fallback to basic Windows notification
            await $`powershell -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('${escapedMessage}', '${escapedTitle}')"`;
          }
          break;
          
        default:
          console.log(`[${escapedTitle}] ${escapedMessage}`);
      }
    } catch (error) {
      console.log(`[${title}] ${message}`);
    }
  };
  
  return {
    info: (message) => notify('🌸 Kuuzuki', message, 'info'),
    success: (message) => notify('✅ Kuuzuki Success', message, 'success'),
    warning: (message) => notify('⚠️ Kuuzuki Warning', message, 'warning'),
    error: (message) => notify('❌ Kuuzuki Error', message, 'error'),
    config: (message) => notify('⚙️ Kuuzuki Config', message, 'info'),
    session: (message) => notify('🚀 Kuuzuki Session', message, 'info')
  };
};

/**
 * Test notification system
 * @param {Function} $ - Shell execution function
 * @returns {Promise<boolean>} Whether notifications are working
 */
export const testNotifications = async ($) => {
  try {
    const notifier = createNotifier({ $ });
    await notifier.info('Notification system test - this should appear as an OS notification');
    return true;
  } catch (error) {
    console.error('Notification test failed:', error);
    return false;
  }
};

/**
 * Get notification system status
 * @param {Function} $ - Shell execution function
 * @returns {Promise<Object>} System status
 */
export const getNotificationStatus = async ($) => {
  const platform = process.platform;
  const status = {
    platform,
    supported: false,
    method: 'none',
    dependencies: []
  };

  try {
    switch (platform) {
      case 'darwin':
        status.supported = true;
        status.method = 'osascript';
        break;
        
      case 'linux':
        const distro = await detectLinuxDistro($);
        status.distro = distro;
        
        // Check if notify-send is available
        const hasNotifySend = await $`which notify-send`.then(() => true).catch(() => false);
        if (hasNotifySend) {
          status.supported = true;
          status.method = 'notify-send';
        } else {
          status.method = 'notify-send (not installed)';
          status.dependencies = distro === 'arch' ? ['libnotify'] :
                              distro === 'debian' ? ['libnotify-bin'] :
                              distro === 'fedora' ? ['libnotify'] :
                              distro === 'opensuse' ? ['libnotify-tools'] :
                              ['libnotify'];
        }
        break;
        
      case 'win32':
        status.supported = true;
        status.method = 'powershell';
        break;
    }
  } catch (error) {
    status.error = error.message;
  }

  return status;
};

/**
 * Create a smart logger that respects notification preferences and uses OS notifications
 * @param {Object} context - Plugin context (app, client, $)
 * @param {Object} notificationConfig - Notification configuration from .agentrc
 * @returns {Object} Smart logging methods
 */
export const createSmartLogger = (context = {}, notificationConfig = {}) => {
  const {
    enabled = true,
    level = 'important', // 'all', 'important', 'errors-only', 'none'
    silent = false,
    mode = 'os' // 'os', 'console', 'both', 'none'
  } = notificationConfig;

  const notifier = createNotifier(context);
  
  // Determine if we should show notifications based on config
  const shouldNotify = (messageLevel) => {
    if (!enabled || level === 'none') return false;
    
    switch (level) {
      case 'all':
        return true;
      case 'important':
        return ['success', 'warning', 'error', 'config', 'session'].includes(messageLevel);
      case 'errors-only':
        return messageLevel === 'error';
      default:
        return false;
    }
  };

  const createLogger = (messageLevel, notificationMethod, consoleMethod = console.log) => {
    return async (message) => {
      // Handle console logging based on mode and silent setting
      if (!silent && (mode === 'console' || mode === 'both')) {
        consoleMethod(`[🌸 Kuuzuki] ${message}`);
      }
      
      // Send OS notification if enabled for this level
      if (shouldNotify(messageLevel) && (mode === 'os' || mode === 'both')) {
        await notificationMethod(message);
      }
    };
  };

  return {
    info: createLogger('info', notifier.info),
    success: createLogger('success', notifier.success),
    warning: createLogger('warning', notifier.warning),
    error: createLogger('error', notifier.error, console.error),
    config: createLogger('config', notifier.config),
    session: createLogger('session', notifier.session),
    
    // Raw notification methods (bypass config)
    notify: notifier,
    
    // Utility methods
    getConfig: () => ({ enabled, level, silent, mode }),
    isEnabled: () => enabled && level !== 'none',
    testNotifications: () => testNotifications(context.$),
    getStatus: () => getNotificationStatus(context.$)
  };
};