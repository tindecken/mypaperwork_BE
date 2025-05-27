// remove documents from paper work
import { Elysia, t } from "elysia";
import { sessionInfo } from "../../middlewares/sessionInfo.ts";
import {documentsTable, paperworksTable} from "../../drizzle/schema";
import { db } from "../../drizzle";
import {and, eq, sql} from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import sharp from 'sharp'
import { S3Client, type S3File } from "bun";

const client = new S3Client({
  accessKeyId: process.env["MINIO_ACCESSKEYID"],
  secretAccessKey: process.env["MINIO_SECRETACCESSKEY"],
  bucket: process.env["MINIO_BUCKET"],
  endpoint: process.env["MINIO_ENDPOINT"],
});
export const setCover = (app: Elysia) =>
  app.use(sessionInfo)
.post(
    "/setCover",
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
      // update isCover = 0 for all documents
      await db.update(documentsTable).set({ isCover: 0, coverPath: null}).where(eq(documentsTable.paperworkId, body.paperworkId))
      // resize and update coverPath and coverBlob for selected document
      // get file from S3 based on documentImages[0].filePath then create cover image
      const s3File: S3File = client.file(documentPaperwork[0].filePath);
      const arrayBuffer = await s3File.arrayBuffer();

      await sharp(arrayBuffer).resize(300, 300).jpeg({mozjpeg: true, quality: 80}).toBuffer().then(async (arrayBuffer: Buffer) => {
        const coverFileName = `${documentPaperwork[0].fileName.substring(0, documentPaperwork[0].fileName.lastIndexOf('.'))}_cover.jpg`;
        const coverFilePath = `${selectedFileId}\\${body.paperworkId}\\${coverFileName}`;
        const s3File: S3File = client.file(coverFilePath);
        await s3File.write(arrayBuffer);
        await db.update(documentsTable).set({isCover: 1, coverPath: coverFilePath}).where(eq(documentsTable.id, documentPaperwork[0].id))
      })
      // update paperwork updatedAt and updatedBy
      await db.update(paperworksTable).set({
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedBy: user.name
      }).where(eq(paperworksTable.id, body.paperworkId))
      const res: GenericResponseInterface = {
        success: true,
        message: `Set cover for paperwork success!`,
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
