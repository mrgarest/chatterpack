export type Platform = "twitch" | "7tv";

export interface ChatMessage {
  platform: Platform;
  username: string;
  text: string;
  container: HTMLElement;
  timestamp: number;
}

/**
 * A middleware function for processing messages.
 * Returning `false` stops the rest of the middleware chain.
 */
export type Middleware = (msg: ChatMessage) => boolean | void;

/**
 * CSS selectors for parsing chat messages.
 */
const SELECTORS = {
  twitch: {
    message: ".chat-line__message",
    username: ".chat-author__display-name",
    content: '[data-a-target="chat-line-message-body"]',
  },
  seventv: {
    message: ".seventv-chat-message-container",
    username: ".seventv-chat-user-username",
    content: ".seventv-chat-message-body",
  },
};

/**
 * Monitors the chat DOM and triggers the middleware chain for each new message.
 */
class ChatObserver {
  private observer: MutationObserver;

  // WeakSet allows the garbage collector to remove elements that have been removed from the DOM without the need to manually clean up the collection
  private processed = new WeakSet<HTMLElement>();
  private middlewares: Middleware[] = [];

  constructor() {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) this.handleNode(node);
        });
      }
    });
  }

  /**
   * Starts observing the chat.
   */
  public start() {
    const observeWithRetry = () => {
      //  If `document.body` isn't ready yet, it retries every 100 ms.
      if (!document.body) {
        setTimeout(observeWithRetry, 100);
        return;
      }

      try {
        this.observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        // Process messages that are already in the DOM at startup
        this.handleNode(document.body);

        if (__DEBUG__) {
          console.log("[ChatObserver] active");
        }
      } catch (e) {
        if (__DEBUG__) {
          console.error("[ChatObserver] (fun:observeWithRetry):", e);
        }
      }
    };

    observeWithRetry();
  }

  /**
   * Stops observation and discards the list of processed items
   */
  public stop() {
    this.observer.disconnect();
    this.processed = new WeakSet();
  }

  /**
   * Adds middleware to the message processing chain
   * @param fn
   */
  public use(fn: Middleware) {
    this.middlewares.push(fn);
  }

  /**
   * Checks the node and all its descendants for compliance with the chat selectors.
   */
  private handleNode(root: HTMLElement) {
    const selector = `${SELECTORS.twitch.message}, ${SELECTORS.seventv.message}`;

    if (root.matches(selector)) this.processElement(root);

    root
      .querySelectorAll<HTMLElement>(selector)
      .forEach((el) => this.processElement(el));
  }

  /**
   * Parses the unprocessed message element and passes the result to the middleware chain.
   * @param el
   */
  private processElement(el: HTMLElement) {
    if (this.processed.has(el)) return;

    let msg: ChatMessage | null = null;

    if (el.matches(SELECTORS.seventv.message)) msg = this.parse7TV(el);
    else if (el.matches(SELECTORS.twitch.message)) msg = this.parseTwitch(el);

    if (msg) {
      this.processed.add(el);
      this.emit(msg);
    }
  }

  /**
   * Calls all middleware sequentially.
   * @param msg
   */
  private emit(msg: ChatMessage) {
    for (const mw of this.middlewares) {
      try {
        // If the middleware returns `false`, we stop the chain.
        if (mw(msg) === false) break;
      } catch (e) {
        if (__DEBUG__) {
          console.error("[ChatObserver] middleware error", e);
        }
      }
    }
  }

  /**
   * Extracts the message text, correctly processing emojis using their alt text.
   * @param container - The container element of the message content
   */
  private extractTextWithEmotes(container: HTMLElement | null): string {
    if (!container) return "";

    let result = "";

    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node instanceof HTMLElement) {
        if (node.tagName === "IMG") {
          const alt = node.getAttribute("alt");
          // Add spaces around the alt text so that the emojis don't blend in with the text
          if (alt) result += ` ${alt} `;
        } else {
          node.childNodes.forEach(walk);
        }
      }
    };

    container.childNodes.forEach(walk);

    return (
      result
        // Replace all types of spaces (non-breaking spaces, tabs, and hyphens) with regular spaces
        .replace(/[\u00A0\t\n\r]/g, " ")
        // Combine several spaces into one
        .replace(/\s+/g, " ")
        // Remove spaces at the beginning and end
        .trim()
    );
  }

  /**
   * Get the clean username from the display name.
   * @param rawName - The raw display name, which may contain the username in parentheses.
   */
  private getCleanUsername(rawName: string): string {
    const match = rawName.match(/\(([^)]+)\)$/);
    const cleanName = match ? match[1] : rawName;
    return cleanName.toLowerCase().trim();
  }

  /**
   * Parses messages from the native Twitch chat.
   * @param el - The message element
   */
  private parseTwitch(el: HTMLElement): ChatMessage | null {
    const attrUser = el.getAttribute("data-a-user");
    const usernameEl = el.querySelector(SELECTORS.twitch.username);

    if (!attrUser && !usernameEl) return null;

    const username = attrUser
      ? attrUser.toLowerCase()
      : this.getCleanUsername(usernameEl?.textContent || "");

    const contentEl = el.querySelector<HTMLElement>(SELECTORS.twitch.content);
    const text = this.extractTextWithEmotes(contentEl);

    if (!username || !text) return null;

    return {
      platform: "twitch",
      username,
      text,
      container: el,
      timestamp: Date.now(),
    };
  }

  /**
   * Parses chat messages using the 7TV extension.
   * @param el - The message element
   */
  private parse7TV(el: HTMLElement): ChatMessage | null {
    const usernameEl = el.querySelector(SELECTORS.seventv.username);
    if (!usernameEl) return null;

    const username = this.getCleanUsername(usernameEl.textContent || "");

    const contentEl = el.querySelector<HTMLElement>(SELECTORS.seventv.content);
    const text = this.extractTextWithEmotes(contentEl);

    if (!username || !text) return null;

    return {
      platform: "7tv",
      username,
      text,
      container: el,
      timestamp: Date.now(),
    };
  }
}

export const domChatObserver = new ChatObserver();
