import { SelectPaperwork } from '../db/schema';
export interface IGetPaperworksResponse extends SelectPaperwork {
  coverBase64: string | null
  coverFileName: string | null
  documentCount: number | null
  categories: string[]
}
