export interface GenericResponseInterface {
    success: boolean,
    message: string,
    data: object | string | null,
    pageNumber?: number,
    pageSize?: number,
    totalRecords?: number,
}