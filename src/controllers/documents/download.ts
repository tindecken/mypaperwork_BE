// remove documents from paper work
import { Elysia, t } from "elysia";
import { sessionInfo } from "../../middlewares/sessionInfo";
import { documentsTable } from "../../drizzle/schema";
import { db } from "../../drizzle";
import {and, eq} from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";

import { S3Client, type S3File } from "bun";

const client = new S3Client({
  accessKeyId: process.env["MINIO_ACCESSKEYID"],
  secretAccessKey: process.env["MINIO_SECRETACCESSKEY"],
  bucket: process.env["MINIO_BUCKET"],
  endpoint: process.env["MINIO_ENDPOINT"],
});

export const download = (app: Elysia) =>
  app.use(sessionInfo)
  .post("/download", async ({ body, set }) => {
    const documents = await db
    .select()
    .from(documentsTable)
    .where(and(
      eq(documentsTable.paperworkId, body.paperworkId),
      eq(documentsTable.id, body.documentId),
      eq(documentsTable.isDeleted, 0),
    ))
    if (documents.length === 0) {
      set.status = 404;
      throw new Error("Document not found or deleted")
    }
    set.headers['Content-Encoding'] = 'gzip'
    // download file from S3
    const file: S3File = await client.file(documents[0].filePath)
    const buffer = await file.bytes();
    const res: GenericResponseInterface = {
      success: true,
      message: "Get document successfully!",
      data: buffer,
    }
    return res;
  },
  {
    body: t.Object({
      paperworkId: t.String(),
      documentId: t.String(),
    }),
  })
