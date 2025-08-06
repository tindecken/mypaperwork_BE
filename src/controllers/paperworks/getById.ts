import {
  categoriesTable,
  documentsTable,
  paperworksCategoriesTable,
  paperworksTable,
  type SelectCategory,
} from "../../db/schema";
import { db } from "../../db";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { eq, and } from "drizzle-orm";
import type { IGetPaperworkDetailsResponse } from "../../models/IGetPaperworkDetailsResponse";
import { S3Client, type S3File } from "bun";
import { arrayBufferToBase64 } from "../../libs/arrayBufferToBase64.js";
import { Hono } from "hono";
import { isAuthenticated } from "../../libs/isAuthenticated";

const client = new S3Client({
  accessKeyId: process.env["MINIO_ACCESSKEYID"],
  secretAccessKey: process.env["MINIO_SECRETACCESSKEY"],
  bucket: process.env["MINIO_BUCKET"],
  endpoint: process.env["MINIO_ENDPOINT"],
});

export const getById = new Hono();

getById.get("/get/:paperworkId", async (c) => {
  try {
    const paperworkId = c.req.param("paperworkId");
    // Check if user is authenticated
    if (!isAuthenticated(c)) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Unauthorized - Authentication required",
        data: null,
      };
      return c.json(response, 401);
    }
    const paperWork = await db
      .select()
      .from(paperworksTable)
      .where(eq(paperworksTable.id, paperworkId))
      .limit(1)
      .execute();
    if (paperWork.length === 0) {
      const res: GenericResponseInterface = {
        success: false,
        message: "Paperwork not found",
        data: null,
      };
      return c.json(res, 404);
    }
    const paperworkCategories = await db
      .select()
      .from(paperworksCategoriesTable)
      .where(and(eq(paperworksCategoriesTable.paperworkId, paperworkId), eq(paperworksCategoriesTable.isDeleted, 0)));
    const categories: SelectCategory[] = [];
    await Promise.all(
      paperworkCategories.map(async (pwCat) => {
        const cat = await db
          .select()
          .from(categoriesTable)
          .where(and(eq(categoriesTable.id, pwCat.categoryId), eq(categoriesTable.isDeleted, 0)));
        if (cat.length > 0) {
          categories.push({ ...cat[0] });
        }
      })
    );
    // get attachments and images
    const ppwDocuments = await db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.paperworkId, paperworkId), eq(documentsTable.isDeleted, 0)));
    const documentImages = ppwDocuments.filter(
      (doc) =>
        doc.fileName.toLowerCase().endsWith(".jpg") ||
        doc.fileName.toLowerCase().endsWith(".png") ||
        doc.fileName.toLowerCase().endsWith(".jpeg") ||
        doc.fileName.toLowerCase().endsWith(".gif") ||
        doc.fileName.toLowerCase().endsWith(".svg") ||
        doc.fileName.toLowerCase().endsWith(".bmp") ||
        doc.fileName.toLowerCase().endsWith(".tiff")
    );
    const documentImagesWithBlob: {
      id: string;
      fileName: string;
      fileSize: number;
      filePath: string;
      imageBase64?: string | null;
      isCover: boolean | null;
    }[] = [];
    const documentAttachments = ppwDocuments.filter((doc) => !documentImages.includes(doc));
    await Promise.all(
      documentImages.map(async (docImage) => {
        const reducedImageDoc = await db
          .select({
            reducedImageFileSize: documentsTable.reducedImageFileSize,
            reducedImageSizeFilePath: documentsTable.reducedImageSizeFilePath,
          })
          .from(documentsTable)
          .where(and(eq(documentsTable.id, docImage.id), eq(documentsTable.isDeleted, 0)));
        if (reducedImageDoc.length > 0 && reducedImageDoc[0].reducedImageFileSize !== null) {
          const reducedImageFile: S3File = client.file(reducedImageDoc[0].reducedImageSizeFilePath!);
          if ((await reducedImageFile.exists()) === false) {
            const response: GenericResponseInterface = {
              success: false,
              message: `Reduced image file not found for document ID ${docImage.id}`,
              data: null,
            };
            return c.json(response, 404);
          }
          const reduceImageBuffer = await reducedImageFile.arrayBuffer();
          const base64String = arrayBufferToBase64(reduceImageBuffer);
          documentImagesWithBlob.push({
            id: docImage.id,
            fileName: docImage.fileName,
            fileSize: reducedImageDoc[0].reducedImageFileSize!,
            filePath: reducedImageDoc[0].reducedImageSizeFilePath!,
            imageBase64: base64String,
            isCover: docImage.isCover === 1 ? true : docImage.isCover === 0 ? false : null,
          });
        }
      })
    );

    // ... the rest of the component
    const ppwDetails: IGetPaperworkDetailsResponse = {
      ...paperWork[0],
      categories: categories,
      attachments: documentAttachments,
      images: documentImagesWithBlob as any, // Type assertion to bypass type checking for images property
    };
    const res: GenericResponseInterface = {
      success: true,
      message: `Get paperwork successfully!`,
      data: ppwDetails,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error ? `Failed to get paperwork details due to an internal error: ${error}${error.code ? ` - ${error.code}` : ''}` : "Failed to get paperwork details due to an internal error",
      data: null,
    };
    return c.json(response, 500);
  }
});
