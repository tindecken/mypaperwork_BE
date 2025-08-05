import { categoriesTable, documentsTable, paperworksCategoriesTable, paperworksTable } from "../../db/schema";
import { db } from "../../db";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { eq, and, count } from "drizzle-orm";
import { S3Client, type S3File } from "bun";
import { arrayBufferToBase64 } from "../../libs/arrayBufferToBase64.js";
import { Hono } from "hono";
import { getUserInfo } from "../../libs/getUserInfo";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";
import { IGetAllPaperworkResponse } from "../../models/IGetAllPaperworkResponse";

const client = new S3Client({
  accessKeyId: process.env["MINIO_ACCESSKEYID"],
  secretAccessKey: process.env["MINIO_SECRETACCESSKEY"],
  bucket: process.env["MINIO_BUCKET"],
  endpoint: process.env["MINIO_ENDPOINT"],
});
1;

const querySchema = T.Object({
  pageNumber: T.Optional(T.String()),
  pageSize: T.Optional(T.String()),
  filterValue: T.Optional(T.String()),
  sortField: T.Optional(T.String()),
  sortDirection: T.Optional(T.Enum({ asc: "asc", desc: "desc" })),
});

export const getByUserId = new Hono();

getByUserId.get("/getAll", tbValidator("query", querySchema), async (c) => {
  try {
    let responseData: IGetAllPaperworkResponse[] = [];
    const { pageNumber, pageSize, filterValue, sortField, sortDirection } = c.req.query();
    const userInfo = getUserInfo(c);
    if (!userInfo) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Unauthorized - Authentication required",
        data: null,
      };
      return c.json(response, 401);
    }
    let ppws = await db
      .select()
      .from(paperworksTable)
      .where(and(eq(paperworksTable.userId, userInfo.id), eq(paperworksTable.isDeleted, 0)));
    await Promise.all(
      ppws.map(async (ppw) => {
        const paperworkId = ppw.id;

        // Get document count for this paperwork
        const docCount = await db
          .select({ count: count() })
          .from(documentsTable)
          .where(and(eq(documentsTable.paperworkId, paperworkId), eq(documentsTable.isDeleted, 0)));

        // Get associated categories
        const associatedCategories = await db
          .select({
            categoryId: paperworksCategoriesTable.categoryId,
          })
          .from(paperworksCategoriesTable)
          .where(eq(paperworksCategoriesTable.paperworkId, paperworkId));

        // Get category names for each associated category
        const categoryNames: string[] = [];
        await Promise.all(
          associatedCategories.map(async (ac) => {
            const category = await db
              .select({
                name: categoriesTable.name,
              })
              .from(categoriesTable)
              .where(and(eq(categoriesTable.id, ac.categoryId), eq(categoriesTable.isDeleted, 0)));

            if (category.length > 0) {
              categoryNames.push(category[0].name);
            }
          })
        );

        // Find document that is set as cover
        const documentsWithCover = await db
          .select()
          .from(documentsTable)
          .where(
            and(
              eq(documentsTable.paperworkId, paperworkId),
              eq(documentsTable.isCover, 1),
              eq(documentsTable.isDeleted, 0)
            )
          );

        // Get cover image if exists
        let coverBase64: string | null = null;
        let coverFileName: string | null = null;

        if (documentsWithCover.length > 0 && documentsWithCover[0].coverPath) {
          try {
            // Use client.file instead of client.getObject
            const coverFile: S3File = client.file(documentsWithCover[0].coverPath);
            if (await coverFile.exists()) {
              const arrayBuffer = await coverFile.arrayBuffer();
              coverBase64 = arrayBufferToBase64(arrayBuffer);
              coverFileName = documentsWithCover[0].coverPath.split("/").pop() || null;
            } else {
              const response: GenericResponseInterface = {
                success: false,
                message: `Cover file not found for paperwork ID ${paperworkId}`,
                data: null,
              };
              return c.json(response, 404);
            }
          } catch (error) {
            console.error(`Error getting cover for paperwork ${paperworkId}:`, error);
          }
        }

        // Add paperwork with all details to response data
        responseData.push({
          ...ppw,
          coverBase64,
          coverFileName,
          documentCount: docCount[0].count,
          categories: categoryNames,
        });
      })
    );

    // Filter by properties if filterValue is provided
    if (filterValue) {
      responseData = responseData.filter(
        (p) =>
          p.name.toLowerCase().includes(filterValue.toLowerCase()) ||
          (p.note && p.note.toLowerCase().includes(filterValue.toLowerCase())) ||
          (p.customFields &&
            (() => {
              try {
                let customFieldsArray;
                // Handle case where customFields might already be an object
                if (typeof p.customFields === "object" && p.customFields !== null) {
                  customFieldsArray = p.customFields;
                } else {
                  customFieldsArray = JSON.parse(p.customFields as string);
                }

                if (Array.isArray(customFieldsArray)) {
                  const hasMatch = customFieldsArray.some((field) => {
                    const keyMatch =
                      field.key && field.key.toString().toLowerCase().includes(filterValue.toLowerCase());
                    const valueMatch =
                      field.value && field.value.toString().toLowerCase().includes(filterValue.toLowerCase());
                    return keyMatch || valueMatch;
                  });
                  return hasMatch;
                }
                return false;
              } catch {
                // If JSON parsing fails, fall back to basic string search
                const fallbackMatch = p.customFields.toString().toLowerCase().includes(filterValue.toLowerCase());
                return fallbackMatch;
              }
            })()) ||
          (p.issuedAt && p.issuedAt.toString().toLowerCase().includes(filterValue.toLowerCase())) ||
          (p.createdAt && p.createdAt.toString().toLowerCase().includes(filterValue.toLowerCase())) ||
          p.categories.some((c) => c.toLowerCase().includes(filterValue.toLowerCase()))
      );
    }

    // Sort the paperworks
    if (sortField && sortDirection) {
      responseData.sort((a, b) => {
        const sortFieldKey = sortField as keyof IGetAllPaperworkResponse;
        if (sortDirection === "asc") {
          return a[sortFieldKey]! > b[sortFieldKey]! ? 1 : -1;
        } else {
          return a[sortFieldKey]! < b[sortFieldKey]! ? 1 : -1;
        }
      });
    } else {
      // Default sort by createdAt desc
      responseData.sort((a, b) => {
        return a.createdAt > b.createdAt ? -1 : 1;
      });
    }

    // Calculate filtered count before pagination
    const filteredCount = responseData.length;

    // Apply pagination
    if (pageNumber && pageSize) {
      const start = (Number(pageNumber) - 1) * Number(pageSize);
      const end = start + Number(pageSize);
      responseData = responseData.slice(start, end);
    }

    const res: GenericResponseInterface = {
      success: true,
      message: `Get ${responseData.length} paperworks successfully!`,
      data: responseData,
      totalRecords: filteredCount,
    };
    return c.json(res, 200);
  } catch (error) {
    console.error("Error getting paperworks:", error);
    const response: GenericResponseInterface = {
      success: false,
      message: "Failed to get paperworks due to an internal error",
      data: null,
    };

    return c.json(response, 500);
  }
});
