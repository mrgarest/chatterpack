import { domChatObserver } from "@/lib/chat-observer.ts";
import { getId, getMessage, getUsername, isMod } from "@/utils/irc";
import { MessageActionType, messageSyncQueue } from "@/lib/message-sync-queue";
import { playPingSound } from "@/utils/sound";
import { moderationRules } from "./moderation-rules";
import { hexToRgba } from "@/utils/color";
import { ModerationAction } from "@/enums/database";
import { postChatMessage } from "@/utils/chat";
import { highlights } from "./highlights";
import type { ChatController } from "@/interfaces/chat-controller";
import { settingsCache } from "@/utils/settings";

// The default highlight color if the rule does not specify one.
const DEFAULT_HIGHLIGHT_COLOR: string = "#a4a4a4";

let chatController: ChatController | null = null;

/**
 * Initializes DOM observation for the chat and attaches the synchronization queue.
 * @returns Call during script removal
 */
const initDomObserver = () => {
  domChatObserver.use((msg) => {
    if (__DEBUG__) {
      console.log(`[DOM chat] ${msg.platform} | ${msg.username}: ${msg.text}`);
    }

    // Searching for the relevant IRC message
    const matchedIrc = messageSyncQueue.findAndRemove(msg.username, msg.text);
    if (!matchedIrc?.action) return;

    switch (matchedIrc.action.type) {
      case MessageActionType.HIGHLIGHT:
        const color = matchedIrc.action.color ?? DEFAULT_HIGHLIGHT_COLOR;
        msg.container.style.setProperty(
          "--chatterpack-highlight-color",
          hexToRgba(color, 0.8),
        );
        msg.container.style.setProperty(
          "--chatterpack-highlight-bg",
          hexToRgba(color, 0.32),
        );
        msg.container.classList.add("chatterpack-highlight-msg");
        if (matchedIrc.action.blink) {
          msg.container.classList.add("chatterpack-highlight-blink");
        }
        break;
      default:
        break;
    }
  });

  messageSyncQueue.start();
  domChatObserver.start();

  return () => {
    domChatObserver.stop();
    messageSyncQueue.stop();
  };
};

/**
 * Processes IRC PRIVMSG messages and adds them to the queue if a rule is triggered.
 * @param irc - IRC text
 */
const handleMessage = (irc: string) => {
  const username = getUsername(irc);
  const message = getMessage(irc);

  if (!username || !message) return;

  // Moderation Rules
  const rule = moderationRules.check(message);
  if (rule) {
    if (rule.sound) playPingSound();

    if (rule.highlight) {
      messageSyncQueue.add(username, message, {
        type: MessageActionType.HIGHLIGHT,
        blink: true,
        color: "#e13232",
      });
    }

    const isModerator: boolean = chatController?.channel?.isModerator ?? false;

    if (rule.action == ModerationAction.NONE || !isModerator) {
      return;
    }
    const isUserMod = isMod(irc);
    switch (rule.action) {
      case ModerationAction.BAN:
        if (isUserMod) break;
        postChatMessage(`/ban ${username}`);
        break;
      case ModerationAction.TIMEOUT:
        if (!rule.extraValue || isUserMod) break;
        postChatMessage(`/timeout ${username} ${rule.extraValue}`);
        break;
      case ModerationAction.DELETE:
        const msgId = getId(irc);
        if (!msgId) break;
        postChatMessage(`/delete ${msgId}`);
        break;
    }
    return;
  }

  // Highlighting the my user username
  const highlightMyUsername = settingsCache.get("highlightMyUsername");
  if (highlightMyUsername.enabled) {
    const currentUsername = chatController?.user?.username;
    if (
      currentUsername &&
      message.toLowerCase().includes(currentUsername.toLowerCase())
    ) {
      if (highlightMyUsername.sound) playPingSound();

      messageSyncQueue.add(username, message, {
        type: MessageActionType.HIGHLIGHT,
        blink: false,
        color: highlightMyUsername.color,
      });
      return;
    }
  }

  // Highlighting messages in a chat
  const highlight = highlights.check(username, message);
  if (highlight) {
    if (highlight.sound) playPingSound();

    messageSyncQueue.add(username, message, {
      type: MessageActionType.HIGHLIGHT,
      blink: false,
      color: highlight.color,
    });
  }
};

/**
 * The entry point for IRC messages from the WebSocket interceptor.
 * @param irc - IRC text
 */
const handleIRC = (irc: string) => {
  if (irc.includes("PRIVMSG")) {
    handleMessage(irc);
  }
};

/**
 * The data entry point for data from the chat controller.
 * @param controller - Chat сontroller
 */
const handleChatController = (controller: ChatController | null) => {
  chatController = controller;
};

export const chat = { initDomObserver, handleIRC, handleChatController };
