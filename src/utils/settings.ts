import type { Settings } from "@/types/settings";

// Default settings for the extension.
export const DEFAULT_SETTINGS: Settings = {
  highlightMyUsername: {
    enabled: true,
    color: "#1c9eff",
    sound: false,
  },
};

/**
 * Extension Settings Manager.
 * Provides synchronous access to the cache, asynchronous loading, updates, and change subscriptions.
 */
class SettingsManager {
  private cache: Settings = { ...DEFAULT_SETTINGS };
  private listeners: Partial<{
    [K in keyof Settings]: ((key: K, newValue: Settings[K]) => void)[];
  }> = {};

  constructor() {
    this.init();
  }

  private async init() {
    const res = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    this.cache = { ...DEFAULT_SETTINGS, ...res } as unknown as Settings;

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local") {
        for (const [key, change] of Object.entries(changes)) {
          if (key in this.cache) {
            (this.cache as any)[key] = change.newValue;

            const keyListeners = this.listeners[key as keyof Settings];
            if (keyListeners) {
              for (const listener of keyListeners) {
                (listener as (key: unknown, value: unknown) => void)(
                  key,
                  change.newValue,
                );
              }
            }
          }
        }
      }
    });
  }

  /**
   * Retrieves the current setting value from the cache (synchronously).
   */
  get<K extends keyof Settings>(key: K): Settings[K] {
    return this.cache[key];
  }

  /**
   * Loads all settings from `chrome.storage.local` with their default values.
   */
  async getAll(): Promise<Settings> {
    return new Promise((resolve) => {
      chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (result) => {
        resolve({ ...DEFAULT_SETTINGS, ...result } as unknown as Settings);
      });
    });
  }

  /**
   * Sets one or more settings.
   */
  async set(values: Partial<Settings>): Promise<void> {
    await chrome.storage.local.set(values);
  }

  /**
   * Creates a handler to synchronize React state with chrome.storage.
   * Used in the UI for two-way communication.
   */
  sync<K extends keyof Settings>(key: K, setter: (value: Settings[K]) => void) {
    return (newValue: Settings[K]) => {
      setter(newValue);
      chrome.storage.local.set({ [key]: newValue }, () => {
        if (chrome.runtime.lastError && __DEBUG__) {
          console.error(`Error saving ${key}:`, chrome.runtime.lastError);
        }
      });
    };
  }

  /**
   * Subscribes to changes to one or more settings.
   * @returns Unsubscribe function
   */
  onChange<K extends keyof Settings>(
    keys: K | K[],
    listener: (key: K, newValue: Settings[K]) => void,
  ): () => void {
    const keysArray = Array.isArray(keys) ? keys : [keys];

    for (const key of keysArray) {
      if (!this.listeners[key]) {
        this.listeners[key] = [];
      }
      this.listeners[key]!.push(
        listener as (key: K, value: Settings[K]) => void,
      );
    }

    return () => {
      for (const key of keysArray) {
        this.listeners[key] = this.listeners[key]!.filter(
          (l) => l !== listener,
        ) as (typeof this.listeners)[K];
      }
    };
  }
}

export const settings = new SettingsManager();
