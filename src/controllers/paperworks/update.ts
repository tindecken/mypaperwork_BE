import { Hono } from "hono";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";

import { paperworksTable, type InsertPaperwork } from "../../db/schema";
import { db } from "../../db";
import { and, eq } from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { getUserInfo } from "../../libs/getUserInfo";
import { isAuthenticated } from "../../libs/isAuthenticated";

const schema = T.Object({
  paperworkId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
  name: T.String({ maxLength: 200 }),
  note: T.Optional(T.String({ maxLength: 2000 })),
  issueAt: T.Optional(T.String()),
  customFields: T.Optional(T.String()),
});

export const updatePaperWork = new Hono();

updatePaperWork.put("/update", tbValidator("json", schema), async (c) => {
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
  // check customFields is valid JSON object
  const regex =
    /^\[\s*(?:\{\s*"key"\s*:\s*"[^"]*"\s*,\s*"value"\s*:\s*"[^"]*"\s*\}(?:\s*,\s*\{\s*"key"\s*:\s*"[^"]*"\s*,\s*"value"\s*:\s*"[^"]*"\s*\})*)\s*\]$/;
  const customFields = body.customFields as string;
  if (customFields && !regex.test(customFields)) {
    const response: GenericResponseInterface = {
      success: false,
      message: "customFields must be a valid JSON array with key and value",
      data: null,
    };
    return c.json(response, 400);
  }

  const userInfo = getUserInfo(c);
  const paperworkId = body.paperworkId;

  // Check if paperwork exists
  const existingPaperwork = await db
    .select()
    .from(paperworksTable)
    .where(
      and(eq(paperworksTable.id, paperworkId), eq(paperworksTable.isDeleted, 0), eq(paperworksTable.userId, userInfo?.id!))
    );

  if (existingPaperwork.length === 0) {
    const response: GenericResponseInterface = {
      success: false,
      message: "Paperwork not found",
      data: null,
    };
    return c.json(response, 404);
  }

  // Update paperwork
  const updatedPaperwork = await db
    .update(paperworksTable)
    .set({
      name: body.name,
      note: body.note,
      issuedAt: body.issueAt,
      customFields: body.customFields ? JSON.parse(body.customFields) : null,
      updatedBy: userInfo?.name,
    })
    .where(eq(paperworksTable.id, paperworkId))
    .returning();

  const response: GenericResponseInterface = {
    success: true,
    message: `Paperwork '${body.name}' updated successfully`,
    data: updatedPaperwork[0],
  };

  return c.json(response, 200);
});
