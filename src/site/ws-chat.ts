import { MessageSource, MessageType } from "@/enums/message";

// /**
//  * Intercepts the page's WebSocket connection to read IRC chat messages.
//  */
// export const wsChat = () => {
//   const OriginalWS = window.WebSocket;
//   let activeWs: WebSocket | null = null;

//   window.WebSocket = new Proxy(OriginalWS, {
//     construct(target, args: [string | URL, (string | string[])?]) {
//       const ws = new target(...args);
//       activeWs = ws;

//       ws.addEventListener("message", (event) => {
//         const irc = String(event.data);

//         if (!irc.includes("PRIVMSG")) return;

//         window.postMessage(
//           {
//             source: MessageSource.SITE,
//             type: MessageType.WS_CHAT,
//             payload: { irc: irc },
//           },
//           "*",
//         );
//       });

//       return ws;
//     },
//   });
// };

// Maximum number of attempts to connect to a WebSocket
const MAX_ATTEMPTS = 40;

// A delay between attempts while React is still initializing
const RETRY_DELAY_MS = 500;

// Delay after exhausting attempts — we wait longer to avoid spamming
const SLOW_RETRY_DELAY_MS = 3000;

// The interval for checking the connection status after a successful connection. Twitch may reconnect the WebSocket when you change channels
const RECONNECT_CHECK_MS = 5000;

// Current active WebSocket
let currentWS: WebSocket | null = null;
let messageHandler: ((e: MessageEvent) => void) | null = null;

/**
 * React Fiber finds a node for a DOM element
 * @param el
 * @returns
 */
const getFiber = (el: Element | null): any => {
  if (!el) return null;
  for (const k in el) {
    if (
      k.startsWith("__reactFiber$") ||
      k.startsWith("__reactInternalInstance$")
    ) {
      return (el as any)[k];
    }
  }
  return null;
};

/**
 * Search for the ChatService node that contains a WebSocket connection to Twitch IRC.
 * @param root
 * @returns
 */
const findChatNode = (root: any): any => {
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node.stateNode?.join && node.stateNode?.client) return node;
    if (node.sibling) stack.push(node.sibling);
    if (node.child) stack.push(node.child);
  }
  return null;
};

/**
 * Connects to Twitch IRC via WebSocket.
 */
const connect = (attempt = 0): void => {
  const main = document.querySelector(
    "main.twilight-main, #root.sunlight-root > div:nth-of-type(3)",
  );
  const fiber = getFiber(main);

  if (!fiber) {
    setTimeout(
      () => connect(Math.min(attempt + 1, MAX_ATTEMPTS)),
      RETRY_DELAY_MS,
    );
    return;
  }

  const ws = findChatNode(fiber)?.stateNode?.client?.connection?.ws;

  if (ws instanceof WebSocket && ws.readyState === WebSocket.OPEN) {
    if (currentWS !== ws) {
      if (currentWS && messageHandler) {
        currentWS.removeEventListener("message", messageHandler);
      }

      currentWS = ws;

      messageHandler = (e: MessageEvent) => {
        if (__DEBUG__) {
          console.log("[WebSocket]:", e.data);
        }
        if (typeof e.data === "string" && e.data.includes("PRIVMSG")) {
          window.postMessage(
            {
              source: MessageSource.SITE,
              type: MessageType.WS_CHAT,
              payload: { irc: e.data },
            },
            "*",
          );
        }
      };

      ws.addEventListener("message", messageHandler);
    }

    setTimeout(() => connect(MAX_ATTEMPTS), RECONNECT_CHECK_MS);
    return;
  }

  const delay = attempt < MAX_ATTEMPTS ? RETRY_DELAY_MS : SLOW_RETRY_DELAY_MS;
  setTimeout(() => connect(Math.min(attempt + 1, MAX_ATTEMPTS)), delay);
};

export const wsChat = { connect };
