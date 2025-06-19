import { Hono } from "hono";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { tbValidator } from "@hono/typebox-validator";
import { auth } from "../../better-auth/auth";
import { Type as T } from "@sinclair/typebox";
import { getUserInfo } from "../../libs/getUserInfo";
import { APIError } from "better-auth/api";
import { db } from "../../../drizzle";
import { usersThemesTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { sql } from "drizzle-orm";

const schema = T.Object({
  userId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
  themeId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
});

export const setTheme = new Hono();

setTheme.post("/set", tbValidator("json", schema), async (c) => {
  try {
    const body = c.req.valid("json");
    const { userId, themeId } = body;
    
    // Security check: Ensure the logged-in user is only modifying their own theme
    const loggedInUser = await getUserInfo(c);
    if (!loggedInUser || loggedInUser.id !== userId) {
      const response: GenericResponseInterface = {
        success: false,
        message: "You are not authorized to set theme for another user",
        data: null,
      };
      return c.json(response, 403);
    }
    
    // Check if user already has a theme setting
    const existingTheme = await db.select().from(usersThemesTable).where(eq(usersThemesTable.userId, userId));
    
    if (existingTheme.length > 0) {
      // Update existing theme setting
      await db.update(usersThemesTable)
        .set({
          themeId: themeId,
          updatedAt: sql`(CURRENT_TIMESTAMP)`,
          updatedBy: userId
        })
        .where(eq(usersThemesTable.userId, userId));
    } else {
      // Create new theme setting
      await db.insert(usersThemesTable).values({
        id: ulid(),
        userId: userId,
        themeId: themeId,
        createdAt: sql`(CURRENT_TIMESTAMP)`,
        createdBy: userId
      });
    }
    
    const response: GenericResponseInterface = {
      success: true,
      message: "Set theme successfully",
      data: null,
    };
    return c.json(response, 201);
  } catch (error) {
    console.error("Error setting theme:", error);
    if (error instanceof APIError) {
      const response: GenericResponseInterface = {
        success: false,
        message: error.message,
        data: null,
      };
      return c.json(response, error.statusCode as any);
    }
    const response: GenericResponseInterface = {
      success: false,
      message: "Failed to set theme due to an internal error",
      data: null,
    };
    return c.json(response, 500);
  }
});