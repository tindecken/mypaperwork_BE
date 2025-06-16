export interface GenericResponseInterface {
    success: boolean,
    message: string,
    data: any,
    pageNumber?: number,
    pageSize?: number,
    totalRecords?: number,
}