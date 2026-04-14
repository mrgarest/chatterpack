import { wsChat } from "./ws-chat";
import { chatEditor } from "./chat-editor";
import { chatController } from "./chat-controller";
import { MessageSource } from "@/enums/message";

// Connects to Twitch IRC via WebSocket
wsChat.connect();

// Initializing the chat controller and monitoring it
chatController.init();

window.addEventListener("message", (event: MessageEvent) => {
  // Source verification
  if (
    event.source !== window ||
    event.data?.source !== MessageSource.EXTENSION
  ) {
    return;
  }
  chatEditor.handleMessage(event);
});
