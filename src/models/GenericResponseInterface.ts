export interface GenericResponseInterface {
    success: boolean,
    message: string,
    data: Object | null,
    pageNumber?: number,
    pageSize?: number,
    totalRecords?: number,
}