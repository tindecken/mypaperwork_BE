import { Elysia, t } from "elysia";
import {
  categoriesTable,
  documentsTable,
  paperworksCategoriesTable,
  paperworksTable,
  type SelectPaperworkWithCategory,
} from "../../drizzle/schema";
import { db } from "../../drizzle";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { eq, and, count } from "drizzle-orm";
import { S3Client, type S3File } from "bun";
import { arrayBufferToBase64 } from "../../libs/libs";
import { sessionInfo } from "../../middlewares/sessionInfo.ts";
import { redis } from "bun";

const client = new S3Client({
  accessKeyId: process.env["MINIO_ACCESSKEYID"],
  secretAccessKey: process.env["MINIO_SECRETACCESSKEY"],
  bucket: process.env["MINIO_BUCKET"],
  endpoint: process.env["MINIO_ENDPOINT"],
});
export const getByFileid = (app: Elysia) =>
  app.use(sessionInfo).get(
    "/getPaperworks",
    async ({ selectedFileId , query }) => {
      console.log("getByFileid", selectedFileId);
      const categories = await db
        .select()
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.fileId, selectedFileId),
            eq(categoriesTable.isDeleted, 0)
          )
        );
      const paperworkMap = new Map<string, SelectPaperworkWithCategory>();
      await Promise.all(
        categories.map(async (cat) => {
          const paperworks = await db
            .select()
            .from(paperworksTable)
            .leftJoin(
              paperworksCategoriesTable,
              eq(paperworksTable.id, paperworksCategoriesTable.paperworkId)
            )
            .where(
              and(
                eq(paperworksCategoriesTable.categoryId, cat.id),
                eq(paperworksCategoriesTable.isDeleted, 0)
              )
            );
          paperworks.forEach((p) => {
            const paperworkId = p.paperworks.id;
            if (!paperworkMap.has(paperworkId)) {
              paperworkMap.set(paperworkId, {
                ...p.paperworks,
                coverBase64: null,
                coverFileName: null,
                documentCount: null,
                categories: [cat.name], // Initialize with the current category ID
              });
            } else {
              // If already exists, just add the category ID to the list
              const existingPaperwork = paperworkMap.get(paperworkId)!;
              existingPaperwork.categories.push(cat.name);
            }
          });
        })
      );
      let ppws = Array.from(paperworkMap.values());
      // filter
      if (query["filterValue"]) {
        ppws = ppws.filter(
          (p) =>
            p.name.toLowerCase().includes(query["filterValue"]!.toLowerCase()) ||
            (p.description &&
              p.description
                .toLowerCase()
                .includes(query["filterValue"]!.toLowerCase())) ||
            (p.price &&
              p.price
                .toString()
                .toLowerCase()
                .includes(query["filterValue"]!.toLowerCase())) ||
            (p.priceCurrency &&
              p.priceCurrency
                .toLowerCase()
                .includes(query["filterValue"]!.toLowerCase())) ||
            (p.issuedAt &&
              p.issuedAt
                .toString()
                .toLowerCase()
                .includes(query["filterValue"]!.toLowerCase())) ||
            (p.createdAt &&
              p.createdAt
                .toString()
                .toLowerCase()
                .includes(query["filterValue"]!.toLowerCase())) ||
            p.categories.some((c) =>
              c.toLowerCase().includes(query["filterValue"]!.toLowerCase())
            )
        );
      }
      const totalCount = ppws.length;
      // sort
      if (query["sortField"] && query["sortDirection"]) {
        ppws.sort((a, b) => {
          const sortField =
            query["sortField"] as keyof SelectPaperworkWithCategory;
          if (query["sortDirection"] === "asc") {
            return a[sortField]! > b[sortField]! ? 1 : -1;
          } else {
            return a[sortField]! < b[sortField]! ? 1 : -1;
          }
        });
      } else {
        // sort by createdAt desc
        ppws.sort((a, b) => {
          return a.createdAt! > b.createdAt! ? -1 : 1;
        });
      }
      // limit
      if (query["pageNumber"] && query["pageSize"]) {
        ppws = ppws.slice(
          (Number(query["pageNumber"]) - 1) * Number(query["pageSize"]),
          Number(query["pageNumber"]) * Number(query["pageSize"])
        );
      }
      // get covers for paperworks
      await Promise.all(
        ppws.map(async (ppw) => {
          const documentsWithCover = await db
            .select()
            .from(documentsTable)
            .where(
              and(
                eq(documentsTable.paperworkId, ppw.id),
                eq(documentsTable.isCover, 1),
                eq(documentsTable.isDeleted, 0)
              )
            );
          // update ppws with cover
          if (documentsWithCover.length > 0) {
            // get cover from redis
            const cover = await redis.hmget(`document:${documentsWithCover[0].id}`, ["coverBase64", "fileName"]);
            if (cover) {
              ppw.coverBase64 = cover[0];
              ppw.coverFileName = cover[1];
            } 
            else {
              const s3CoverFile: S3File = client.file(
                documentsWithCover[0].coverPath!
              );
              const coverBuffer = await s3CoverFile.arrayBuffer();
              if (coverBuffer instanceof ArrayBuffer) {
                ppw.coverBase64 = arrayBufferToBase64(coverBuffer);
              } else {
                console.error("coverBuffer is not an array:", coverBuffer);
              }
              ppw.coverFileName = documentsWithCover[0].fileName;
            }
          }
        }));
      // get number of document for each paperwork
      await Promise.all(
        ppws.map(async (ppw) => {
          const documentsCount = await db
            .select({ count: count() })
            .from(documentsTable)
            .where(
              and(
                eq(documentsTable.paperworkId, ppw.id),
                eq(documentsTable.isDeleted, 0)
              )
            );
          ppw.documentCount = documentsCount[0].count as number;
        })
      );
      const res: GenericResponseInterface = {
        success: true,
        message: `Get ${ppws.length} paperworks successfully!`,
        data: ppws,
        totalRecords: totalCount,
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
    },
  );
