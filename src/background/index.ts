import { RuntimeMessageType } from "@/enums/message";
import {
  getActiveCommands,
  getActiveHighlight,
  getActiveModerationRules,
} from "./database";

/**
 * Sends a message to all active tabs that have a content script.
 * @param message - The message to send.
 */
const sendToAllContentScripts = (message: object): void => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (!tab.id) return;
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    });
  });
};

/**
 * Opens the extension page when the browser action icon is clicked.
 */
chrome.action.onClicked.addListener(() => goToTab({ to: "/commands" }));

/**
 * Handles messages received via `chrome.runtime.onMessage`.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case RuntimeMessageType.GO_TO_TAB:
      goToTab(message);
      break;
    case RuntimeMessageType.GET_ACTIVE_COMMANDS:
      return getActiveCommands(sendResponse);
    case RuntimeMessageType.GET_ACTIVE_MODERATION_RULES:
      return getActiveModerationRules(sendResponse);
    case RuntimeMessageType.GET_ACTIVE_HIGHLIGHTS:
      return getActiveHighlight(sendResponse);
    case RuntimeMessageType.SYNC_MODERATION_RULES:
      getActiveModerationRules((rules) =>
        sendToAllContentScripts({ type: message.type, payload: rules }),
      );
      break;
    case RuntimeMessageType.SYNC_HIGHLIGHTS:
      getActiveHighlight((highlights) =>
        sendToAllContentScripts({ type: message.type, payload: highlights }),
      );
      break;
    case RuntimeMessageType.SYNC_COMMANDS:
      getActiveCommands((commands) =>
        sendToAllContentScripts({ type: message.type, payload: commands }),
      );
      break;
  }
});

/**
 * Opens a new tab with the extension and navigates to the specified section (hash).
 * @param message
 */
const goToTab = (message: any) => {
  let url: string;
  if (message.url) {
    url = message.url;
  } else if (message.to) {
    url = chrome.runtime.getURL("index.html") + "#" + message.to;
  } else return;

  chrome.tabs.create({ url: url });
};
