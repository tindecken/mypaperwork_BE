import { db } from '../../drizzle/index'
import { logsTable, type InsertLog } from "../db/schema";

export const log = async (log: InsertLog) => {
  log = {
    ...log,
  }
  await db.insert(logsTable).values(log)
}