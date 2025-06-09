// remove documents from paper work
import { Hono } from "hono";
import { documentsTable, paperworksTable } from "../../db/schema";
import { db } from "../../db";
import { and, eq, sql } from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";
import { redis, S3Client, type S3File } from "bun";
import { isAuthenticated } from "../../libs/isAuthenticated";
import { ulid } from "ulid";
import { IMAGE_FILE_TYPE } from "../../libs/constants/imageType";
import { getUserInfo } from "../../libs/getUserInfo";
import sharp from "sharp";
import { arrayBufferToBase64 } from "../../libs/arrayBufferToBase64";

const client = new S3Client({
  accessKeyId: process.env["MINIO_ACCESSKEYID"],
  secretAccessKey: process.env["MINIO_SECRETACCESSKEY"],
  bucket: process.env["MINIO_BUCKET"],
  endpoint: process.env["MINIO_ENDPOINT"],
});
const schema = T.Object({
  paperworkId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
});
export const uploadDocument = new Hono();
uploadDocument.post("/upload", tbValidator("form", schema), async (c) => {
  try {
    const body = await c.req.formData();
    const paperworkId = body.get("paperworkId") as string;
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
    const files = body.getAll("file") as File[];
    console.log('file', files)
    if (!files || files.length === 0) {
      return c.json(
        {
          success: false,
          message: "No files uploaded!",
          data: null,
        },
        400
      );
    }
    if (files.length > 20) {
      return c.json(
        {
          success: false,
          message: "You can only upload up to 20 files at a time!",
          data: null,
        },
        400
      );
    }
    for (const file of files) {
      if (file.size > 1024 * 1024 * 20) {
        return c.json(
          {
            success: false,
            message: `File ${file.name} with file size ${file.size} is greater than 4MB! Please upload a smaller file.`,
            data: null,
          },
          400
        );
      }
    }
    for (const file of files) {
      const fileArrayBuffer = await file.arrayBuffer();
      if (fileArrayBuffer.byteLength === 0) {
        const response: GenericResponseInterface = {
          success: false,
          message: `File ${file.name} is empty!`,
          data: null,
        };
        return c.json(response, 400);
      }

      const filePath = `${userInfo?.id}\\${paperworkId}\\${file.name}`;
      const document: typeof documentsTable.$inferInsert = {
        id: ulid(),
        paperworkId: paperworkId,
        fileSize: file.size,
        fileName: file.name,
        filePath: filePath,
        isDeleted: 0,
        createdBy: userInfo?.name,
      };
      await db.insert(documentsTable).values(document);
      const s3File: S3File = client.file(filePath);
      await s3File.write(fileArrayBuffer);
    }
    // Set cover for the paperwork and reduce size of images
    const documents = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.paperworkId, paperworkId));
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
          const coverFilePath = `${userInfo?.id}\\${paperworkId}\\${coverFileName}`;
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
          const reducedFilePath = `${userInfo?.id}\\${paperworkId}\\${reducedFileName}`;
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
    // update paperwork updatedAt and updatedBy
    await db
      .update(paperworksTable)
      .set({
        updatedAt: sql`CURRENT_TIMESTAMP`,
        updatedBy: userInfo?.name,
      })
      .where(eq(paperworksTable.id, paperworkId));
    const response: GenericResponseInterface = {
      success: true,
      message: "Documents added successfully!",
      data: null,
    };
    return c.json(response, 200);
  } catch (error) {
    console.error("Error adding documents:", error);
    const response: GenericResponseInterface = {
      success: false,
      message: "Failed to add documents due to an internal error",
      data: null,
    };
    return c.json(response, 500);
  }
});
