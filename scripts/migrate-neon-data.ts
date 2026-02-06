import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const SOURCE_URL =
  "postgresql://neondb_owner:npg_c5yAUGpgQeY4@ep-billowing-shadow-adymnrep.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const DEST_URL =
  "postgresql://neondb_owner:npg_c5yAUGpgQeY4@ep-lingering-grass-adgxt0ws.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Insertion order (top-down)
const TABLE_ORDER = [
  "User",
  "Client",
  "Project",
  "YearPlan",
  "QuarterPlan",
  "MonthPlan",
  "WeekPlan",
  "DayPlan",
  "Goal",
  "Milestone",
  "KeyStep",
  "Meeting",
  "Task",
  "Research",
  "ResearchSource",
  "ResearchInsight",
  "ActionItem",
  "LeadData",
  "Lead",
  "TimeBlock",
  "TimeEntry",
  "Communication",
  "WellBeingEntry",
  "Capture",
  "VoiceSession",
  "CalendarEvent",
  "AnalyticsEvent",
  "QuarterObjective",
  "QuarterFocus",
  "MonthFocus",
  "WeekFocus",
  "DayFocus",
  "Note",
];

async function migrate() {
  console.log("🚀 Starting ordered data migration...");

  const source = new Client({ connectionString: SOURCE_URL });
  const dest = new Client({ connectionString: DEST_URL });

  try {
    await source.connect();
    await dest.connect();
    console.log("✅ Connected to both databases.");

    // 1. Delete data in reverse order
    console.log("🧹 Clearing destination database...");
    const reverseOrder = [...TABLE_ORDER].reverse();
    for (const table of reverseOrder) {
      try {
        await dest.query(`DELETE FROM "${table}"`);
        console.log(`  - Cleared ${table}`);
      } catch (e) {
        console.warn(
          `  ⚠️ Could not clear ${table} (maybe doesn't exist yet?):`,
          e.message,
        );
      }
    }

    // 2. Insert data in order
    console.log("📥 Inserting data from source...");
    for (const table of TABLE_ORDER) {
      console.log(`⏳ Migrating table: ${table}...`);

      let rows;
      try {
        const dataRes = await source.query(`SELECT * FROM "${table}"`);
        rows = dataRes.rows;
      } catch (e) {
        console.warn(`  ⚠️ Could not read ${table} from source:`, e.message);
        continue;
      }

      if (rows.length === 0) {
        console.log(`  - No data in ${table}, skipping.`);
        continue;
      }

      // Prepare insert
      const columns = Object.keys(rows[0])
        .map((c) => `"${c}"`)
        .join(", ");
      const placeholders = Object.keys(rows[0])
        .map((_, i) => `$${i + 1}`)
        .join(", ");
      const insertQuery = `INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = Object.values(row);
        await dest.query(insertQuery, values);
      }

      console.log(`  ✅ Migrated ${rows.length} rows.`);
    }

    console.log("🎉 Migration complete!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await source.end();
    await dest.end();
  }
}

migrate();
