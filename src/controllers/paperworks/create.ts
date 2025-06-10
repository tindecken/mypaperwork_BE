import { Hono } from "hono";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";

import {
  documentsTable,
  paperworksTable,
  categoriesTable,
  type InsertPaperwork,
  paperworksCategoriesTable,
} from "../../db/schema";
import { db } from "../../db";
import { and, eq } from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { ulid } from "ulid";
import sharp from "sharp";
import { IMAGE_FILE_TYPE } from "../../libs/constants/imageType";
import { S3Client, type S3File, redis } from "bun";
import { arrayBufferToBase64 } from "../../libs/arrayBufferToBase64";
import { getUserInfo } from "../../libs/getUserInfo";
import { isAuthenticated } from "../../libs/isAuthenticated";
import { isCategoryExisted } from "../../libs/isCategoryExisted";

const schema = T.Object({
  categoryId: T.Optional(T.Union([T.String(), T.Null()])),
  name: T.String({ maxLength: 200 }),
  note: T.Optional(T.String({ maxLength: 2000 })),
  issueAt: T.Optional(T.String()),
  customFields: T.Optional(T.String()),
});

const client = new S3Client({
  accessKeyId: process.env["MINIO_ACCESSKEYID"],
  secretAccessKey: process.env["MINIO_SECRETACCESSKEY"],
  bucket: process.env["MINIO_BUCKET"],
  endpoint: process.env["MINIO_ENDPOINT"],
});

export const createPaperWork = new Hono();

// File upload needs to be handled directly through Hono's file handling middleware
createPaperWork.post("/create", tbValidator("form", schema), async (c) => {
  // Check if user is authenticated
  if (!isAuthenticated(c)) {
    const response: GenericResponseInterface = {
      success: false,
      message: "Unauthorized - Authentication required",
      data: null,
    };
    return c.json(response, 401);
  }
  const body = await c.req.formData();

  // check customFields is valid JSON object
  const regex = /^\[\s*(?:\{\s*"key"\s*:\s*"[^"]*"\s*,\s*"value"\s*:\s*"[^"]*"\s*\}(?:\s*,\s*\{\s*"key"\s*:\s*"[^"]*"\s*,\s*"value"\s*:\s*"[^"]*"\s*\})*)\s*\]$/;
  const customFields = body.get("customFields") as string;
  if (customFields && !regex.test(customFields)) {
    const response: GenericResponseInterface = {
      success: false,
      message: "customFields must be a valid JSON array with key and value",
      data: null,
    };
    return c.json(response, 400);
  }
  const userInfo = getUserInfo(c);
  const files = body.getAll("files") as File[];
  const categoryId = body.get("categoryId") as string;
  if (categoryId !== "" && categoryId !== null) {
    const isCatExisted = await isCategoryExisted(categoryId, c);
    if (!isCatExisted) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Category was not existed.",
        data: null,
      };
      return c.json(response, 400);
    }
  }
  
  if (files && files.length > 20) {
    return c.json(
      {
        success: false,
        message: "You can only upload up to 20 files at a time!",
        data: null,
      },
      400
    );
  }
  if (files) {
    for (const file of files) {
      const fileExtension = file.name.substring(file.name.lastIndexOf(".") + 1).toLowerCase();
      const isImageFile = IMAGE_FILE_TYPE.includes(fileExtension);
      const maxFileSize = isImageFile ? 10 : (process.env["MAX_FILE_SIZE_IN_MB"] ? parseInt(process.env["MAX_FILE_SIZE_IN_MB"]) : 2);
      if (file.size > 1024 * 1024 * maxFileSize) {
        return c.json(
          {
            success: false,
            message: `File ${file.name} with file size ${file.size} is greater than ${maxFileSize}MB! Please upload a smaller file.`,
            data: null,
          },
          400
        );
      }
    }
  }
  const ppwULID = ulid();

  // Insert paperwork
  const ppw: InsertPaperwork = {
    id: ppwULID,
    userId: userInfo?.id!,
    name: body.get("name") as string,
    note: body.get("note") as string,
    issuedAt: body.get("issueAt") as string,
    customFields: body.get("customFields")
      ? JSON.parse(body.get("customFields") as string)
      : null,
    createdBy: userInfo?.name,
  };
  const insertedPaperWork = await db
    .insert(paperworksTable)
    .values(ppw)
    .returning();

  // Insert selected category relationship if provided
  if (categoryId !== "" && categoryId !== null) {
    const pwc: typeof paperworksCategoriesTable.$inferInsert = {
      id: ulid(),
      paperworkId: insertedPaperWork[0].id,
      categoryId: categoryId,
      createdBy: userInfo?.name,
    };
    await db.insert(paperworksCategoriesTable).values(pwc);
  }

  // Handle file uploads
  if (files) {
    // upload original files to S3
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

      const filePath = `${userInfo?.id}\\${insertedPaperWork[0].id}\\${file.name}`;
      const document: typeof documentsTable.$inferInsert = {
        id: ulid(),
        paperworkId: insertedPaperWork[0].id,
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
        const coverFilePath = `${userInfo?.id}\\${ppwULID}\\${coverFileName}`;
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
  // Reduce size of image if it's greater than 1MB
  for (const image of documentImages) {
    const origS3File: S3File = client.file(image.filePath);
    const buffer = await origS3File.arrayBuffer();
    
    // Only reduce image size if it's greater than 1MB
    const needsReduction = buffer.byteLength > 1024 * 1024;
    const processedBuffer = needsReduction ? 
      await sharp(buffer)
        .jpeg({ quality: 50 })
        .toBuffer() : 
      Buffer.from(buffer);
    
    // Prepare file paths and names
    const fileWithoutExtension = image.fileName.substring(
      0,
      image.fileName.lastIndexOf(".")
    );
    const fileExtension = image.fileName.substring(
      image.fileName.lastIndexOf(".") + 1
    );
    const reducedFileName = `${fileWithoutExtension}_reduced.${fileExtension}`;
    const reducedFilePath = `${userInfo?.id}\\${ppwULID}\\${reducedFileName}`;
    
    // Save the file (original or reduced)
    const reducedS3File: S3File = client.file(reducedFilePath);
    await reducedS3File.write(processedBuffer, { type: "image/jpeg" });
    const reducedImageFileSize = processedBuffer.byteLength;
    
    // Update the database with the reduced file info
    await db
      .update(documentsTable)
      .set({
        reducedImageSizeFilePath: reducedFilePath,
        reducedImageFileSize: reducedImageFileSize,
      })
      .where(eq(documentsTable.id, image.id));
  }
  const res: GenericResponseInterface = {
    success: true,
    message: `Create paperwork: ${body.get("name") as string} successfully!`,
    data: insertedPaperWork[0].id,
  };
  return c.json(res);
});
