import { Elysia, t } from 'elysia';
import { categoriesTable } from '../../drizzle/schema.ts'
import { db } from '../../drizzle/index.ts'
import type { GenericResponseInterface } from '../../models/GenericResponseInterface.ts';
import {eq, and, ne} from "drizzle-orm"
import {sessionInfo} from "../../middlewares/sessionInfo.ts";

export const editCategory = (app: Elysia) =>
  app
      .use(sessionInfo)
      .put('/editCategory', async ({ userInfo, body, set }) => {
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
          // check duplicate category name
          const existingCategoryByName = await db.select().from(categoriesTable).where(
            and(
                eq(categoriesTable.name, body.name),
                eq(categoriesTable.fileId, body.fileId),
                ne(categoriesTable.id, body.categoryId),
            ))
          if (existingCategoryByName.length > 0) {
            set.status = 409
            const res: GenericResponseInterface = {
                success: false,
                message: `Category with the same name already exists!`,
                data: null
            }
            return res
          }

          // update category in table categories with updated information
          await db.update(categoriesTable).set({
              name: body.name,
              description: body.description,
              updatedBy: userInfo.userName
          }).where(eq(categoriesTable.id, body.categoryId))

          // return success response with message and data null
          const res: GenericResponseInterface = {
              success: true,
              message: 'Edit category successfully!',
              data: null
          }
          return res
      }, {
          auth: true,
          body: t.Object({
              fileId: t.String(),
              categoryId: t.String(),
              name: t.String(),
              description: t.Optional(t.String())
          })
      });