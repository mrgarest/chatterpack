import { HighlightType } from "@/enums/database";
import { RuntimeMessageType } from "@/enums/message";
import type { Highlight } from "@/types/database";
import { matchTrigger } from "@/utils/chat";
import { initWithRetry } from "@/utils/database";

interface CompiledRule {
  highlight: Highlight;
  regex: RegExp | null;
}

// Cache of active moderation rules.
let compiledHighlights: CompiledRule[] = [];

/**
 * Compiles a set of highlights from the database into an internal format using predefined RegExp.
 * @param highlights - Highlights from the database
 */
const compile = (highlights: Highlight[]) =>
  highlights.map((r) => ({
    highlight: r,
    regex: r.regex ? new RegExp(r.trigger, "i") : null,
  }));

/**
 * Initial data loading from the background script when the content script starts.
 * @param attempt
 */
const init = (attempt = 0) =>
  initWithRetry<Highlight>(
    RuntimeMessageType.GET_ACTIVE_HIGHLIGHTS,
    (highlights) => {
      compiledHighlights = compile(highlights);
    },
    "Highlight",
    attempt,
  );

/**
 * Refreshes the policy cache after saving data.
 * @param highlights - Highlights from the database
 */
const sync = (highlights: Highlight[]): void => {
  compiledHighlights = compile(highlights);
};

/**
 * Checks the message text against all active rules.
 * @param text - Message text
 * @returns Highlight
 */
const check = (username: string, text: string): Highlight | null => {
  for (const { highlight, regex } of compiledHighlights) {
    let isMatch = false;

    if (highlight.type === HighlightType.USER) {
      isMatch = username.toLowerCase() === highlight.trigger.toLowerCase();
    } else {
      isMatch = matchTrigger(text, highlight.trigger, highlight.regex, regex);
    }

    if (isMatch) return highlight;
  }
  return null;
};

export const highlights = { init, sync, check };
