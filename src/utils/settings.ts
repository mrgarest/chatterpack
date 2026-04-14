// Default settings for the extension.
export const DEFAULT_SETTINGS = {
  highlightMyUsername: {
    enabled: true,
    color: "#1c9eff",
    sound: false,
  },
};

// A type representing the structure of the settings object, derived from the default settings.
export type Settings = typeof DEFAULT_SETTINGS;

/**
 * Retrieves user settings from Chrome's local storage, applying default values for any missing keys.
 * @returns A promise that resolves to the complete settings object.
 */
export const getSettings = async (): Promise<Settings> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (result) => {
      resolve(result as Settings);
    });
  });
};

/**
 * Creates a change handler that simultaneously updates React state and Chrome's local storage.
 * @param key - The settings key to update
 * @param setter - The React state setter function for the corresponding setting
 * @returns A function that can be used as an onChange handler for form inputs
 */
export const sync = <K extends keyof Settings>(
  key: K,
  setter: (value: Settings[K]) => void,
) => {
  return (newValue: Settings[K]) => {
    // Updating the UI (React state)
    setter(newValue);

    // Save to Chrome Storage
    chrome.storage.local.set({ [key]: newValue }, () => {
      if (chrome.runtime.lastError && __DEBUG__) {
        console.error(`Error saving ${key}:`, chrome.runtime.lastError);
      }
    });
  };
};

/**
 * A class for instant access to content script settings without using `await`.
 */
class SettingsCache {
  private cache: Settings = { ...DEFAULT_SETTINGS };

  constructor() {
    this.init();
  }

  private async init() {
    const res = await chrome.storage.local.get(DEFAULT_SETTINGS);
    this.cache = res as Settings;

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local") {
        for (const [key, change] of Object.entries(changes)) {
          if (key in this.cache) {
            (this.cache as any)[key] = change.newValue;
          }
        }
      }
    });
  }

  get<K extends keyof Settings>(key: K): Settings[K] {
    return this.cache[key];
  }
}

export const settingsCache = new SettingsCache();
