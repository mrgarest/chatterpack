export interface PendingMessage {
  username: string;
  text: string;
  timestamp: number;
  action?: MessageAction;
}

export interface MessageAction {
  type: MessageActionType;
  blink?: boolean;
  color?: string;
}

export enum MessageActionType {
  HIGHLIGHT = "HIGHLIGHT",
}

/**
 * The synchronization queue between the IRC stream and the chat DOM.
 *
 * Problem it solves:
 * IRC messages arrive via WebSocket before Twitch has a chance to render them in the DOM. Therefore, we cannot immediately locate the element and apply styles to it.
 */
class MessageSyncQueue {
  private queue = new Map<string, PendingMessage[]>();

  // The maximum age of an entry in the queue—after that, we assume the DOM element will not appear
  private readonly MAX_AGE = 30000;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Deletes records older than MAX_AGE.
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, messages] of this.queue.entries()) {
      const filtered = messages.filter((m) => now - m.timestamp < this.MAX_AGE);
      if (filtered.length === 0) {
        this.queue.delete(key);
      } else {
        this.queue.set(key, filtered);
      }
    }
  }

  /**
   * Starts periodic queue cleaning.
   */
  public start() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 15000);
  }

  /**
   * Stops the cleanup and clears the queue.
   */
  public stop() {
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.queue.clear();
  }

  /**
   * Adds the IRC message to the queue.
   * @param username - The username from the IRC message
   * @param text - The message text from the IRC message
   * @param action - Optional action to apply when the message is found in the DOM
   */
  public add(username: string, text: string, action?: MessageAction) {
    const key = username.toLowerCase();
    const item: PendingMessage = {
      username: key,
      text: text.trim().toLowerCase(),
      timestamp: Date.now(),
      action,
    };

    if (!this.queue.has(key)) {
      this.queue.set(key, []);
    }
    this.queue.get(key)!.push(item);
  }

  /**
   * Searches the queue for an entry that matches the DOM element and removes it.
   * @param domUsername - The username extracted from the DOM element
   * @param domText - The message text extracted from the DOM element
   * @returns PendingMessage if a match is found, otherwise null
   */
  public findAndRemove(
    domUsername: string,
    domText: string,
  ): PendingMessage | null {
    const key = domUsername.toLowerCase();
    const messages = this.queue.get(key);

    if (!messages) return null;

    const lowerText = domText.toLowerCase();

    // Searching for the most similar post in this user's list
    for (let i = messages.length - 1; i >= 0; i--) {
      const p = messages[i];
      if (lowerText.includes(p.text) || p.text.includes(lowerText)) {
        messages.splice(i, 1);
        if (messages.length === 0) this.queue.delete(key);
        return p;
      }
    }

    return null;
  }
}

export const messageSyncQueue = new MessageSyncQueue();
