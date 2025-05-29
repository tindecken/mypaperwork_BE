import { Hono } from "hono";
import { Type as T } from "@sinclair/typebox";
import { tbValidator } from "@hono/typebox-validator";

import { paperworksTable, type InsertPaperwork } from "../../db/schema";
import { db } from "../../db";
import { and, eq } from "drizzle-orm";
import type { GenericResponseInterface } from "../../models/GenericResponseInterface";
import { getUserInfo } from "../../libs/getUserInfo";
import { isAuthenticated } from "../../libs/isAuthenticated";

const paramSchema = T.Object({
  paperworkId: T.String({ pattern: "^[0-9A-HJKMNP-TV-Z]{26}$" }),
});

export const updatePaperWork = new Hono();

updatePaperWork.delete("/:paperworkId", tbValidator("param", paramSchema), async (c) => {
  // Check if user is authenticated
  if (!isAuthenticated(c)) {
    const response: GenericResponseInterface = {
      success: false,
      message: "Unauthorized - Authentication required",
      data: null,
    };
    return c.json(response, 401);
  }
  const paperworkId = c.req.param("paperworkId");
  const userInfo = getUserInfo(c);
  

});
