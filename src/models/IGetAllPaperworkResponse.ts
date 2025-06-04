import { SelectPaperwork } from '../db/schema';
export interface IGetAllPaperworkResponse extends SelectPaperwork {
  coverBase64: string | null
  coverFileName: string | null
  documentCount: number | null
  categories: string[]
}
