// remove documents from paper work
import { Hono } from "hono";
import { documentsTable } from "../../db/schema";
import { db } from "../../db";
import { and, eq } from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";
import { S3Client, type S3File } from "bun";
import { isAuthenticated } from "../../libs/isAuthenticated";

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
export const downloadDocument = new Hono();
downloadDocument.post("/download", tbValidator("json", schema), async (c) => {
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
    // download file from S3
    const file: S3File = await client.file(documents[0].filePath);
    const buffer = await file.bytes();
    const res: GenericResponseInterface = {
      success: true,
      message: "Get document successfully!",
      data: buffer,
    };
    return c.json(res, 200);
  } catch (error) {
    console.error("Error downloading document:", error);
    const response: GenericResponseInterface = {
      success: false,
      message: "Failed to download document due to an internal error",
      data: null,
    };
    return c.json(response, 500);
  }
});
