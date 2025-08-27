import { and, eq } from "drizzle-orm";
import { documentsTable } from "../db/schema";
import { db } from "../db";
import { redis } from "bun";
import { s3Client } from "./s3Client";
import { arrayBufferToBase64 } from "./arrayBufferToBase64";

export type PaperworkCover = {
  coverBase64: string | null;
  coverFileName: string | null;
};

/**
 * Fetch cover image (base64) and file name for a given paperwork.
 * Logic:
 * 1) Find the document marked as cover and not deleted.
 * 2) Try Redis cache (document:{id} -> coverBase64, fileName).
 * 3) Fallback to S3 using coverPath and convert to base64.
 */
export const getPaperworkCover = async (paperworkId: string): Promise<PaperworkCover> => {
  try {
    const docs = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.paperworkId, paperworkId),
          eq(documentsTable.isCover, 1),
          eq(documentsTable.isDeleted, 0)
        )
      );

    if (docs.length === 0) {
      return { coverBase64: null, coverFileName: null };
    }

    const doc = docs[0];

    // Try Redis cache first
    try {
      const cached = await redis.hmget(`document:${doc.id}`, ["coverBase64", "fileName"]);
      if (cached && cached[0]) {
        return {
          coverBase64: cached[0] as string,
          coverFileName: (cached[1] as string) ?? null,
        };
      }
    } catch (error) {
      console.error(`Error reading Redis cache for paperwork ID ${paperworkId}:`, error);
    }

    // Fallback to S3 if not in cache and a cover path exists
    if (doc.coverPath) {
      try {
        const coverFile = s3Client.file(doc.coverPath);
        const arrayBuf = await coverFile.arrayBuffer();
        const coverBase64 = arrayBufferToBase64(arrayBuf);
        const fileName = doc.coverPath.split("/").pop() || null;
        return { coverBase64, coverFileName: fileName };
      } catch (error) {
        console.error(`Error fetching cover file for paperwork ID ${paperworkId}:`, error);
      }
    }

    return { coverBase64: null, coverFileName: null };
  } catch (error) {
    console.error("Error retrieving paperwork cover:", error);
    return { coverBase64: null, coverFileName: null };
  }
};
