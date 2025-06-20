import { Hono } from "hono";
import { validator } from "hono/validator";
import { Type } from "@sinclair/typebox";
import { db } from "../../db";
import { paperworksTable, sharedPaperworksTable, documentsTable } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { readFileSync } from "fs";
import { join } from "path";
import { getFileBase64 } from "../../utils/getBase64";

export const viewSharedPaperwork = new Hono();

const viewSharedSchema = Type.Object({
  shareToken: Type.String(),
});

viewSharedPaperwork.post(
  "/viewShared",
  validator("json", (value) => {
    // Simple validation without TypeBox schema validation
    if (typeof value !== "object" || value === null) {
      return { success: false, message: "Request body must be an object" };
    }
    
    if (!value.shareToken || typeof value.shareToken !== "string") {
      return { success: false, message: "shareToken is required and must be a string" };
    }
    
    return { success: true, data: value };
  }),
  async (c) => {
    try {
      const validResult = c.req.valid("json");
      const shareToken = validResult.data.shareToken;
      
      // Extract the token from the share URL to find the record
      const shareUrl = `${process.env.FRONTEND_URL || "http://localhost:1000"}/#/share/${shareToken}`;
      
      // Check if share link exists and is not expired
      const sharedPaperwork = await db
        .select()
        .from(sharedPaperworksTable)
        .where(
          eq(sharedPaperworksTable.shareLink, shareUrl) && 
          eq(sharedPaperworksTable.isDeleted, 0)
        )
        .limit(1);
      
      if (sharedPaperwork.length === 0) {
        const response: GenericResponseInterface = {
          success: false,
          message: "Share link not found or has been deleted",
          data: null,
        };
        return c.json(response, 404);
      }
      
      // Check if the share link has expired
      const expiresAt = new Date(sharedPaperwork[0].expiresAt);
      const now = new Date();
      
      if (expiresAt < now) {
        // Mark as deleted since it's expired
        await db
          .update(sharedPaperworksTable)
          .set({ isDeleted: 1 })
          .where(eq(sharedPaperworksTable.id, sharedPaperwork[0].id));
          
        const response: GenericResponseInterface = {
          success: false,
          message: "Share link has expired",
          data: null,
        };
        return c.json(response, 410); // Gone
      }
      
      // Get the paperwork details
      const paperworkId = sharedPaperwork[0].paperworkId;
      const paperwork = await db
        .select()
        .from(paperworksTable)
        .where(
          eq(paperworksTable.id, paperworkId) && 
          eq(paperworksTable.isDeleted, 0)
        )
        .limit(1);
      
      if (paperwork.length === 0) {
        const response: GenericResponseInterface = {
          success: false,
          message: "Paperwork not found or has been deleted",
          data: null,
        };
        return c.json(response, 404);
      }
      
      // Get documents associated with this paperwork
      const documents = await db
        .select()
        .from(documentsTable)
        .where(
          eq(documentsTable.paperworkId, paperworkId) && 
          eq(documentsTable.isDeleted, 0)
        );
      
      // Process documents to include base64 for preview
      const documentsWithBase64 = await Promise.all(
        documents.map(async (doc) => {
          let base64 = null;
          let coverBase64 = null;
          
          // Get reduced size image if available, otherwise get the original
          if (doc.reducedImageSizeFilePath) {
            try {
              base64 = await getFileBase64(doc.reducedImageSizeFilePath);
            } catch (error) {
              console.error(`Error reading reduced image: ${error}`);
              // Fallback to original if available
              if (doc.filePath) {
                try {
                  base64 = await getFileBase64(doc.filePath);
                } catch (err) {
                  console.error(`Error reading original file: ${err}`);
                }
              }
            }
          } else if (doc.filePath) {
            try {
              base64 = await getFileBase64(doc.filePath);
            } catch (error) {
              console.error(`Error reading file: ${error}`);
            }
          }
          
          // Get cover if available
          if (doc.coverPath) {
            try {
              coverBase64 = await getFileBase64(doc.coverPath);
            } catch (error) {
              console.error(`Error reading cover: ${error}`);
            }
          }
          
          return {
            ...doc,
            base64,
            coverBase64
          };
        })
      );
      
      // Find the cover document
      const coverDoc = documentsWithBase64.find(doc => doc.isCover === 1);
      
      // Prepare response data
      const responseData = {
        ...paperwork[0],
        documents: documentsWithBase64,
        coverBase64: coverDoc?.coverBase64 || null,
        coverFileName: coverDoc?.fileName || null,
        isSharedView: true
      };
      
      const response: GenericResponseInterface = {
        success: true,
        message: "Shared paperwork fetched successfully",
        data: responseData,
      };
      
      return c.json(response, 200);
    } catch (error) {
      console.error("Error viewing shared paperwork:", error);
      
      const response: GenericResponseInterface = {
        success: false,
        message: "Failed to view shared paperwork due to an internal error",
        data: null,
      };
      
      return c.json(response, 500);
    }
  }
);
