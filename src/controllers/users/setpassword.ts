import { Hono } from "hono";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { tbValidator } from "@hono/typebox-validator";
import { auth } from "../../better-auth/auth";
import { Type as T } from "@sinclair/typebox";
import { getUserInfo } from "../../libs/getUserInfo";
import { APIError } from "better-auth/api";

const schema = T.Object({
  password: T.String({ minLength: 6, maxLength: 100 }),
});

// set password for user if user register via OAuth
export const setPassword = new Hono();

setPassword.post("/setpassword", tbValidator("json", schema), async (c) => {
  try {
    // Get headers from the request
    const requestHeaders = c.req.raw.headers;
    // Convert headers to a plain object
    const headersObj = Object.fromEntries(requestHeaders);
    const body = await c.req.json();
    const userInfo = getUserInfo(c);
    if (!userInfo) {
      const response: GenericResponseInterface = {
        success: false,
        message: "Unauthorized - Authentication required",
        data: null,
      };
      return c.json(response, 401);
    }
    await auth.api.setPassword({
      body: {
        newPassword: body.password,
      },
      headers: headersObj,
    })
    const response: GenericResponseInterface = {
      success: true,
      message: "Set password successfully",
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