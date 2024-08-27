import { Elysia } from 'elysia';
import { GenericResponse } from '../models/GenericResponse';

export const hooksSetup = (app: Elysia) =>
    app
        .onAfterHandle(({ request, set }) => {
            // TO avoid logging when running tests
            console.log(`Global Handler - Method: ${request.method} | URL: ${request.url} | Status Code: ${set.status ||= 500}`);
        })