import type { Command, Highlight, ModerationRule } from "@/types/database";
import i18n from "@/lib/i18n";
import Dexie, { type Table } from "dexie";
import {
  CommandAccess,
  CommandReplyType,
  CommandScope,
} from "@/enums/database";

class Database extends Dexie {
  commands!: Table<Command>;
  moderationRule!: Table<ModerationRule>;
  highlights!: Table<Highlight>;

  constructor() {
    super("chatterpack");

    // Schema
    this.version(1).stores({
      commands: "++id, &trigger, enabled",
      moderationRule: "++id, &trigger, enabled",
      highlights: "++id, &trigger, enabled",
    });

    // Upgrade logic for version 2
    this.version(2)
      .stores({
        commands: "++id, trigger, enabled, scope, channelName",
        moderationRule: "++id, &trigger, enabled",
        highlights: "++id, &trigger, enabled",
      })
      .upgrade((tx) => {
        return tx
          .table("commands")
          .toCollection()
          .modify((cmd) => {
            cmd.scope = CommandScope.ALL;
            cmd.access = CommandAccess.ME;
            cmd.replyType = CommandReplyType.MESSAGE;
            cmd.channelName = undefined;
          });
      });

    // Populate the database upon initial creation
    this.on("populate", () => {
      this.commands.bulkAdd([
        {
          trigger: "!hello",
          command: `Hello from ${i18n.t("appName")}!`,
          enabled: true,
          scope: CommandScope.ALL,
          access: CommandAccess.ME,
          replyType: CommandReplyType.MESSAGE,
        },
      ]);
    });
  }
}

export const db = new Database();
