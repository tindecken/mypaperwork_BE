import { Elysia, t } from "elysia";
import {
  categoriesTable,
  type InsertPaperworksCategories,
  paperworksCategoriesTable,
  paperworksTable,
} from "../../drizzle/schema.ts";
import { db } from "../../drizzle/index.ts";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface.ts";
import { eq, sql, and, ne } from "drizzle-orm";
import { sessionInfo } from "../../middlewares/sessionInfo.ts";
import { ulid } from "ulid";

export const updateCategoriesByPaperworkId = (app: Elysia) =>
  app.use(sessionInfo).put(
    "/updateCategories",
    async ({ user, selectedFileId, body, set }) => {
      // check paperworkId exist or not in table paperworks
      const existingPaperwork = await db
        .select()
        .from(paperworksTable)
        .where(eq(paperworksTable.id, body.paperworkId));
      if (existingPaperwork.length === 0) {
        set.status = 400;
        const res: GenericResponseInterface = {
          success: false,
          message: `Paperwork with id ${body.paperworkId} does not exist!`,
          data: null,
        };
        return res;
      }
      // get Uncategorized category id
      const uncategorizedCategory = await db
        .select()
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.name, "Uncategorized"),
            eq(categoriesTable.fileId, selectedFileId)
          )
        );
      // check Uncategorized category exist or not
      if (uncategorizedCategory.length === 0) {
        set.status = 400;
        const res: GenericResponseInterface = {
          success: false,
          message: "Uncategorized category does not exist!",
          data: null,
        };
        return res;
      }
      await db
        .delete(paperworksCategoriesTable)
        .where(
          and(
            eq(paperworksCategoriesTable.paperworkId, body.paperworkId),
            ne(
              paperworksCategoriesTable.categoryId,
              uncategorizedCategory[0].id
            )
          )
        );
      // re-add the paperwork categories
      await Promise.all(
        body.categoryIds.map(async (categoryId: string) => {
          const paperworkCategory: InsertPaperworksCategories = {
            id: ulid(),
            paperworkId: body.paperworkId,
            categoryId,
            createdBy: user.name,
            isDeleted: 0,
          };
          await db.insert(paperworksCategoriesTable).values(paperworkCategory);
        })
      );
      // update paperwork updatedAt and updatedBy
      await db
        .update(paperworksTable)
        .set({
          updatedAt: sql`(CURRENT_TIMESTAMP)`,
          updatedBy: user.name,
        })
        .where(eq(paperworksTable.id, body.paperworkId));

      // return success response with message and data null
      const res: GenericResponseInterface = {
        success: true,
        message: "Update categories successfully!",
        data: null,
      };
      return res;
    },
    {
      auth: true,
      body: t.Object({
        paperworkId: t.String(),
        categoryIds: t.Array(t.String()),
      }),
    }
  );
