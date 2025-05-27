import { Elysia, t } from "elysia";
import { sessionInfo } from "../../middlewares/sessionInfo.ts";
import {
  documentsTable,
  paperworksTable,
  categoriesTable,
  type InsertPaperwork,
  paperworksCategoriesTable,
} from "../../drizzle/schema.ts";
import { db } from "../../drizzle";
import { and, eq } from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface.ts";
import { ulid } from "ulid";
import sharp from "sharp";
import { IMAGE_FILE_TYPE } from "../../libs/constants/imageType.ts";
import { S3Client, type S3File, redis } from "bun";
import { arrayBufferToBase64 } from "../../libs/libs.ts";

const client = new S3Client({
  accessKeyId: process.env["MINIO_ACCESSKEYID"],
  secretAccessKey: process.env["MINIO_SECRETACCESSKEY"],
  bucket: process.env["MINIO_BUCKET"],
  endpoint: process.env["MINIO_ENDPOINT"],
});
export const createPaperWork = (app: Elysia) =>
  app.use(sessionInfo).post(
    "/create",
    async ({ body, user, selectedFileId, set }) => {
      if (body.name.trim().length == 0) {
        set.status = 400;
        throw new Error("Name is required!");
      }
      if (body.categoryId.trim().length != 0) {
        const category = await db.query.categoriesTable.findFirst({
          where: eq(categoriesTable.id, body.categoryId),
        });
        if (!category) {
          throw new Error(`Category ${body.categoryId} not found!`);
        }
      }
      const isAdminRights = await isAdmin(
        user.id,
        selectedFileId
      );
      if (!isAdminRights) {
        throw new Error("Forbidden");
      }
      if (body.files && body.files.length > 20) {
        set.status = 400;
        throw new Error("You can only upload up to 20 files at a time!");
      }
      if (body.files) {
        for (const file of body.files) {
          if (file.size > 1024 * 1024 * 20) {
            throw new Error(
              `File ${file.name} with file size ${file.size} is greater than 4MB! Please upload a smaller file.`
            );
          }
        }
      }
      const ppwULID = ulid();
      
      // Insert paperwork
      const ppw: InsertPaperwork = {
        id: ppwULID,
        name: body.name.trim(),
        note: body.note,
        issuedAt: body.issueAt,
        createdBy: user.name,
      };
      const insertedPaperWork = await db
        .insert(paperworksTable)
        .values(ppw)
        .returning();

      // Handle uncategorized category
      const uncategorizedCategory = await db.query.categoriesTable.findFirst({
        where: and(
          eq(categoriesTable.name, "Uncategorized"),
        )
      });
      
      if (!uncategorizedCategory) {
        throw new Error("Category Uncategorized not found!");
      }

      // Insert uncategorized relationship
      const uncategorizedPwc: typeof paperworksCategoriesTable.$inferInsert = {
        id: ulid(),
        paperworkId: insertedPaperWork[0].id,
        categoryId: uncategorizedCategory.id,
        createdBy: user.name,
      };
      await db.insert(paperworksCategoriesTable).values(uncategorizedPwc);

      // Insert selected category relationship if provided
      if (body.categoryId !== '') {
        const pwc: typeof paperworksCategoriesTable.$inferInsert = {
          id: ulid(),
          paperworkId: insertedPaperWork[0].id,
          categoryId: body.categoryId,
          createdBy: user.name,
        };
        await db.insert(paperworksCategoriesTable).values(pwc);
      }

      // Handle file uploads
      if (body.files) {
        // upload original files to S3
        for (const file of body.files) {
          const fileArrayBuffer = await file.arrayBuffer();
          if (fileArrayBuffer.byteLength === 0) {
            throw new Error(`File ${file.name} is empty!`);
          }

          const filePath = `${selectedFileId}\\${insertedPaperWork[0].id}\\${file.name}`;
          const document: typeof documentsTable.$inferInsert = {
            id: ulid(),
            paperworkId: insertedPaperWork[0].id,
            fileSize: file.size,
            fileName: file.name,
            filePath: filePath,
            isDeleted: 0,
            createdBy: user.name,
          };
          await db.insert(documentsTable).values(document);
          const s3File: S3File = client.file(filePath);
          await s3File.write(fileArrayBuffer);
        }
      }
      // Set cover for the paperwork and reduce size of images
      const documents = await db
        .select()
        .from(documentsTable)
        .where(eq(documentsTable.paperworkId, ppwULID));
      const documentImages = documents.filter((doc) => {
        const fileExtension = doc.fileName.substring(
          doc.fileName.lastIndexOf(".") + 1
        );
        return IMAGE_FILE_TYPE.includes(fileExtension.toLowerCase());
      });
      if (documentImages.length > 0) {
        // Cover image: get file from S3 based on documentImages[0].filePath then create cover image
        const s3File: S3File = client.file(documentImages[0].filePath);
        const arrayBuffer = await s3File.arrayBuffer();
        await sharp(arrayBuffer)
          .resize(300, 300)
          .jpeg({ mozjpeg: true, quality: 80 })
          .toBuffer()
          .then(async (buffer: Buffer) => {
            const coverFileName = `${documentImages[0].fileName.substring(
              0,
              documentImages[0].fileName.lastIndexOf(".")
            )}_cover.jpg`;
            const coverFilePath = `${selectedFileId}\\${ppwULID}\\${coverFileName}`;
            const s3File: S3File = client.file(coverFilePath);
            await s3File.write(buffer);
            await db
              .update(documentsTable)
              .set({ isCover: 1, coverPath: coverFilePath })
              .where(eq(documentsTable.id, documentImages[0].id));
            // convert buffer to base64 then set redis key with document id and base64
            const base64 = arrayBufferToBase64(buffer.buffer as ArrayBuffer);
            await redis.hmset(`document:${documentImages[0].id}`, [
              "coverBase64", 
              base64,
              "fileName",
              documentImages[0].fileName,
            ]);
          });
      }
      // Reduce size of all images
      for (const image of documentImages) {
        const s3File: S3File = client.file(image.filePath);
        const buffer = await s3File.arrayBuffer();
        await sharp(buffer)
          .jpeg({ quality: 50 })
          .toBuffer()
          .then(async (arrayBuffer: Buffer) => {
            // check if file is an image, then reduce size
            const fileWithoutExtension = image.fileName.substring(
              0,
              image.fileName.lastIndexOf(".")
            );
            const fileExtension = image.fileName.substring(
              image.fileName.lastIndexOf(".") + 1
            );
            const reducedFileName = `${fileWithoutExtension}_reduced.${fileExtension}`;
            const reducedFilePath = `${selectedFileId}\\${ppwULID}\\${reducedFileName}`;
            const s3File: S3File = client.file(reducedFilePath);
            await s3File.write(arrayBuffer, { type: "image/jpeg" });
            const reducedImageFileSize = arrayBuffer.byteLength;
            await db
              .update(documentsTable)
              .set({
                reducedImageSizeFilePath: reducedFilePath,
                reducedImageFileSize: reducedImageFileSize,
              })
              .where(eq(documentsTable.id, image.id));
          });
      }
      const res: GenericResponseInterface = {
        success: true,
        message: `Create paper work: ${body.name} successfully!`,
        data: null,
      };
      return res;
    },
    {
      auth: true,
      body: t.Object({
        files: t.Optional(t.Files()),
        categoryId: t.String(),
        name: t.String(),
        description: t.Optional(t.String()),
        issueAt: t.Optional(t.String()),
        price: t.Optional(t.String()),
        priceCurrency: t.Optional(t.String()),
      }),
    }
  );
