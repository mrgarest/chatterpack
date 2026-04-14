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
      // Exact search within Unicode boundaries
      return new RegExp(`(?<=^|\\s)${trigger}(?=$|\\s)`, "iu").test(text);
    } catch (e) {
      // If the dynamic regex fails, use the compiled version
      return preCompiledRegex ? preCompiledRegex.test(text) : false;
    }
  }

  // Plain Text Mode
  const wordsInText = lowerText.split(/\s+/);
  const triggerWords = trigger
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (triggerWords.length > 0) {
    // Search for a trigger
    return triggerWords.every((word) => wordsInText.includes(word));
  }

  // Fallback only if there is none in the trigger.
  if (trigger.trim().length > 0) {
    return lowerText.includes(trigger.toLowerCase());
  }

  return false;
};
