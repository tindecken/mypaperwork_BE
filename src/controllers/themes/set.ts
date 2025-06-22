import { Hono } from "hono";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { tbValidator } from "@hono/typebox-validator";
import { auth } from "../../better-auth/auth";
import { Type as T } from "@sinclair/typebox";
import { getUserInfo } from "../../libs/getUserInfo";
import { APIError } from "better-auth/api";
import { db } from "../../../drizzle";
import { themesTable, usersThemesTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { sql } from "drizzle-orm";

const schema = T.Object({
  themeId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
});

export const setTheme = new Hono();

setTheme.post("/set", tbValidator("json", schema), async (c) => {
  try {
    console.log('aaaaaaaaaaaaaaaaaa')
    const body = c.req.valid("json");
    const { themeId } = body;
    
    const loggedInUser = await getUserInfo(c);
    console.log('loggedInUser', loggedInUser);
    if (!loggedInUser) {
      const response: GenericResponseInterface = {
        success: false,
        message: "You are not authorized to set theme for another user",
        data: null,
      };
      return c.json(response, 403);
    }
    // Delete existing theme setting
    await db.delete(usersThemesTable).where(eq(usersThemesTable.userId, loggedInUser.id));
    // Check if theme exists
    const theme = await db.select().from(themesTable).where(eq(themesTable.id, themeId));
    if (theme.length === 0) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Theme not found",
        data: null,
      };
      return c.json(response, 404);
    }
    // Create new theme setting
    await db.insert(usersThemesTable).values({
      id: ulid(),
      userId: loggedInUser.id,
      themeId: themeId,
      createdAt: sql`(CURRENT_TIMESTAMP)`,
      createdBy: loggedInUser.name
    });
    
    const response: GenericResponseInterface = {
      success: true,
      message: "Set theme successfully",
      data: theme[0],
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