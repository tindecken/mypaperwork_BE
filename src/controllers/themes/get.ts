import { Hono } from "hono";
import { themesTable } from "../../db/schema";
import { db } from "../../db";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import type { IGetThemeResponse } from "../../models/IGetThemeResponse";
import { eq } from "drizzle-orm";

export const getThemes = new Hono();

getThemes.get("/get", async (c) => {
  try {
    const themes = await db
      .select({
        id: themesTable.id,
        name: themesTable.name,
        description: themesTable.description,
        isDefault: themesTable.isDefault,
      })
      .from(themesTable)
      .where(
        eq(themesTable.isDeleted, 0)
      );
    const response: GenericResponseInterface = {
      success: true,
      message: "Themes fetched successfully",
      data: themes as IGetThemeResponse[],
    };
    return c.json(response, 201);
  } catch (error) {
    console.error("Error fetching themes:", error);

    const response: GenericResponseInterface = {
      success: false,
      message: "Failed to fetch themes due to an internal error",
      data: null,
    };

    return c.json(response, 500);
  }
});
