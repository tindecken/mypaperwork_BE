// remove documents from paper work
import { Hono } from "hono";
import { documentsTable, paperworksTable } from "../../db/schema";
import { db } from "../../db";
import { and, eq, sql } from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";
import { S3Client, type S3File } from "bun";
import { isAuthenticated } from "../../libs/isAuthenticated";
import { getUserInfo } from "../../libs/getUserInfo";

const client = new S3Client({
  accessKeyId: process.env["MINIO_ACCESSKEYID"],
  secretAccessKey: process.env["MINIO_SECRETACCESSKEY"],
  bucket: process.env["MINIO_BUCKET"],
  endpoint: process.env["MINIO_ENDPOINT"],
});
const schema = T.Object({
  documentId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
  paperworkId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
});
export const removeDocument = new Hono();
removeDocument.delete("/remove", tbValidator("json", schema), async (c) => {
  try {
    const body = await c.req.json();
    // Check if user is authenticated
    if (!isAuthenticated(c)) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Unauthorized - Authentication required",
        data: null,
      };
      return c.json(response, 401);
    }
    const userInfo = getUserInfo(c);
    const documents = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.paperworkId, body.paperworkId),
          eq(documentsTable.id, body.documentId),
          eq(documentsTable.isDeleted, 0)
        )
      );
    if (documents.length === 0) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Document not found or deleted",
        data: null,
      };
      return c.json(response, 404);
    }
    await db.update(documentsTable).set({ isDeleted: 1, isCover: 0, coverPath: null }).where(
      and(
        eq(documentsTable.paperworkId, body.paperworkId),
        eq(documentsTable.id, body.documentId)
      )
    );

    // Update paperwork updatedAt and updatedBy
    await db
      .update(paperworksTable)
      .set({
        updatedAt: sql`CURRENT_TIMESTAMP`,
        updatedBy: userInfo?.name,
      })
      .where(eq(paperworksTable.id, body.paperworkId));
    const response: GenericResponseInterface = {
      success: true,
      message: "Document removed successfully!",
      data: null,
    };
    return c.json(response, 200);
  } catch (error) {
    console.error("Error removing document:", error);
    const response: GenericResponseInterface = {
      success: false,
      message: "Failed to remove document due to an internal error",
      data: null,
    };
    return c.json(response, 500);
  }
});
