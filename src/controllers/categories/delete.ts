import { Elysia, t } from 'elysia';
import { categoriesTable, paperworksTable } from '../../drizzle/schema.ts'
import { db } from '../../drizzle/index.ts'
import type { GenericResponseInterface } from '../../models/GenericResponseInterface.ts';
import {eq, and, ne} from "drizzle-orm"
import {sessionInfo} from "../../middlewares/sessionInfo.ts";
import { ulid } from 'ulid';
import { paperworksCategories } from '../../drizzle/migrations/schema.ts';
export const deleteCategory = (app: Elysia) =>
  app
      .use(sessionInfo)
      .delete('/deleteCategory', async ({ userInfo, body, set }) => {
          // check categoryId exist or not in table categories
          const existingCategory = await db.select().from(categoriesTable).where(
            and(
                eq(categoriesTable.id, body.categoryId),
                eq(categoriesTable.fileId, body.fileId),
            ))
          if (existingCategory.length === 0) {
            set.status = 400
            const res: GenericResponseInterface = {
                success: false,
                message: `Category does not exist!`,
                data: null
            }
            return res
          }
          // Update all associated paperworksCategories to isDeleted = 1
          await db.update(paperworksCategories)
            .set({ 
              isDeleted: 1,
              updatedBy: userInfo.name
            })
            .where(eq(paperworksCategories.categoryId, body.categoryId));
          // update the current name to name_ULID, isDeleted = 1
          await db.update(categoriesTable)
            .set({ 
              name: `${existingCategory[0].name}_${ulid()}`,
              isDeleted: 1,
              updatedBy: userInfo.name
            })
            .where(
              and(
                eq(categoriesTable.id, body.categoryId),
                eq(categoriesTable.fileId, body.fileId)
              )
            );
          // return success response with message and data null
          const res: GenericResponseInterface = {
              success: true,
              message: 'Delete category successfully!',
              data: null
          }
          return res
      }, {
        auth: true,
        body: t.Object({
            fileId: t.String(),
            categoryId: t.String(),
        })
      });