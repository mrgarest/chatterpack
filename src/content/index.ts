import { scriptInject } from "@/utils/inject";
import { commands } from "./commands";
import { chat } from "./chat";
import {
  MessageSource,
  MessageType,
  RuntimeMessageType,
} from "@/enums/message";
import { moderationRules } from "./moderation-rules";
import { highlights } from "./highlights";
import type { ChatController } from "@/interfaces/chat-controller";
import { injectChatterpackSettingsButton } from "./chatterpack-settings-button";

// Script injection
scriptInject("site.js");

// Initialize chat
chat.initDomObserver();

// Initialize moderation rules
moderationRules.init();

// Initialize highlights
highlights.init();

// Initialize commands
commands.init();

// Message listener
window.addEventListener("message", (event: MessageEvent) => {
  const { source, type, payload } = event.data || {};

  // Filter out messages that do not come from our injector script
  if (source !== MessageSource.SITE) return;

  // Handle specific types of events
  switch (type) {
    case MessageType.CHAT_MESSAGE:
      commands.handleMessage(payload.text, payload.execute);
      break;
    case MessageType.WS_CHAT:
      chat.handleIRC(payload.irc);
      break;
    case MessageType.CHAT_CONRROLLER:
      chat.handleChatController((payload as ChatController | null) ?? null);
      break;
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case RuntimeMessageType.SYNC_MODERATION_RULES:
      if (Array.isArray(message.payload)) {
        moderationRules.sync(message.payload);
      }
      break;

    case RuntimeMessageType.SYNC_HIGHLIGHTS:
      if (Array.isArray(message.payload)) {
        highlights.sync(message.payload);
      }
      break;
    case RuntimeMessageType.SYNC_COMMANDS:
      if (Array.isArray(message.payload)) {
        commands.sync(message.payload);
      }
      break;
  }
});

// Inject the extension settings button
injectChatterpackSettingsButton();
