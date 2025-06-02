import {
  categoriesTable,
  documentsTable,
  paperworksCategoriesTable,
  paperworksTable,
} from "../../db/schema";
import { db } from "../../db";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { eq, and, count } from "drizzle-orm";
import { S3Client, type S3File, redis } from "bun";
import { arrayBufferToBase64 } from "../../libs/arrayBufferToBase64.js";
import { Hono } from "hono";
import { getUserInfo } from "../../libs/getUserInfo";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";
import { IGetPaperworksResponse } from "../../models/IGetPaperworksResponse";

const client = new S3Client({
  accessKeyId: process.env["MINIO_ACCESSKEYID"],
  secretAccessKey: process.env["MINIO_SECRETACCESSKEY"],
  bucket: process.env["MINIO_BUCKET"],
  endpoint: process.env["MINIO_ENDPOINT"],
});1

const querySchema = T.Object({
  pageNumber: T.Optional(T.String()),
  pageSize: T.Optional(T.String()),
  filterValue: T.Optional(T.String()),
  sortField: T.Optional(T.String()),
  sortDirection: T.Optional(T.Enum({asc: 'asc', desc: 'desc'})),
});

export const getByUserId = new Hono();

getByUserId.get("/getAll", tbValidator("query", querySchema), async (c) => {
  console.log('query', c.req.query())
  try {
    const { pageNumber, pageSize, filterValue, sortField, sortDirection } = c.req.query()
    const userInfo = getUserInfo(c);
    if (!userInfo) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Unauthorized - Authentication required",
        data: null,
      };
      return c.json(response, 401);
    }
    
      const categories = await db
        .select()
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.userId, userInfo.id),
            eq(categoriesTable.isDeleted, 0)
          )
        );
      const paperworkMap = new Map<string, IGetPaperworksResponse>();
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
      if (filterValue) {
        ppws = ppws.filter(
          (p) =>
            p.name.toLowerCase().includes(filterValue.toLowerCase()) ||
            (p.note &&
              p.note
                .toLowerCase()
                .includes(filterValue.toLowerCase())) ||
            (p.customFields &&
              p.customFields
                .toString()
                .toLowerCase()
                .includes(filterValue.toLowerCase())) ||
            (p.issuedAt &&
              p.issuedAt
                .toString()
                .toLowerCase()
                .includes(filterValue.toLowerCase())) ||
            (p.createdAt &&
              p.createdAt
                .toString()
                .toLowerCase()
                .includes(filterValue.toLowerCase())) ||
            p.categories.some((c) =>
              c.toLowerCase().includes(filterValue.toLowerCase())
            )
        );
      }
      const totalCount = ppws.length;
      // sort
      if (sortField && sortDirection) {
        ppws.sort((a, b) => {
          const sortFieldKey = sortField as keyof IGetPaperworksResponse;
          if (sortDirection === "asc") {
            return a[sortFieldKey]! > b[sortFieldKey]! ? 1 : -1;
          } else {
            return a[sortFieldKey]! < b[sortFieldKey]! ? 1 : -1;
          }
        });
      } else {
        // sort by createdAt desc
        ppws.sort((a, b) => {
          return a.createdAt! > b.createdAt! ? -1 : 1;
        });
      }
      // limit
      if (pageNumber && pageSize) {
        ppws = ppws.slice(
          (Number(pageNumber) - 1) * Number(pageSize),
          Number(pageNumber) * Number(pageSize)
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
