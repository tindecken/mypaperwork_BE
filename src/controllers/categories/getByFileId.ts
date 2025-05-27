import { Elysia } from 'elysia';
import {categoriesTable, paperworksCategoriesTable } from '../../drizzle/schema'
import { db } from '../../drizzle'
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import {eq, and, ne } from "drizzle-orm"
import {sessionInfo} from "../../middlewares/sessionInfo.ts";

export const getCategoriesByFileId = (app: Elysia) =>
  app
      .use(sessionInfo)
      .get('/getCategories', async ({ selectedFileId }) => {
        console.log('selectedFileId', selectedFileId)
        const categories = await db.select().from(categoriesTable).where(
            and(
              eq(categoriesTable.fileId, selectedFileId),
              eq(categoriesTable.isDeleted, 0),
              ne(categoriesTable.name, 'Uncategorized')
            )
        )
        const data = await Promise.all(
            categories.map(async (cat) => {
                const paperworkCount = await db.select({id: paperworksCategoriesTable.id}).from(paperworksCategoriesTable).where(
                    and(
                        eq(paperworksCategoriesTable.categoryId, cat.id),
                        eq(paperworksCategoriesTable.isDeleted, 0)
                    )
                )
                return {
                    ...cat,
                    paperworkCount: paperworkCount.length
                }
            })
        )
        const res: GenericResponseInterface = {
          success: true,
          message: `Get ${categories.length} categories successfully!`,
          data: data
        }
        return res
      }, {
        auth: true
      });