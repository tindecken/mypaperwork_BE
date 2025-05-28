import { Hono } from "hono";
import { categoriesTable, paperworksCategoriesTable, paperworksTable } from "../../db/schema";
import { db } from "../../db";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { eq, and, inArray, notInArray, sql } from "drizzle-orm";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";
import { isAuthenticated } from "../../libs/isAuthenticated";
import { getUserInfo } from "../../libs/getUserInfo";

const schema = T.Object({
  id: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
  userId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
});

export const deleteCategory = new Hono();

deleteCategory.delete("/delete", tbValidator("json", schema), async (c) => {
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
    if(userInfo?.id !== body.userId){
      const response: GenericResponseInterface = {
        success: false,
        message: "Forbidden - Invalid User",
        data: null,
      };
      return c.json(response, 403);
    }
    
    // Check if category exists and belongs to the user
    const existingCategory = await db
      .select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.id, body.id),
          eq(categoriesTable.userId, body.userId),
          eq(categoriesTable.isDeleted, 0)
        )
      );

    if (existingCategory.length === 0) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Category not found or already deleted.",
        data: null,
      };
      return c.json(response, 404);
    }

    // 1. Soft delete the category by setting isDeleted = 1
    const updatedCategory = await db
      .update(categoriesTable)
      .set({
        isDeleted: 1,
        updatedAt: new Date().toISOString(),
        updatedBy: userInfo?.name,
      })
      .where(
        and(
          eq(categoriesTable.id, body.id),
          eq(categoriesTable.userId, body.userId)
        )
      )
      .returning();

    // 2. Find all paperworksCategories records for this category
    const paperworksCategories = await db
      .select()
      .from(paperworksCategoriesTable)
      .where(
        and(
          eq(paperworksCategoriesTable.categoryId, body.id),
          eq(paperworksCategoriesTable.isDeleted, 0)
        )
      );

    // Get the paperwork IDs related to this category
    const paperworkIds = paperworksCategories.map(pc => pc.paperworkId);

    // 3. Soft delete all paperworksCategories records for this category
    let updatedPaperworksCategories = [];
    if (paperworkIds.length > 0) {
      updatedPaperworksCategories = await db
        .update(paperworksCategoriesTable)
        .set({
          isDeleted: 1,
          updatedAt: new Date().toISOString(),
          updatedBy: userInfo?.name,
        })
        .where(
          and(
            eq(paperworksCategoriesTable.categoryId, body.id),
            eq(paperworksCategoriesTable.isDeleted, 0)
          )
        )
        .returning();
    }

    // 4. Find paperworks that no longer have any active categories
    let orphanedPaperworks = [];
    let updatedPaperworks = [];
    
    if (paperworkIds.length > 0) {
      // Find all active paperworksCategories for these paperworks
      const remainingCategories = await db
        .select()
        .from(paperworksCategoriesTable)
        .where(
          and(
            inArray(paperworksCategoriesTable.paperworkId, paperworkIds),
            notInArray(paperworksCategoriesTable.categoryId, [body.id]),
            eq(paperworksCategoriesTable.isDeleted, 0)
          )
        );

      // Get list of paperwork IDs that still have other categories
      const paperworksWithRemainingCategories = [...new Set(remainingCategories.map(rc => rc.paperworkId))];
      
      // Find paperworks that are now orphaned (no remaining categories)
      orphanedPaperworks = paperworkIds.filter(id => !paperworksWithRemainingCategories.includes(id));

      // 5. Soft delete the orphaned paperworks
      if (orphanedPaperworks.length > 0) {
        updatedPaperworks = await db
          .update(paperworksTable)
          .set({
            isDeleted: 1,
            updatedAt: new Date().toISOString(),
            updatedBy: userInfo?.name,
          })
          .where(
            and(
              inArray(paperworksTable.id, orphanedPaperworks),
              eq(paperworksTable.isDeleted, 0)
            )
          )
          .returning();
      }
    }

    const response: GenericResponseInterface = {
      success: true,
      message: `Category '${existingCategory[0].name}' deleted successfully! ${updatedPaperworksCategories.length} paperwork-category associations and ${updatedPaperworks.length} orphaned paperworks were also soft-deleted.`,
      data: {
        category: updatedCategory[0],
        paperworkCategoriesDeleted: updatedPaperworksCategories.length,
        paperworksDeleted: updatedPaperworks.length
      },
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("Error deleting category:", error);

    const response: GenericResponseInterface = {
      success: false,
      message: "Failed to delete category due to an internal error",
      data: null,
    };

    return c.json(response, 500);
  }
});
