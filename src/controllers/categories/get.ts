import { Hono } from "hono";
import { categoriesTable, paperworksCategoriesTable } from "../../db/schema";
import { db } from "../../db";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { eq, and } from "drizzle-orm";
import { getUserInfo } from "../../libs/getUserInfo";
import { IGetCategoriesResponse } from "../../models/IGetCategoriesResponse";

export const getCategories = new Hono();

getCategories.get("/get", async (c) => {
  try {
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
          eq(categoriesTable.isDeleted, 0),
          eq(categoriesTable.userId, userInfo.id)
        )
      );
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const paperworkCount = await db
          .select({ id: paperworksCategoriesTable.id })
          .from(paperworksCategoriesTable)
          .where(
            and(
              eq(paperworksCategoriesTable.categoryId, cat.id),
              eq(paperworksCategoriesTable.isDeleted, 0)
            )
          );
        return {
          ...cat,
          paperworkCount: paperworkCount.length,
        };
      })
    );
    
    const dataResponse: IGetCategoriesResponse = {
      categories: categoriesWithCount
    };
    const response: GenericResponseInterface = {
      success: true,
      message: "Categories fetched successfully",
      data: dataResponse,
    };
    return c.json(response, 201);
  } catch (error) {
    console.error("Error fetching categories:", error);

    const response: GenericResponseInterface = {
      success: false,
      message: "Failed to fetch categories due to an internal error",
      data: null,
    };

    return c.json(response, 500);
  }
});
