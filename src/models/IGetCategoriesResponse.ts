import { SelectCategory } from "../db/schema";

export interface CategoryWithPaperworkCount extends SelectCategory {
    paperworkCount: number;
}

export type IGetCategoriesResponse = CategoryWithPaperworkCount[];