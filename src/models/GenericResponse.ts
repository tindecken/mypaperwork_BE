export interface GenericResponse {
    data: object | null;
    error: object | null;
    message: string | '';
    totalRecords: number | null;
    totalFilteredRecords: number | null;
    pageNumber: number | null;
    pageSize: number | null;
    success: boolean;
    statusCode: number;
  }
  