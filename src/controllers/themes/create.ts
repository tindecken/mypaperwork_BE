import { Hono } from "hono";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { tbValidator } from "@hono/typebox-validator";
import { Type as T } from "@sinclair/typebox";
import { db } from "../../../drizzle";
import { themesTable } from "../../db/schema";
import { ulid } from "ulid";
import { sql } from "drizzle-orm";
import { APIError } from "better-auth/api";

const schema = T.Object({
  label: T.String(),
  value: T.String(),
  isDefault: T.Number(),
  description: T.Optional(T.String()),
  isDark: T.Number(),
});

export const createTheme = new Hono();

createTheme.post("/create", tbValidator("json", schema), async (c) => {
  try {
    const body = c.req.valid("json");
    const { label, value, isDefault, isDark, description } = body;
    
    await db.insert(themesTable).values({
      id: ulid(),
      label: label,
      value: value,
      isDefault: isDefault,
      isDark: isDark,
      description: description,
      createdAt: sql`(CURRENT_TIMESTAMP)`,
      createdBy: "system",
    });
    
    const response: GenericResponseInterface = {
      success: true,
      message: "Create theme successfully",
      data: null,
    };
    return c.json(response, 201);
  } catch (error) {
    console.error("Error creating theme:", error);
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
      message: "Failed to create theme due to an internal error",
      data: null,
    };
    return c.json(response, 500);
  }
});