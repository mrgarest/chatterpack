import type { RuntimeMessageType } from "@/enums/message";

// The maximum number of attempts before rejecting the Promise
const MAX_RETRY_ATTEMPTS: number = 5;

// Base delay
const BASE_RETRY_DELAY_MS: number = 1000;

/**
 * A versatile utility for loading data from a background script for the initial initialization of modules.
 *
 * @param messageType - Message type
 * @param onSuccess - A callback that receives data and writes it to the module's cache
 * @param label - Module name for logging
 * @param attempt - Поточна спроба
 */
export const initWithRetry = <T>(
  messageType: RuntimeMessageType,
  onSuccess: (data: T[]) => void,
  label: string,
  attempt = 0,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: messageType }, (data: T[]) => {
      if (chrome.runtime.lastError) {
        if (attempt >= MAX_RETRY_ATTEMPTS) {
          if (__DEBUG__)
            console.error(
              `[${label}] Sync failed:`,
              chrome.runtime.lastError.message,
            );
          reject(chrome.runtime.lastError);
          return;
        }

        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        if (__DEBUG__)
          console.warn(
            `[${label}] Retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS} in ${delay}ms`,
          );
        setTimeout(
          () =>
            initWithRetry(messageType, onSuccess, label, attempt + 1).then(
              resolve,
              reject,
            ),
          delay,
        );
        return;
      }

      if (Array.isArray(data)) onSuccess(data);
      if (__DEBUG__) console.log(`[${label}] Synced`);
      resolve();
    });
  });
};
