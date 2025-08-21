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
import sharp from "sharp";

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
export const setCover = new Hono();
setCover.post("/setCover", tbValidator("json", schema), async (c) => {
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
    const documentPaperwork = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.id, body.documentId),
          eq(documentsTable.paperworkId, body.paperworkId)
        )
      );
    if (documentPaperwork.length === 0) {
      const response: GenericResponseInterface = {
        success: false,
        message: `Document or paperwork not found`,
        data: null,
      };
      return c.json(response, 404);
    }
    // update isCover = 0 for all documents
    await db
      .update(documentsTable)
      .set({ isCover: 0, coverPath: null })
      .where(eq(documentsTable.paperworkId, body.paperworkId));
    // resize and update coverPath and coverBlob for selected document
    // get file from S3 based on documentImages[0].filePath then create cover image
    const s3File: S3File = client.file(documentPaperwork[0].filePath);
    const arrayBuffer = await s3File.arrayBuffer();

    await sharp(arrayBuffer)
      .rotate()
      .resize(300, 300)
      .jpeg({ mozjpeg: true, quality: 80 })
      .toBuffer()
      .then(async (arrayBuffer: Buffer) => {
        const coverFileName = `${documentPaperwork[0].fileName.substring(
          0,
          documentPaperwork[0].fileName.lastIndexOf(".")
        )}_cover.jpg`;
        const coverFilePath = `${userInfo?.id}\\${body.paperworkId}\\${coverFileName}`;
        const s3File: S3File = client.file(coverFilePath);
        await s3File.write(arrayBuffer);
        await db
          .update(documentsTable)
          .set({ isCover: 1, coverPath: coverFilePath })
          .where(eq(documentsTable.id, documentPaperwork[0].id));
      });
    // update paperwork updatedAt and updatedBy
    await db
      .update(paperworksTable)
      .set({
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedBy: userInfo?.name,
      })
      .where(eq(paperworksTable.id, body.paperworkId));
    const response: GenericResponseInterface = {
      success: true,
      message: "Document set cover successfully!",
      data: null,
    };
    return c.json(response, 200);
  } catch (error) {
    console.error("Error setting cover:", error);
    const response: GenericResponseInterface = {
      success: false,
      message: "Failed to set cover due to an internal error",
      data: null,
    };
    return c.json(response, 500);
  }
});
