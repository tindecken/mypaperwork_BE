import { Hono } from "hono";
import { categoriesTable } from "../../db/schema";
import { db } from "../../db";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { eq, and, ne, sql } from "drizzle-orm";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";
import { isAuthenticated } from "../../libs/isAuthenticated";
import { getUserInfo } from "../../libs/getUserInfo";
import { isCategoryExisted } from "../../libs/isCategoryExisted";

const schema = T.Object({
  categoryId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
  name: T.String({ maxLength: 100 }),
  note: T.Optional(T.String({ maxLength: 2000 })),
  icon: T.Optional(T.Union([T.String({ maxLength: 100 }), T.Null()])),
  issueAt: T.Optional(T.Union([T.String(), T.Null()])),
  userId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
});
export const updateCategory = new Hono();

updateCategory.put("/update", tbValidator("json", schema), async (c) => {
  try {
    const body = await c.req.json();
    // Check if user is authenticated
    if (!isAuthenticated(c)) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Unauthorized - Authentication required",
        data: null,
      };
      return c.json(response, 401);
    }
    const userInfo = getUserInfo(c);
    if (userInfo?.id !== body.userId) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Forbidden - Invalid User",
        data: null,
      };
      return c.json(response, 403);
    }
    // check categoryId exist or not in table categories
    const isCatExisted = await isCategoryExisted(body.categoryId, c);
    if (!isCatExisted) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Category not found",
        data: null,
      };
      return c.json(response, 404);
    }
    // check duplicate category name
    const existingCategoryByName = await db
      .select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.name, body.name.trim()),
          ne(categoriesTable.id, body.categoryId)
        )
      );
    if (existingCategoryByName.length > 0) {
      const response: GenericResponseInterface = {
        success: false,
        message: `Category with the same name already exists!`,
        data: null,
      };
      return c.json(response, 400);
    }

    // update category in table categories with updated information
    await db
      .update(categoriesTable)
      .set({
        name: body.name.trim(),
        note: body.note?.trim() || null,
        icon: body.icon?.trim() || null,
        updatedBy: userInfo?.name,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
      })
      .where(eq(categoriesTable.id, body.categoryId));

    // return success response with message and data null
    const res: GenericResponseInterface = {
      success: true,
      message: "Edit category successfully!",
      data: null,
    };
    return c.json(res, 200);
  } catch (error) {
    console.error("Error editing category:", error);
    const response: GenericResponseInterface = {
      success: false,
      message: "Failed to edit category due to an internal error",
      data: null,
    };
    return c.json(response, 500);
  }
});
