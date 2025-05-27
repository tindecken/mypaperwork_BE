// Add documents to paper work
import { Elysia, t } from "elysia";
import { sessionInfo } from "../../middlewares/sessionInfo";
import {
  documentsTable,
  paperworksTable,
  type InsertDocument,
} from "../../drizzle/schema";
import { db } from "../../drizzle/index";
import { eq, sql } from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { ulid } from "ulid";
import sharp from "sharp";
import { IMAGE_FILE_TYPE } from "../../libs/constants/imageType";
import { S3Client, type S3File } from "bun";

const client = new S3Client({
  accessKeyId: process.env["MINIO_ACCESSKEYID"],
  secretAccessKey: process.env["MINIO_SECRETACCESSKEY"],
  bucket: process.env["MINIO_BUCKET"],
  endpoint: process.env["MINIO_ENDPOINT"],
});

export const addDocuments = (app: Elysia) =>
  app.use(sessionInfo).post(
    "/upload",
    async ({ body, selectedFileId, user }) => {
      const paperwork = await db
        .select()
        .from(paperworksTable)
        .where(eq(paperworksTable.id, body.paperworkId));
      if (paperwork.length === 0) {
        throw new Error(`Paper work ${body.paperworkId} not found`);
      }
      if (
        body.file.size >
        Number(process.env["MAX_FILE_SIZE_IN_MB"]) * 1024 * 1024
      ) {
        throw new Error(
          `File ${body.file.name} with file size ${body.file.size} is greater than 10MB! Please upload a smaller file.`
        );
      }
      const fileArrayBuffer = await body.file.arrayBuffer();
      if (fileArrayBuffer.byteLength === 0)
        throw new Error(`File ${body.file.name} is empty!`);
      const filePath = `${user.selectedFileId}\\${body.paperworkId}\\${body.file.name}`;
      const s3File: S3File = client.file(filePath);
      await s3File.write(fileArrayBuffer);
      const newDocument: InsertDocument = {
        id: ulid(),
        paperworkId: body.paperworkId,
        fileSize: body.file.size,
        fileName: body.file.name,
        filePath: filePath,
        isDeleted: 0,
        createdBy: user.name,
      };
      await db.insert(documentsTable).values(newDocument);
      // check if file is an image, then reduce size
      const fileWithoutExtension = body.file.name.substring(
        0,
        body.file.name.lastIndexOf(".")
      );
      const fileExtension = body.file.name.substring(
        body.file.name.lastIndexOf(".") + 1
      );
      const reducedFileName = `${fileWithoutExtension}_reduced.${fileExtension}`;
      const reducedFilePath = `${user.selectedFileId}\\${body.paperworkId}\\${reducedFileName}`;
      if (IMAGE_FILE_TYPE.includes(fileExtension.toLowerCase())) {
        await sharp(fileArrayBuffer)
          .jpeg({ quality: 50 })
          .toBuffer()
          .then(async (arrayBuffer) => {
            const s3File: S3File = client.file(reducedFilePath);
            await s3File.write(arrayBuffer);
            const reducedImageFileSize = arrayBuffer.byteLength;
            await db
              .update(documentsTable)
              .set({
                reducedImageSizeFilePath: reducedFilePath,
                reducedImageFileSize: reducedImageFileSize,
              })
              .where(eq(documentsTable.id, newDocument.id));
          });
        // check is there any cover in this paperwork, if not, set this image as cover
        const documents = await db
          .select()
          .from(documentsTable)
          .where(eq(documentsTable.paperworkId, body.paperworkId));
        const coverDocument = documents.find((doc) => doc.isCover === 1);
        if (!coverDocument) {
          await sharp(fileArrayBuffer)
            .resize(300, 300)
            .jpeg({ mozjpeg: true, quality: 80 })
            .toBuffer()
            .then(async (arrayBuffer: Buffer) => {
              const coverFileName = `${body.file.name.substring(
                0,
                body.file.name.lastIndexOf(".")
              )}_cover.jpg`;
              const coverFilePath = `${user.selectedFileId}\\${body.paperworkId}\\${coverFileName}`;
              const s3File: S3File = client.file(coverFilePath);
              await s3File.write(arrayBuffer);
              await db
                .update(documentsTable)
                .set({ isCover: 1, coverPath: coverFilePath })
                .where(eq(documentsTable.id, newDocument.id));
            });
        }
      }
      // update paperwork updatedAt and updatedBy
      await db
        .update(paperworksTable)
        .set({
          updatedAt: sql`(CURRENT_TIMESTAMP)`,
          updatedBy: user.name,
        })
        .where(eq(paperworksTable.id, body.paperworkId));
      const res: GenericResponseInterface = {
        success: true,
        message: `Added ${body.file.name} document to paper work ${paperwork[0].name} successfully!`,
        data: null,
      };
      return res;
    },
    {
      auth: true,
      body: t.Object({
        file: t.File(),
        paperworkId: t.String(),
      }),
    }
  );
