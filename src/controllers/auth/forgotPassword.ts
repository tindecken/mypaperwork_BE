import { Hono } from "hono";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";
import { auth } from "../../better-auth/auth";

const schema = T.Object({
  email: T.String(),
});

export const forgotPassword = new Hono();

forgotPassword.post("/forgotPassword", tbValidator("json", schema), async (c) => {
  try {
    const body = await c.req.json();
    const email = body.email;

    const data = await auth.api.requestPasswordReset({
      body: {
        email,
      },
    });

    const response: GenericResponseInterface = {
      success: true,
      message: (data as any)?.message ?? "Password reset request sent successfully!",
      data: data,
    };
    return c.json(response, 201);
  } catch (error) {
    console.error("Error sending password reset request:", error);

    const response: GenericResponseInterface = {
      success: false,
      message: "Failed to send password reset request due to an internal error",
      data: null,
    };

    return c.json(response, 500);
  }
});
