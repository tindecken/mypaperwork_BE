import type { SelectCategory, SelectDocument, SelectPaperwork } from "../db/schema";

export interface IGetPaperworkResponse extends SelectPaperwork {
    categories: SelectCategory[]
    attachments?: SelectDocument[],
    images?: {
        id: string
        fileName: string
        fileSize: number
        filePath: string
        imageBase64?: string | null
        isCover: boolean | null
    }[],
}