import { Hono } from "hono";
import { themesTable, usersThemesTable } from "../../db/schema";
import { db } from "../../db";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import type { IGetThemeResponse } from "../../models/IGetThemeResponse";
import { eq } from "drizzle-orm";
import { getUserInfo } from "../../libs/getUserInfo";

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
      const response: GenericResponseInterface = {
        success: false,
        message: "User theme not found",
        data: null,
      };
      return c.json(response, 404);
    }
    const theme = await db
      .select()
      .from(themesTable)
      .where(eq(themesTable.id, userTheme[0].themeId));
    const response: GenericResponseInterface = {
      success: true,
      message: "Theme fetched successfully",
      data: theme[0] as IGetThemeResponse,
    };
    return c.json(response, 201);
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
