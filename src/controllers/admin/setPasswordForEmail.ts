import { Hono } from "hono";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { tbValidator } from "@hono/typebox-validator";
import { auth } from "../../better-auth/auth";
import { Type as T } from "@sinclair/typebox";
import { APIError } from "better-auth/api";
import { db } from "../../db";
import { accountsTable, usersTable } from "../../db/schema";
import { eq } from "drizzle-orm";

const schema = T.Object({
  email: T.String(),
  password: T.String(),
});

// set password for user if user register via OAuth
export const setPasswordForEmail = new Hono();

setPasswordForEmail.post("/setPasswordForEmail", tbValidator("json", schema), async (c) => {
  try {
    const ctx = await auth.$context;
    const body = await c.req.json();
    const email = body.email;
    const password = body.password;
    const hashedPassword = await ctx.password.hash(password);
    const user = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (user.length === 0) {
      const response: GenericResponseInterface = {
        success: false,
        message: "User not found",
        data: null,
      };
      return c.json(response, 404);
    }
    await db.update(accountsTable).set({
      password: hashedPassword,
    }).where(eq(accountsTable.userId, user[0].id));
    const response: GenericResponseInterface = {
      success: true,
      message: "Set password for user email: " + email + " successfully",
      data: null,
    };
    return c.json(response, 201);
  } catch (error) {
    console.error("Error setting password:", error);
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
      message: "Failed to set password due to an internal error",
      data: null,
    };
    return c.json(response, 500);
  }
});