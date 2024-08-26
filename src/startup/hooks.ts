import { Elysia } from 'elysia';

export const hooksSetup = (app: Elysia) =>
    app
        // Global Error Hook
        .onError(({code, set}) => {
            // "Unhandled" response by Elysia
            if (code === 'NOT_FOUND') {
                set.status = 404
                return {
                    message: 'Page Not Found!',
                    status: 404
                };
            } else {
                // response status will be current status or 500
                set.status ||= 500;
                if (set.status === 400) {
                    return {
                        message: 'Unable to process the data!',
                        status: 400
                    };
                }
                return 'Service unavailable. Please come back later.'
            }
        })
        .onAfterHandle(({ request, set }) => {
            // TO avoid logging when running tests
            if (process.env.NODE_ENV !== 'test') {
                console.log(`Global Handler - Method: ${request.method} | URL: ${request.url} | Status Code: ${set.status ||= 500}`)
            }
        })