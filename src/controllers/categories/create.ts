import { Elysia, t } from 'elysia';
import { categoriesTable } from '../../drizzle/schema'
import { db } from '../../drizzle'
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import {eq, and} from "drizzle-orm"
import { ulid } from 'ulid'

export const createCategory = (app: Elysia) =>
  app.post('/create', async ({ body, set }) => {
    var existingCategoryByName = await db.select().from(categoriesTable).where(
      and(
        eq(categoriesTable.name, body.name),
        eq(categoriesTable.isDeleted, 0)
      )
    )
    if(existingCategoryByName.length > 0) {
      set.status = 409
      const res: GenericResponseInterface = {
        success: false,
        message: `Category with the same name already exists!`,
        data: null
      }
      return res
    }
    const newCategory: typeof categoriesTable.$inferInsert = {
      id: ulid(),
      userId: body.userId,
      name: body.name,
      note: body.note,
    }
    const createdCategory = await db
      .insert(categoriesTable)
      .values(newCategory)
      .returning()
    const res: GenericResponseInterface = {
      success: true,
      message: `Create category ${createdCategory[0].name} successfully!`,
      data: createdCategory
    }
    return res
  }, {
    body: t.Object({
      userId: t.String(),
      name: t.String(),
      note: t.Optional(t.String())
    }),
  })