import { eq, and, ne } from "drizzle-orm";
import { categoriesTable } from "../db/schema";
import { db } from "../db";
import { getUserInfo } from "./getUserInfo";
import { Context } from "hono";

/**
 * Checks if a category exists in the database
 * @param categoryId - The ULID of the category to check
 * @returns true if the category exists and is not deleted, false otherwise
 */
export const isCategoryExisted = async (categoryId: string, c: Context): Promise<boolean> => {
  // Check if categoryId matches ULID format
  const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  if (!ulidRegex.test(categoryId)) {
    return false;
  }
  const userInfo = getUserInfo(c);
  if (!userInfo) {
    return false;
  }
  
  // Check if category exists in the database
  const existingCategory = await db
    .select()
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.id, categoryId),
        eq(categoriesTable.userId, userInfo?.id),
        ne(categoriesTable.isDeleted, 1)
      )
    );
  
  // Return true if category exists and is NOT deleted (isDeleted === 0)
  return existingCategory.length > 0;
};
