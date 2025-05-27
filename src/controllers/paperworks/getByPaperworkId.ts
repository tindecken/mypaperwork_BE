import { Elysia, t } from "elysia";
import {
  categoriesTable,
  documentsTable,
  paperworksCategoriesTable,
  paperworksTable,
  type SelectCategory,
} from "../../drizzle/schema.ts";
import { db } from "../../drizzle/index.ts";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface.ts";
import { eq, and, ne } from "drizzle-orm";
import { sessionInfo } from "../../middlewares/sessionInfo.ts";
import type { PaperworkDetails } from "../../models/PaperworkDetails.ts";
import { S3Client, type S3File } from "bun";
import { arrayBufferToBase64 } from "../../libs/libs.ts";

const client = new S3Client({
  accessKeyId: process.env["MINIO_ACCESSKEYID"],
  secretAccessKey: process.env["MINIO_SECRETACCESSKEY"],
  bucket: process.env["MINIO_BUCKET"],
  endpoint: process.env["MINIO_ENDPOINT"],
});
export const getById = (app: Elysia) =>
  app.use(sessionInfo).get(
    "/get/:paperworkId",
    async ({ params: { paperworkId }, set }) => {
      const pw = await db
        .select()
        .from(paperworksTable)
        .where(
          and(
            eq(paperworksTable.id, paperworkId),
            eq(paperworksTable.isDeleted, 0)
          )
        );
      if (pw.length === 0) {
        set.status = 404;
        throw new Error("Paperwork not found or deleted");
      }
      const paperworkCategories = await db
        .select()
        .from(paperworksCategoriesTable)
        .where(
          and(
            eq(paperworksCategoriesTable.paperworkId, paperworkId),
            eq(paperworksCategoriesTable.isDeleted, 0)
          )
        );
      const categories: SelectCategory[] = [];
      await Promise.all(
        paperworkCategories.map(async (pwCat) => {
          const cat = await db
            .select()
            .from(categoriesTable)
            .where(
              and(
                eq(categoriesTable.id, pwCat.categoryId),
                eq(categoriesTable.isDeleted, 0),
                ne(categoriesTable.name, "Uncategorized")
              )
            );
          if (cat.length > 0) {
            categories.push({ ...cat[0] });
          }
        })
      );
      // get attachments and images
      const ppwDocuments = await db
        .select({
          id: documentsTable.id,
          fileName: documentsTable.fileName,
          fileSize: documentsTable.fileSize,
          isCover: documentsTable.isCover,
          filePath: documentsTable.filePath,
        })
        .from(documentsTable)
        .where(
          and(
            eq(documentsTable.paperworkId, paperworkId),
            eq(documentsTable.isDeleted, 0)
          )
        );
      const documentImages = ppwDocuments.filter(
        (doc) =>
          doc.fileName.toLowerCase().endsWith(".jpg") ||
          doc.fileName.toLowerCase().endsWith(".png") ||
          doc.fileName.toLowerCase().endsWith(".jpeg") ||
          doc.fileName.toLowerCase().endsWith(".gif") ||
          doc.fileName.toLowerCase().endsWith(".svg") ||
          doc.fileName.toLowerCase().endsWith(".bmp") ||
          doc.fileName.toLowerCase().endsWith(".heic") ||
          doc.fileName.toLowerCase().endsWith(".tiff")
      );
      const documentImagesWithImageBuffer: {
        id: string;
        fileName: string;
        fileSize: number;
        filePath: string;
        imageArrayBuffer: Uint8Array | null;
        isCover: boolean | null;
      }[] = [];
      const documentAttachments = ppwDocuments.filter(
        (doc) => !documentImages.includes(doc)
      );
      await Promise.all(
        documentImages.map(async (docImage) => {
          const reducedImageDoc = await db
            .select({
              reducedImageFileSize: documentsTable.reducedImageFileSize,
              reducedImageSizeFilePath: documentsTable.reducedImageSizeFilePath,
            })
            .from(documentsTable)
            .where(
              and(
                eq(documentsTable.id, docImage.id),
                eq(documentsTable.isDeleted, 0)
              )
            );
          if (
            reducedImageDoc.length > 0 &&
            reducedImageDoc[0].reducedImageFileSize !== null
          ) {
            const s3CoverFile: S3File = client.file(
              reducedImageDoc[0].reducedImageSizeFilePath!
            );
            const reduceImageBuffer = await s3CoverFile.arrayBuffer();
            const reduceImageBufferUint8Array = new Uint8Array(reduceImageBuffer); // Convert to Uint8Array for easy use in browser

            documentImagesWithImageBuffer.push({
              ...docImage,
              imageArrayBuffer: reduceImageBufferUint8Array,
              fileSize: reducedImageDoc[0].reducedImageFileSize!,
              filePath: reducedImageDoc[0].reducedImageSizeFilePath!,
              isCover:
                docImage.isCover === 1
                  ? true
                  : docImage.isCover === 0
                  ? false
                  : null,
            });
          }
        })
      );

      // ... the rest of the component
      const ppwDetails: PaperworkDetails = {
        ...pw[0],
        categories: categories,
        attachments: documentAttachments,
        images: documentImagesWithImageBuffer,
      };
      const res: GenericResponseInterface = {
        success: true,
        message: `Get paperwork successfully!`,
        data: ppwDetails,
      };
      return res;
    },
    {
      auth: true,
      query: t.Object({
        pageNumber: t.Optional(t.Number()),
        pageSize: t.Optional(t.Number()),
        sortField: t.Optional(t.String()),
        sortDirection: t.Optional(t.TemplateLiteral("${asc|desc}")),
        filterValue: t.Optional(t.String()),
      }),
      params: t.Object({
        paperworkId: t.String(),
      }),
    }
  );

