import { Elysia } from "elysia";
import { createPaperWork } from "./create";
import { updatePaperWork } from "./update";
import { deletePaperWork } from "./delete";
import { getByFileid } from "./getByFileId";
import { getById } from "./getByPaperworkId";
import { getByIdReturnBlob } from "./getByPaperworkId";
import { getByCategoryId } from "./getByFileIdCategoryId";

// Notes: deleteFile not imported for safety reasons

export const paperworksController = new Elysia({ prefix: "/paperworks" })
  .use(createPaperWork)
  .use(updatePaperWork)
  .use(deletePaperWork)
  .use(getByFileid)
  .use(getById)
  .use(getByCategoryId)
  .use(getByIdReturnBlob);
