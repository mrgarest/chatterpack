import { db } from "@/database";

/**
 * Get active commands from the database.
 * @param sendResponse
 * @returns.
 */
export const getActiveCommands = (sendResponse: (response?: any) => void) => {
  db.commands
    .filter((r) => r.enabled)
    .toArray()
    .then((commands) => sendResponse(commands))
    .catch((e) => {
      if (__DEBUG__) {
        console.error("[DB] (commands)", e);
      }
      sendResponse([]);
    });
  return true;
};

/**
 * Get active moderation rule from the database.
 * @param sendResponse
 * @returns.
 */
export const getActiveModerationRules = (
  sendResponse: (response?: any) => void,
) => {
  db.moderationRule
    .filter((r) => r.enabled)
    .toArray()
    .then((rules) => sendResponse(rules))
    .catch((e) => {
      if (__DEBUG__) {
        console.error("[DB] (moderationRule)", e);
      }
      sendResponse([]);
    });
  return true;
};

/**
 * Get active moderation rule from the database.
 * @param sendResponse
 * @returns.
 */
export const getActiveHighlight = (sendResponse: (response?: any) => void) => {
  db.highlights
    .filter((r) => r.enabled)
    .toArray()
    .then((rules) => sendResponse(rules))
    .catch((e) => {
      if (__DEBUG__) {
        console.error("[DB] (highlights)", e);
      }
      sendResponse([]);
    });
  return true;
};