export const getByIdReturnBlob = (app: Elysia) =>
  app.use(sessionInfo).get(
    "/getreturnblob/:paperworkId",
    async ({ params: { paperworkId }, set }) => {
      const pw = await db
        .select()
        .from(paperworksTable)
        .where(
          and(
            eq(paperworksTable.id, paperworkId),
            eq(paperworksTable.isDeleted, 0)
          )
        );
      if (pw.length === 0) {
        set.status = 404;
        throw new Error("Paperwork not found or deleted");
      }
      const paperworkCategories = await db
        .select()
        .from(paperworksCategoriesTable)
        .where(
          and(
            eq(paperworksCategoriesTable.paperworkId, paperworkId),
            eq(paperworksCategoriesTable.isDeleted, 0)
          )
        );
      const categories: SelectCategory[] = [];
      await Promise.all(
        paperworkCategories.map(async (pwCat) => {
          const cat = await db
            .select()
            .from(categoriesTable)
            .where(
              and(
                eq(categoriesTable.id, pwCat.categoryId),
                eq(categoriesTable.isDeleted, 0),
                ne(categoriesTable.name, "Uncategorized")
              )
            );
          if (cat.length > 0) {
            categories.push({ ...cat[0] });
          }
        })
      );
      // get attachments and images
      const ppwDocuments = await db
        .select({
          id: documentsTable.id,
          fileName: documentsTable.fileName,
          fileSize: documentsTable.fileSize,
          isCover: documentsTable.isCover,
          filePath: documentsTable.filePath,
        })
        .from(documentsTable)
        .where(
          and(
            eq(documentsTable.paperworkId, paperworkId),
            eq(documentsTable.isDeleted, 0)
          )
        );
      const documentImages = ppwDocuments.filter(
        (doc) =>
          doc.fileName.toLowerCase().endsWith(".jpg") ||
          doc.fileName.toLowerCase().endsWith(".png") ||
          doc.fileName.toLowerCase().endsWith(".jpeg") ||
          doc.fileName.toLowerCase().endsWith(".gif") ||
          doc.fileName.toLowerCase().endsWith(".svg") ||
          doc.fileName.toLowerCase().endsWith(".bmp") ||
          doc.fileName.toLowerCase().endsWith(".heic") ||
          doc.fileName.toLowerCase().endsWith(".tiff")
      );
      const documentImagesWithBlob: {
        id: string;
        fileName: string;
        fileSize: number;
        filePath: string;
        imageBase64: string | null | undefined;
        isCover: boolean | null;
      }[] = [];
      const documentAttachments = ppwDocuments.filter(
        (doc) => !documentImages.includes(doc)
      );
      await Promise.all(
        documentImages.map(async (docImage) => {
          const reducedImageDoc = await db
            .select({
              reducedImageFileSize: documentsTable.reducedImageFileSize,
              reducedImageSizeFilePath: documentsTable.reducedImageSizeFilePath,
            })
            .from(documentsTable)
            .where(
              and(
                eq(documentsTable.id, docImage.id),
                eq(documentsTable.isDeleted, 0)
              )
            );
          if (
            reducedImageDoc.length > 0 &&
            reducedImageDoc[0].reducedImageFileSize !== null
          ) {
            const reducedImageFile: S3File = client.file(
              reducedImageDoc[0].reducedImageSizeFilePath!
            );
            const reduceImageBuffer = await reducedImageFile.arrayBuffer();
            const base64String = arrayBufferToBase64(reduceImageBuffer);
            documentImagesWithBlob.push({
              ...docImage,
              imageBase64: base64String,
              fileSize: reducedImageDoc[0].reducedImageFileSize!,
              filePath: reducedImageDoc[0].reducedImageSizeFilePath!,
              isCover:
                docImage.isCover === 1
                  ? true
                  : docImage.isCover === 0
                  ? false
                  : null,
            });
          }
        })
      );

      // ... the rest of the component
      const ppwDetails: PaperworkDetails = {
        ...pw[0],
        categories: categories,
        attachments: documentAttachments,
        images: documentImagesWithBlob,
      };
      const res: GenericResponseInterface = {
        success: true,
        message: `Get paperwork successfully!`,
        data: ppwDetails,
      };
      return res;
    },
    {
      query: t.Object({
        pageNumber: t.Optional(t.Number()),
        pageSize: t.Optional(t.Number()),
        sortField: t.Optional(t.String()),
        sortDirection: t.Optional(t.TemplateLiteral("${asc|desc}")),
        filterValue: t.Optional(t.String()),
      }),
      params: t.Object({
        paperworkId: t.String(),
      }),
    }
  );
