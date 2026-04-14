import type { HighlightType, ModerationAction } from "@/enums/database";

export interface Comman {
  id?: number;
  enabled: boolean;
  trigger: string;
  command: string;
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
