import { Hono } from "hono";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";

import { documentsTable, paperworksTable, type InsertPaperwork, paperworksCategoriesTable } from "../../db/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { ulid } from "ulid";
import sharp from "sharp";
import { IMAGE_FILE_TYPE } from "../../libs/constants/imageType";
import { S3Client, type S3File, redis } from "bun";
import { uploadFilesS3 } from "../../libs/uploadFilesS3";
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
  const regex =
    /^\[\s*(?:\{\s*"key"\s*:\s*"[^"]*"\s*,\s*"value"\s*:\s*"[^"]*"\s*\}(?:\s*,\s*\{\s*"key"\s*:\s*"[^"]*"\s*,\s*"value"\s*:\s*"[^"]*"\s*\})*)\s*\]$/;
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
      const maxFileSize = isImageFile
        ? 10
        : process.env["MAX_FILE_SIZE_IN_MB"]
        ? parseInt(process.env["MAX_FILE_SIZE_IN_MB"])
        : 2;
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
    userId: userInfo!.id,
    name: body.get("name") as string,
    note: body.get("note") as string,
    issuedAt: body.get("issueAt") as string,
    customFields: body.get("customFields") ? JSON.parse(body.get("customFields") as string) : null,
    createdBy: userInfo?.name,
  };
  const insertedPaperWork = await db.insert(paperworksTable).values(ppw).returning();

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

  // Handle file uploads using uploadFilesS3
  if (files) {
    const uploadResult = await uploadFilesS3(insertedPaperWork[0].id, files, c);
    if (uploadResult && !uploadResult.success) {
      return c.json(uploadResult, 400);
    }
  }
  const res: GenericResponseInterface = {
    success: true,
    message: `Create paperwork: ${body.get("name") as string} successfully!`,
    data: insertedPaperWork[0].id,
  };
  return c.json(res);
});
