/** Kysely row types and table facade for the cron_jobs SQLite table. */
import type { DatabaseSync } from "node:sqlite";
import type { Insertable, Selectable } from "kysely";
import { getNodeSqliteKysely } from "../../infra/kysely-sync.js";
import type { DB as OriroStateKyselyDatabase } from "../../state/oriro-state-db.generated.js";

type CronJobsTable = OriroStateKyselyDatabase["cron_jobs"];
type CronStoreDatabase = Pick<OriroStateKyselyDatabase, "cron_jobs">;

/** Read shape for rows in the cron_jobs SQLite table. */
export type CronJobRow = Selectable<CronJobsTable>;

/** Insert/update shape for rows in the cron_jobs SQLite table. */
export type CronJobInsert = Insertable<CronJobsTable>;

/** Creates the Kysely facade scoped to cron_jobs for synchronous SQLite access. */
export function getCronStoreKysely(db: DatabaseSync) {
  return getNodeSqliteKysely<CronStoreDatabase>(db);
}
