import { Hono } from "hono";
import { categoriesTable } from "../../db/schema";
import { db } from "../../db";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { eq, and } from "drizzle-orm";
import { ulid } from "ulid";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";
import { isAuthenticated } from "../../libs/isAuthenticated";

const schema = T.Object({
  name: T.String({ maxLength: 100 }),
  note: T.Optional(T.String({ maxLength: 2000 })),
  icon: T.Optional(T.String({ maxLength: 100 })),
  userId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
});

export const createCategory = new Hono();

createCategory.post("/create", tbValidator("json", schema), async (c) => {
  try {
    // Check if user is authenticated
    if (!isAuthenticated(c)) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Unauthorized - Authentication required",
        data: null,
      };
      return c.json(response, 401);
    }
    
    // Get and parse the request body
    const body = await c.req.json();

    // Check if category already exists for this user
    const existingCategory = await db
      .select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.name, body.name),
          eq(categoriesTable.userId, body.userId),
          eq(categoriesTable.isDeleted, 0)
        )
      );
    if (existingCategory.length > 0) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Category was already existed.",
        data: null,
      };
      return c.json(response, 400);
    }

    // Create new category
    const newCategory = {
      id: ulid(),
      name: body.name,
      note: body.note || null,
      icon: body.icon || null,
      userId: body.userId,
      isDeleted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdCategory = await db
      .insert(categoriesTable)
      .values(newCategory)
      .returning();

    const response: GenericResponseInterface = {
      success: true,
      message: `Category '${body.name}' created successfully!`,
      data: createdCategory[0],
    };

    return c.json(response, 201);
  } catch (error) {
    console.error("Error creating category:", error);

    const response: GenericResponseInterface = {
      success: false,
      message: "Failed to create category due to an internal error",
      data: null,
    };

    return c.json(response, 500);
  }
});
