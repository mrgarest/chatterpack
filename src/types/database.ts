import type { CommandAccess, CommandReplyType, CommandScope, HighlightType, ModerationAction } from "@/enums/database";

export interface Command {
  id?: number;
  enabled: boolean;
  trigger: string;
  command: string;
  scope: CommandScope;
  scopeChannel?: string;
  access: CommandAccess;
  replyType: CommandReplyType;
}

export interface ModerationRule {
  id?: number;
  trigger: string;
  action: ModerationAction;
  extraValue?: string;
  regex: boolean;
  highlight: boolean;
  sound: boolean;
  enabled: boolean;
}

export interface Highlight {
  id?: number;
  type: HighlightType;
  trigger: string;
  color: string;
  regex: boolean;
  sound: boolean;
  enabled: boolean;
}
