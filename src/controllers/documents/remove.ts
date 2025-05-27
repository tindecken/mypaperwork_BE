// remove documents from paper work
import { Elysia, t } from "elysia";
import { sessionInfo } from "../../middlewares/sessionInfo";
import {documentsTable, paperworksTable} from "../../drizzle/schema";
import { db } from "../../drizzle";
import {and, eq, sql} from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
export const removeDocuments = (app: Elysia) =>
  app.use(sessionInfo).delete(
    "/remove",
    async ({ body, user, selectedFileId, set }) => {
      const documentPaperwork = await db
        .select()
        .from(documentsTable)
        .where(
          and(
            eq(documentsTable.id, body.documentId),
            eq(documentsTable.paperworkId, body.paperworkId)
          )
        )
      if (documentPaperwork.length === 0) {
        set.status = 404
        const res: GenericResponseInterface = {
          success: false,
          message: `Document or paperwork not found`,
          data: null
        }
        return res
      }
      await db.update(documentsTable).set({ isDeleted: 1, isCover: 0 }).where(
        and(
          eq(documentsTable.id, body.documentId),
          eq(documentsTable.paperworkId, body.paperworkId)
        )
      )
      // update paperwork updatedAt and updatedBy
      await db.update(paperworksTable).set({
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedBy: user.name
      }).where(eq(paperworksTable.id, body.paperworkId))
      const res: GenericResponseInterface = {
        success: true,
        message: `Removed document successfully!`,
        data: null,
      };
      return res;
    },
    {
      auth: true,
      body: t.Object({
        paperworkId: t.String(),
        documentId: t.String(),
      }),
    }
  );
