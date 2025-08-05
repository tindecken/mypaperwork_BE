import sharp from "sharp";
import { IMAGE_FILE_TYPE } from "../libs/constants/imageType";
import { db } from "../db";
import { S3Client, type S3File, redis } from "bun";
import { Context } from "hono";
import { GenericResponseInterface } from "../models/GenericResponseInterface";
import { documentsTable } from "../db/schema";
import { ulid } from "ulid";
import { getUserInfo } from "../libs/getUserInfo";
import { arrayBufferToBase64 } from "./arrayBufferToBase64";
import { eq } from "drizzle-orm";

export const uploadFilesS3 = async (
  paperworkId: string,
  files: File[],
  c: Context
): Promise<GenericResponseInterface | undefined> => {
  try {
    const userInfo = getUserInfo(c);
    const client = new S3Client({
      accessKeyId: process.env["MINIO_ACCESSKEYID"],
      secretAccessKey: process.env["MINIO_SECRETACCESSKEY"],
      bucket: process.env["MINIO_BUCKET"],
      endpoint: process.env["MINIO_ENDPOINT"],
    });
    for (const file of files) {
      const fileExtension = file.name.substring(file.name.lastIndexOf(".") + 1).toLowerCase();
      const isImageFile = IMAGE_FILE_TYPE.includes(fileExtension);
      const maxFileSize = isImageFile
        ? 10
        : process.env["MAX_FILE_SIZE_IN_MB"]
        ? parseInt(process.env["MAX_FILE_SIZE_IN_MB"])
        : 2;
      if (file.size > 1024 * 1024 * maxFileSize) {
        const response: GenericResponseInterface = {
          success: false,
          message: `File ${file.name} with file size ${file.size} is greater than ${maxFileSize}MB! Please upload a smaller file.`,
          data: null,
        };
        return response;
      }
    }
    for (const file of files) {
      const fileExtension = file.name.substring(file.name.lastIndexOf(".") + 1).toLowerCase();
      const isImageFile = IMAGE_FILE_TYPE.includes(fileExtension);
      if (isImageFile) {
        const imageArrayBuffer = await file.arrayBuffer();

        // Only reduce image size if it's greater than 1MB
        const needsReduction = imageArrayBuffer.byteLength > 1024 * 1024;
        const processedBuffer = needsReduction
          ? await sharp(imageArrayBuffer)
              .jpeg({
                quality: process.env["IMAGE_QUALITY"] ? parseInt(process.env["IMAGE_QUALITY"]) : 30,
              })
              .toBuffer()
          : Buffer.from(imageArrayBuffer);

        // Prepare file paths and names
        const fileWithoutExtension = file.name.substring(0, file.name.lastIndexOf("."));
        const fileExtension = file.name.substring(file.name.lastIndexOf(".") + 1);
        const reducedFileName = `${fileWithoutExtension}_reduced.${fileExtension}`;
        const reducedFilePath = `${userInfo?.id}\\${paperworkId}\\${reducedFileName}`;

        // Save the file (original or reduced)
        const reducedS3File: S3File = client.file(reducedFilePath);
        await reducedS3File.write(processedBuffer, { type: "image/jpeg" });
        const reducedImageFileSize = processedBuffer.byteLength;

        // insert into documents table
        const document: typeof documentsTable.$inferInsert = {
          id: ulid(),
          paperworkId: paperworkId,
          fileName: reducedFileName,
          fileSize: reducedImageFileSize,
          filePath: reducedFilePath,
          reducedImageSizeFilePath: reducedFilePath,
          reducedImageFileSize: reducedImageFileSize,
          isDeleted: 0,
          createdBy: userInfo?.name,
        };
        await db.insert(documentsTable).values(document);
      } else {
        const fileArrayBuffer = await file.arrayBuffer();
        if (fileArrayBuffer.byteLength === 0) {
          const response: GenericResponseInterface = {
            success: false,
            message: `File ${file.name} is empty!`,
            data: null,
          };
          return response;
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
    }
    // Set cover for the paperwork and reduce size of images
    const documents = await db.select().from(documentsTable).where(eq(documentsTable.paperworkId, paperworkId));
    const documentImages = documents.filter((doc) => {
      const fileExtension = doc.fileName.substring(doc.fileName.lastIndexOf(".") + 1);
      return IMAGE_FILE_TYPE.includes(fileExtension.toLowerCase());
    });
    if (documents.length === 0) {
      return {
        success: false,
        message: "No documents found for the paperwork.",
        data: null,
      };
    }
    // Create cover images for all document images
    for (const documentImage of documentImages) {
      const s3File: S3File = client.file(documentImage.filePath);
      const arrayBuffer = await s3File.arrayBuffer();
      await sharp(arrayBuffer)
        .resize(300, 300)
        .jpeg({ mozjpeg: true, quality: 80 })
        .toBuffer()
        .then(async (buffer: Buffer) => {
          const coverFileName = `${documentImage.fileName.substring(
            0,
            documentImage.fileName.lastIndexOf(".")
          )}_cover.jpg`;
          const coverFilePath = `${userInfo?.id}\\${paperworkId}\\${coverFileName}`;
          const s3File: S3File = client.file(coverFilePath);
          await s3File.write(buffer);
          await db
            .update(documentsTable)
            .set({ isCover: 1, coverPath: coverFilePath })
            .where(eq(documentsTable.id, documentImage.id));
          // convert buffer to base64 then set redis key with document id and base64
          const base64 = arrayBufferToBase64(buffer.buffer as ArrayBuffer);
          await redis.hmset(`document:${documentImage.id}`, [
            "coverBase64",
            base64,
            "fileName",
            documentImage.fileName,
          ]);
        });
    }
    const response: GenericResponseInterface = {
      success: true,
      message: `Files uploaded successfully for paperwork ID: ${paperworkId}`,
      data: null,
    };
    return response;
  } catch (error: any) {
    console.error("Error in uploadFilesS3:", error);
    return {
      success: false,
      message: error ? `Failed to upload file to S3 to an internal error: ${error}${error.code ? ` - ${error.code}` : ''}` : "Failed to upload file to S3 to an internal error",
      data: null,
    };
  }
};
