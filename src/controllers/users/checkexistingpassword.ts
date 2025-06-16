import { Hono } from "hono";
import { accountsTable } from "../../db/schema";
import { db } from "../../db";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { eq, ne, and, isNotNull } from "drizzle-orm";
import { getUserInfo } from "../../libs/getUserInfo";
import { APIError } from "better-auth/api";

export const checkexistingpassword = new Hono();

checkexistingpassword.get("/checkexistingpassword", async (c) => {
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
    const account = await db
      .select()
      .from(accountsTable)
      .where(
        and (
          eq(accountsTable.userId, userInfo.id),
          ne(isNotNull(accountsTable.password), false)
        )
      );
    if (account.length > 0) {
      const response: GenericResponseInterface = {
        success: true,
        message: "Check existing password successfully",
        data: true,
      };
      return c.json(response, 201);
    } else {
      const response: GenericResponseInterface = {
        success: true,
        message: "Check existing password successfully",
        data: false,
      };
      return c.json(response, 201);
    }
  } catch (error) {
    console.error("Error fetching account:", error);
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
      message: "Failed to fetch account due to an internal error",
      data: null,
    };
    return c.json(response, 500);
  }
});