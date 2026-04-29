import { ModerationAction } from "@/enums/database";
import { RuntimeMessageType } from "@/enums/message";
import type { ModerationRule } from "@/types/database";
import { matchTrigger } from "@/utils/chat";
import { initWithRetry } from "@/utils/database";

interface CompiledRule {
  rule: ModerationRule;
  regex: RegExp | null;
}

// Cache of active moderation rules.
let compiledRules: CompiledRule[] = [];

/**
 * Compiles a set of rules from the database into an internal format using predefined RegExp.
 * @param rules - Moderation rules from the database
 */
const compile = (rules: ModerationRule[]) =>
  rules.map((r) => ({
    rule: r,
    regex: r.regex ? new RegExp(r.trigger, "i") : null,
  }));

/**
 * Initial data loading from the background script when the content script starts.
 * @param attempt
 */
const init = (attempt = 0) =>
  initWithRetry<ModerationRule>(
    RuntimeMessageType.GET_ACTIVE_MODERATION_RULES,
    (rules) => {
      compiledRules = compile(rules);
    },
    "ModerationRules",
    attempt,
  );

/**
 * Refreshes the policy cache after saving data.
 * @param rules - Moderation rules from the database
 */
const sync = (rules: ModerationRule[]): void => {
  compiledRules = compile(rules);
};

/**
 * Checks the message text against all active rules.
 * @param text - Message text
 * @returns Moderation rule
 */
const check = (text: string): ModerationRule | null => {
  for (const { rule, regex } of compiledRules) {
    const isMatch = matchTrigger(text, rule.trigger, rule.regex, regex);

    if (
      isMatch &&
      (rule.highlight || rule.sound || rule.action !== ModerationAction.NONE)
    ) {
      if (__DEBUG__)
        console.log(`%c[Moderation Match]`, "color: orange", rule.trigger);
      return rule;
    }
  }
  return null;
};

export const moderationRules = { init, sync, check };
