import { Hono } from "hono";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";

import { paperworksTable, paperworksCategoriesTable, type InsertPaperwork } from "../../db/schema";
import { db } from "../../db";
import { and, eq, sql } from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { getUserInfo } from "../../libs/getUserInfo";
import { isAuthenticated } from "../../libs/isAuthenticated";
import { log } from "../../libs/logging";
import { ulid } from "ulid";

const paramSchema = T.Object({
  paperworkId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
});

export const deletePaperWork = new Hono();

deletePaperWork.delete("/:paperworkId", tbValidator("param", paramSchema), async (c) => {
  // Check if user is authenticated
  if (!isAuthenticated(c)) {
    const response: GenericResponseInterface = {
      success: false,
      message: "Unauthorized - Authentication required",
      data: null,
    };
    return c.json(response, 401);
  }
  const paperworkId = c.req.param("paperworkId");
  const userInfo = getUserInfo(c);
  
  // Check if user info is available
  if (!userInfo) {
    const response: GenericResponseInterface = {
      success: false,
      message: "User information could not be retrieved",
      data: null,
    };
    return c.json(response, 401);
  }

  try {
    // Check if the paperwork exists and belongs to the user
    const existingPaperwork = await db.query.paperworksTable.findFirst({
      where: and(
        eq(paperworksTable.id, paperworkId),
        eq(paperworksTable.userId, userInfo.id),
        eq(paperworksTable.isDeleted, 0)
      ),
    });

    if (!existingPaperwork) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Paperwork not found or you don't have permission to delete it",
        data: null,
      };
      return c.json(response, 404);
    }

    // Soft delete by setting isDeleted = 1
    await db
      .update(paperworksTable)
      .set({
        isDeleted: 1,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedBy: userInfo.id
      })
      .where(
        and(
          eq(paperworksTable.id, paperworkId),
          eq(paperworksTable.userId, userInfo.id)
        )
      );
    
    // Also soft delete related records in paperworksCategories
    await db
      .update(paperworksCategoriesTable)
      .set({
        isDeleted: 1,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedBy: userInfo.id
      })
      .where(eq(paperworksCategoriesTable.paperworkId, paperworkId));

    // Log the action
    await log({
      id: ulid(),
      actionType: "Delete",
      method: "DELETE",
      request: JSON.stringify({ paperworkId }),
      message: `Paperwork ${paperworkId} soft deleted (isDeleted = 1)`,
      oldData: JSON.stringify(existingPaperwork),
      newData: JSON.stringify({ ...existingPaperwork, isDeleted: 1 }),
      actionBy: userInfo.id,
      ipaddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "Unknown"
    });

    const response: GenericResponseInterface = {
      success: true,
      message: "Paperwork successfully deleted",
      data: null,
    };
    return c.json(response);
  } catch (error) {
    console.error("Error when deleting paperwork:", error);
    const response: GenericResponseInterface = {
      success: false,
      message: "An error occurred while deleting the paperwork",
      data: null,
    };
    return c.json(response, 500);
  }
});
