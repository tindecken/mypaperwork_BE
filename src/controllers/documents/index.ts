import { Elysia } from "elysia";
import { addDocuments } from "./add";
import { removeDocuments } from "./remove";
import { setCover } from "./setCover.ts";
import { download } from "./download.ts";

export const documentsController = new Elysia({ prefix: "/documents" })
  .use(addDocuments)
  .use(removeDocuments)
  .use(setCover)
  .use(download)
