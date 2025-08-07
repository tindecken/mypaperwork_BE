import {
  categoriesTable,
  documentsTable,
  paperworksCategoriesTable,
  paperworksTable,
  type SelectCategory,
  type SelectDocument,
} from "../../db/schema";
import { db } from "../../db";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { eq, and } from "drizzle-orm";
import type { IGetPaperworkDetailsResponse } from "../../models/IGetPaperworkDetailsResponse";
import { s3Client } from "../../libs/s3Client";
import { arrayBufferToBase64 } from "../../libs/arrayBufferToBase64";
import { Hono } from "hono";
import type { Context } from "hono";
import { isAuthenticated } from "../../libs/isAuthenticated";

function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.png', '.jpeg', '.gif', '.svg', '.bmp', '.tiff'];
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

async function processDocumentImage(
  docImage: SelectDocument,
  c: Context
): Promise<{
  id: string;
  fileName: string;
  fileSize: number;
  filePath: string;
  imageBase64?: string | null;
  isCover: boolean | null;
}> {
  const reducedImageDoc = await db
    .select({
      reducedImageFileSize: documentsTable.reducedImageFileSize,
      reducedImageSizeFilePath: documentsTable.reducedImageSizeFilePath,
    })
    .from(documentsTable)
    .where(and(eq(documentsTable.id, docImage.id), eq(documentsTable.isDeleted, 0)));

  if (reducedImageDoc.length === 0 || !reducedImageDoc[0].reducedImageFileSize) {
    throw new Error(`Reduced image not found for document ID ${docImage.id}`);
  }

  const reducedImageFile = s3Client.file(reducedImageDoc[0].reducedImageSizeFilePath!);
  const reduceImageBuffer = await reducedImageFile.arrayBuffer();
  const base64String = arrayBufferToBase64(reduceImageBuffer);

  return {
    id: docImage.id,
    fileName: docImage.fileName,
    fileSize: reducedImageDoc[0].reducedImageFileSize,
    filePath: reducedImageDoc[0].reducedImageSizeFilePath!,
    imageBase64: base64String,
    isCover: docImage.isCover === 1 ? true : docImage.isCover === 0 ? false : null,
  };
}

async function fetchPaperworkCategories(paperworkId: string): Promise<SelectCategory[]> {
  const paperworkCategories = await db
    .select()
    .from(paperworksCategoriesTable)
    .where(and(
      eq(paperworksCategoriesTable.paperworkId, paperworkId),
      eq(paperworksCategoriesTable.isDeleted, 0)
    ));

  const categories: SelectCategory[] = [];
  await Promise.all(
    paperworkCategories.map(async (pwCat) => {
      const cat = await db
        .select()
        .from(categoriesTable)
        .where(and(
          eq(categoriesTable.id, pwCat.categoryId),
          eq(categoriesTable.isDeleted, 0)
        ));
      if (cat.length > 0) {
        categories.push({ ...cat[0] });
      }
    })
  );
  return categories;
}

export const getById = new Hono();

getById.get("/get/:paperworkId", async (c) => {
  try {
    const paperworkId = c.req.param("paperworkId");
    if (!isAuthenticated(c)) {
      return c.json({
        success: false,
        message: "Unauthorized - Authentication required",
        data: null
      }, 401);
    }
    const paperWork = await db
      .select()
      .from(paperworksTable)
      .where(eq(paperworksTable.id, paperworkId))
      .limit(1);
    if (paperWork.length === 0) {
      return c.json({
        success: false,
        message: "Paperwork not found",
        data: null
      }, 404);
    }

    const categories = await fetchPaperworkCategories(paperworkId);
    const ppwDocuments = await db
      .select()
      .from(documentsTable)
      .where(and(
        eq(documentsTable.paperworkId, paperworkId),
        eq(documentsTable.isDeleted, 0)
      ));

    const documentImages = ppwDocuments.filter(doc => isImageFile(doc.fileName));
    const documentImagesWithBlob = await Promise.all(
      documentImages.map(doc => processDocumentImage(doc, c))
    );

    const documentAttachments = ppwDocuments.filter(doc => !isImageFile(doc.fileName));

    const ppwDetails: IGetPaperworkDetailsResponse = {
      ...paperWork[0],
      categories,
      attachments: documentAttachments,
      images: documentImagesWithBlob
    };

    return c.json({
      success: true,
      message: "Get paperwork successfully!",
      data: ppwDetails
    }, 200);

  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error ? `Failed to get paperwork details due to an internal error: ${error}${error.code ? ` - ${error.code}` : ''}` : "Failed to get paperwork details due to an internal error",
      data: null,
    };
    return c.json(response, 500);
  }
});
