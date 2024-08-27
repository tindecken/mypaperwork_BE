export interface GenericResponse {
    data?: object;
    error?: object;
    message: string;
    totalRecords?: number;
    totalFilteredRecords?: number;
    pageNumber?: number;
    pageSize?: number;
  }
  