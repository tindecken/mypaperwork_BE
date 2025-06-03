import { eq, and, ne } from "drizzle-orm";
import { paperworksTable } from "../db/schema";
import { db } from "../db";
import { getUserInfo } from "./getUserInfo";
import { Context } from 'hono';

/**
 * Checks if a paperwork exists in the database
 * @param paperworkId - The ULID of the paperwork to check
 * @returns true if the paperwork exists and is not deleted, false otherwise
 */
export const isPaperworkExisted = async (paperworkId: string, c: Context): Promise<boolean> => {
  // Check if paperworkId matches ULID format
  const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  if (!ulidRegex.test(paperworkId)) {
    return false;
  }
  const userInfo = getUserInfo(c);
  if (!userInfo) {
    return false;
  }
  // Check if paperwork exists in the database
  const existingPaperwork = await db
    .select()
    .from(paperworksTable)
    .where(
      and(
        eq(paperworksTable.id, paperworkId),
        eq(paperworksTable.userId, userInfo?.id),
        ne(paperworksTable.isDeleted, 1)
      )
    );
  
  // Return true if paperwork exists and is NOT deleted (isDeleted === 0)
  return existingPaperwork.length > 0;
};