import { Hono } from "hono";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";

import {
  InsertPaperworksCategories,
  paperworksCategoriesTable,
  paperworksTable,
} from "../../db/schema";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { getUserInfo } from "../../libs/getUserInfo";
import { isAuthenticated } from "../../libs/isAuthenticated";
import { isPaperworkExisted } from "../../libs/isPaperworkExisted";
import { ulid } from "ulid";

const schema = T.Object({
  paperworkId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
  categoryIds: T.Array(T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" })),
});

export const updateCategoriesByPaperworkId = new Hono();

updateCategoriesByPaperworkId.put(
  "/updateCategoriesByPaperworkId",
  tbValidator("json", schema),
  async (c) => {
    // Check if user is authenticated
    if (!isAuthenticated(c)) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Unauthorized - Authentication required",
        data: null,
      };
      return c.json(response, 401);
    }
    const body = await c.req.json();
    const paperworkId = body.paperworkId;
    const categoryIds = body.categoryIds;
    const userInfo = getUserInfo(c);

    // check paperwork is existed or not
    const isPPWExisted = await isPaperworkExisted(paperworkId, c);
    if (!isPPWExisted) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Paperwork not found",
        data: null,
      };
      return c.json(response, 404);
    }
    // delete all associated paperwork categories
    await db
      .delete(paperworksCategoriesTable)
      .where(eq(paperworksCategoriesTable.paperworkId, body.paperworkId));
    // re-add the paperwork categories
    await Promise.all(
      categoryIds.map(async (categoryId: string) => {
        const paperworkCategory: InsertPaperworksCategories = {
          id: ulid(),
          paperworkId: body.paperworkId,
          categoryId,
          createdBy: userInfo?.name,
          isDeleted: 0,
        };
        await db.insert(paperworksCategoriesTable).values(paperworkCategory);
      })
    );
    // update paperwork updatedAt and updatedBy
    await db
      .update(paperworksTable)
      .set({
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedBy: userInfo?.name,
      })
      .where(eq(paperworksTable.id, body.paperworkId));
    const response: GenericResponseInterface = {
      success: true,
      message: "Paperwork categories updated successfully",
      data: null,
    };
    return c.json(response, 200);
  }
);
