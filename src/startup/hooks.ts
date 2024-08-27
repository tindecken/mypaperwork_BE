import { Elysia } from 'elysia';
import { GenericResponse } from '../models/GenericResponse';

export const hooksSetup = (app: Elysia) =>
    app
        // Global Error Hook
        .onError(({code, set, error, response}) => {
            console.log('codeeeecodeeeeee', code)
            console.log('error', error.message)
            console.log('response', response)
            const genericResponse: GenericResponse = {
                data: null,
                error: error,
                message: error.message,
                totalRecords: null,
                totalFilteredRecords: null,
                pageNumber: null,
                pageSize: null,
                success: false,
                statusCode: 401
            }
            return new Response('sdfsdf')
        })
        .onAfterHandle(({ request, set }) => {
            // TO avoid logging when running tests
            console.log(`Global Handler - Method: ${request.method} | URL: ${request.url} | Status Code: ${set.status ||= 500}`);
        })