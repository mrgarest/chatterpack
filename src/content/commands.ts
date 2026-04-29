import {
  MessageSource,
  MessageType,
  RuntimeMessageType,
} from "@/enums/message";
import type { Comman } from "@/types/database";
import { postChatMessage } from "@/utils/chat";
import { initWithRetry } from "@/utils/database";

// Local command cache for instant access
let cachedCommands: Record<string, string> = {};

/**
 * Compiles a set of highlights from the database into an internal format using predefined RegExp.
 * @param commands - Highlights from the database
 */
const compile = (commands: Comman[]): Record<string, string> => {
  const cache: Record<string, string> = {};
  commands.forEach((cmd) => {
    if (cmd.trigger && cmd.command) {
      cache[cmd.trigger.trim()] = cmd.command;
    }
  });
  return cache;
};

/**
 * Initial data loading from the background script when the content script starts.
 * @param attempt
 */
const init = (attempt = 0) =>
  initWithRetry<Comman>(
    RuntimeMessageType.GET_ACTIVE_COMMANDS,
    (commands) => {
      cachedCommands = compile(commands);
    },
    "Highlight",
    attempt,
  );

/**
 * Refreshes the policy cache after saving data.
 * @param highlights - Highlights from the database
 */
const sync = (commands: Comman[]): void => {
  cachedCommands = compile(commands);
};

/**
 * Finds command triggers in the text and replaces them with the corresponding values from the cache.
 * @param text - Message text
 * @param execute
 */
const handleMessage = (text: string, execute: boolean) => {
  let result = text;
  let changed = false;

  // Iterating through the command dictionary
  for (const [cmd, replacement] of Object.entries(cachedCommands)) {
    const safeCmd = cmd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${safeCmd}(\\s|$)`, "g");

    if (regex.test(text)) {
      // Replace the trigger with a command, preserving the space after the trigger if it exists
      result = result.replace(regex, replacement + "$1");
      changed = true;
      break;
    }
  }

  if (!changed) {
    // Unblock the process if the command is not found
    window.postMessage(
      {
        source: MessageSource.EXTENSION,
        type: MessageType.COMMAND_NOT_FOUND,
        payload: { execute: execute },
      },
      "*",
    );
    return;
  }

  postChatMessage(result, execute);
};

export const commands = { init, sync, handleMessage };
