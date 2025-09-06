import { Hono } from "hono";
import { themesTable, usersThemesTable } from "../../db/schema";
import { db } from "../../db";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import type { IGetThemeResponse } from "../../models/IGetThemeResponse";
import { eq, sql } from "drizzle-orm";
import { getUserInfo } from "../../libs/getUserInfo";
import { ulid } from "ulid";

export const getUserTheme = new Hono();

getUserTheme.get("/getUserTheme", async (c) => {
  try {
    const userInfo = getUserInfo(c);
    if (!userInfo) {
      const response: GenericResponseInterface = {
        success: false,
        message: "You are not authorized to get theme for another user",
        data: null,
      };
      return c.json(response, 403);
    }
    const userTheme = await db
      .select()
      .from(usersThemesTable)
      .where(eq(usersThemesTable.userId, userInfo.id));
    if (userTheme.length === 0) {
      // set default theme
      const defaultTheme = await db
        .select()
        .from(themesTable)
        .where(eq(themesTable.isDefault, 1));
      let defaultThemeId = "";
      if (defaultTheme.length === 0) {
        console.log("Default theme not found");
      } else {
        defaultThemeId = defaultTheme[0].id;
      }
      const createdUserThemeId = ulid();
      await db.insert(usersThemesTable).values({
        id: createdUserThemeId,
        userId: userInfo.id,
        themeId: defaultThemeId,
        createdAt: sql`(CURRENT_TIMESTAMP)`,
        createdBy: "system",
      });
      const theme = await db
        .select()
        .from(themesTable)
        .where(eq(themesTable.id, createdUserThemeId));
      const response: GenericResponseInterface = {
        success: true,
        message: "Theme fetched successfully",
        data: theme[0] as IGetThemeResponse,
      };
      return c.json(response, 201);
    } else {
      const theme = await db
        .select()
        .from(themesTable)
        .where(eq(themesTable.id, userTheme[0].themeId));
      const response: GenericResponseInterface = {
        success: true,
        message: "Theme fetched successfully",
        data: theme[0] as IGetThemeResponse,
      };
      return c.json(response, 200);
    }
  } catch (error) {
    console.error("Error fetching theme:", error);

    const response: GenericResponseInterface = {
      success: false,
      message: "Failed to fetch theme due to an internal error",
      data: null,
    };
    return c.json(response, 500);
  }
});
