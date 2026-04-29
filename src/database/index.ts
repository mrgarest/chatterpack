import type { Comman, Highlight, ModerationRule } from "@/types/database";
import i18n from "@/lib/i18n";
import Dexie, { type Table } from "dexie";

class Database extends Dexie {
  commands!: Table<Comman>;
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

    // Populate the database upon initial creation
    this.on("populate", () => {
      this.commands.bulkAdd([
        {
          trigger: "!hello",
          command: `Hello from ${i18n.t("appName")}!`,
          enabled: true,
        },
      ]);
    });
  }
}

export const db = new Database();