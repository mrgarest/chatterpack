import {
  CommandAccess,
  CommandReplyType,
  CommandScope,
} from "@/enums/database";
import {
  MessageSource,
  MessageType,
  RuntimeMessageType,
} from "@/enums/message";
import type { Command } from "@/types/database";
import { postChatMessage } from "@/utils/chat";
import { initWithRetry } from "@/utils/database";

// Local command cache for instant access
let cachedCommands: Command[] = [];

/**
 * Compiles a set of highlights from the database into an internal format using predefined RegExp.
 * @param commands - Highlights from the database
 */
const compile = (commands: Command[]): Command[] =>
  commands.filter((cmd) => cmd.trigger && cmd.command);

/**
 * Initial data loading from the background script when the content script starts.
 * @param attempt
 */
const init = (attempt = 0) =>
  initWithRetry<Command>(
    RuntimeMessageType.GET_ACTIVE_COMMANDS,
    (commands) => {
      cachedCommands = compile(commands);
    },
    "Commands",
    attempt,
  );

/**
 * Refreshes the policy cache after saving data.
 * @param highlights - Highlights from the database
 */
const sync = (commands: Command[]): void => {
  cachedCommands = compile(commands);
};

/**
 * Finds command triggers in the text and replaces them with the corresponding values from the cache.
 * @param text - Message text
 * @param execute
 */
const handleChatMessage = (text: string, execute: boolean) => {
  const trimmed = text.trim();

  for (const cmd of cachedCommands) {
    const trigger = cmd.trigger.trim();
    if (trimmed !== trigger && !trimmed.startsWith(trigger + " ")) continue;

    // Send the command
    postChatMessage(cmd.command, execute);
    return;
  }

  // Command not found
  window.postMessage(
    {
      source: MessageSource.EXTENSION,
      type: MessageType.COMMAND_NOT_FOUND,
      payload: { execute },
    },
    "*",
  );
};

/**
 * Finds command triggers in the text and executes the corresponding command.
 * @param username - The username of who triggered the command
 * @param text - Message text
 * @param channel - Current channel name
 * @param myUsername - The extension owner's username
 */
const handle = (
  username: string,
  text: string,
  channel: string,
  myUsername: string,
) => {
  const trimmed = text.trim();

  for (const cmd of cachedCommands) {
    const trigger = cmd.trigger.trim();

    if (trimmed !== trigger && !trimmed.startsWith(trigger + " ")) continue;

    // Check scope
    if (cmd.scope === CommandScope.CHANNEL) {
      if (cmd.scopeChannel?.toLowerCase() !== channel.toLowerCase()) continue;
    }

    // Check access
    if (cmd.access === CommandAccess.ME) {
      if (username.toLowerCase() !== myUsername.toLowerCase()) return;
    }

    // Send the command
    postChatMessage(
      cmd.replyType === CommandReplyType.MENTION
        ? `@${username} ${cmd.command}`
        : cmd.command,
    );
    return;
  }
};

export const commands = { init, sync, handleChatMessage, handle };
