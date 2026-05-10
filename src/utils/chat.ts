import { MessageSource, MessageType } from "@/enums/message";

/**
 * A universal bridge between the extension and the chat message exchange page.
 * @param text - Message text
 * @param execute - Submission control:
 * true => Emulate an Enter key press (full cycle).
 * false => Only update the text in the field (on-the-fly update).
 */
export const postChatMessage = (text: string, execute: boolean = true) => {
  window.postMessage(
    {
      source: MessageSource.EXTENSION,
      type: MessageType.CHAT_MESSAGE,
      payload: { text: text, execute },
    },
    "*",
  );
};

/**
 * A universal core for checking text for compliance with a rule.
 * Supports exact searches using keywords and regular expressions.
 * @param text - The text to check
 * @param trigger - The trigger word or regex pattern
 * @param isRegex - Indicates if the trigger is a regex pattern
 * @param preCompiledRegex - An optional pre-compiled regex for performance (used when isRegex is true)
 * @returns Whether the text matches the trigger
 */
export const matchTrigger = (
  text: string,
  trigger: string,
  isRegex: boolean,
  preCompiledRegex?: RegExp | null,
): boolean => {
  const lowerText = text.toLowerCase();

  // Regular Expression Mode
  if (isRegex) {
    try {
      return new RegExp(`(?<!\\p{L})${trigger}(?!\\p{L})`, "iu").test(text);
    } catch {
      // If the dynamic regex fails, use the compiled version
      return preCompiledRegex ? preCompiledRegex.test(text) : false;
    }
  }

  // Plain Text Mode
  const triggerWords = trigger
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (triggerWords.length === 0) {
    // Search for a trigger
    return trigger.trim().length > 0
      ? lowerText.includes(trigger.toLowerCase())
      : false;
  }

  return triggerWords.every((word) => {
    // Check if the word contains CJK or Arabic characters
    const hasCJK =
      /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufdff\uff66-\uffef\u0600-\u06ff]/u.test(
        word,
      );

    if (hasCJK) {
      // For CJK/Arabic, just use `include`, since there are no spaces between words
      return lowerText.includes(word);
    }

    // For Latin characters — word boundary using lookbehind/lookahead
    return new RegExp(`(?<!\\p{L})${word}(?!\\p{L})`, "iu").test(lowerText);
  });
};
