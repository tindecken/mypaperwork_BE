import { Hono } from "hono";
import { validator } from "hono/validator";
import { Type } from "@sinclair/typebox";
import { db } from "../../db";
import { paperworksTable, sharedPaperworksTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { getUserInfo } from "../../libs/getUserInfo";
import { ulid } from "ulid";
import { addDays, format } from "date-fns";
import type { IShareLinkResponse } from "../../models/IShareLinkResponse";

export const createShareLink = new Hono();

const createSchema = Type.Object({
  paperworkId: Type.String(),
});

createShareLink.post(
  "/createShareLink",
  validator("json", (value) => {
    // Simple validation without TypeBox schema validation
    if (typeof value !== "object" || value === null) {
      return { success: false, message: "Request body must be an object" };
    }
    
    if (!value.paperworkId || typeof value.paperworkId !== "string") {
      return { success: false, message: "paperworkId is required and must be a string" };
    }
    
    return { success: true, data: value };
  }),
  async (c) => {
    try {
      const validResult = c.req.valid("json");
      const paperworkId = validResult.data.paperworkId;
      
      // Get logged in user
      const loggedInUser = await getUserInfo(c);
      if (!loggedInUser) {
        const response: GenericResponseInterface = {
          success: false,
          message: "You must be logged in to create a share link",
          data: null,
        };
        return c.json(response, 401);
      }
      
      // Check if paperwork exists and belongs to the user
      const paperwork = await db
        .select()
        .from(paperworksTable)
        .where(eq(paperworksTable.id, paperworkId))
        .limit(1);
      
      if (paperwork.length === 0) {
        const response: GenericResponseInterface = {
          success: false,
          message: "Paperwork not found",
          data: null,
        };
        return c.json(response, 404);
      }
      
      if (paperwork[0].userId !== loggedInUser.id) {
        const response: GenericResponseInterface = {
          success: false,
          message: "You can only share your own paperworks",
          data: null,
        };
        return c.json(response, 403);
      }
      
      // Check if a share link already exists for this paperwork and is not expired
      const existingShareLink = await db
        .select()
        .from(sharedPaperworksTable)
        .where(
          eq(sharedPaperworksTable.paperworkId, paperworkId) && 
          eq(sharedPaperworksTable.isDeleted, 0)
        )
        .limit(1);
      
      let shareLink: IShareLinkResponse;
      
      if (existingShareLink.length > 0) {
        // Check if it's expired
        const expiresAt = new Date(existingShareLink[0].expiresAt);
        const now = new Date();
        
        // If it's still valid, return it
        if (expiresAt > now) {
          shareLink = {
            id: existingShareLink[0].id,
            paperworkId: existingShareLink[0].paperworkId,
            shareLink: existingShareLink[0].shareLink,
            expiresAt: existingShareLink[0].expiresAt,
            createdAt: existingShareLink[0].createdAt
          };
          
          const response: GenericResponseInterface = {
            success: true,
            message: "Existing share link retrieved",
            data: shareLink,
          };
          return c.json(response, 200);
        }
        
        // Else mark it as deleted
        await db
          .update(sharedPaperworksTable)
          .set({ isDeleted: 1 })
          .where(eq(sharedPaperworksTable.id, existingShareLink[0].id));
      }
      
      // Create a new share link
      const shareId = ulid();
      const shareToken = ulid();
      const shareUrl = `${process.env.FRONTEND_URL || "https://localhost:1000"}/#/share/${shareToken}`;
      const expiresAt = addDays(new Date(), 1); // 1 day expiration
      
      // Insert the new share record
      const newShare = {
        id: shareId,
        paperworkId: paperworkId,
        shareLink: shareUrl,
        expiresAt: format(expiresAt, "yyyy-MM-dd HH:mm:ss"),
        createdBy: loggedInUser.id,
      };
      
      await db.insert(sharedPaperworksTable).values(newShare);
      
      shareLink = {
        id: shareId,
        paperworkId: paperworkId,
        shareLink: shareUrl,
        expiresAt: format(expiresAt, "yyyy-MM-dd HH:mm:ss"),
        createdAt: new Date().toISOString()
      };
      
      const response: GenericResponseInterface = {
        success: true,
        message: "Share link created successfully",
        data: shareLink,
      };
      
      return c.json(response, 201);
    } catch (error) {
      console.error("Error creating share link:", error);
      
      const response: GenericResponseInterface = {
        success: false,
        message: "Failed to create share link due to an internal error",
        data: null,
      };
      
      return c.json(response, 500);
    }
  }
);
