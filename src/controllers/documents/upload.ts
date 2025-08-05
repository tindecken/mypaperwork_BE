// remove documents from paper work
import { Hono } from "hono";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";
import { S3Client, type S3File } from "bun";
import { isAuthenticated } from "../../libs/isAuthenticated";
import { uploadFilesS3 } from "../../libs/uploadFilesS3";

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
    const files = body.getAll("file") as File[];
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
    const uploadResult = await uploadFilesS3(paperworkId, files, c);
    console.log('uploadResult:', uploadResult);
    if (!uploadResult || !uploadResult.success) {
      return c.json(uploadResult, 400);
    }
    return c.json(uploadResult, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error ? `Failed to add documents due to an internal error: ${error}${error.code ? ` - ${error.code}` : ''}` : "Failed to add documents due to an internal error",
      data: null,
    };
    return c.json(response, 500);
  }
});
