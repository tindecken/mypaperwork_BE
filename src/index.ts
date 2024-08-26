import { Elysia } from 'elysia';
import { logger } from '@grotto/logysia';
import { securitySetup } from './startup/security'
import { docsSetup } from './startup/docs';
import { hooksSetup } from './startup/hooks';
import { usersController } from './controllers/users.controller';
import { staticDataController } from './controllers/static-data.controller';

const PORT = process.env.PORT || 3000;
export const app = new Elysia();

app
    .use(securitySetup)
    .use(docsSetup)
    .use(logger({
        logIP: false,
        writer: {
            write(msg: string) {
                console.log(msg)
            }
        }
    }))
    .use(hooksSetup)
    .get('/', () => 'Hello Bun.js!')
    .group('/api', (app: Elysia) =>
            app
                .use(usersController)
                .use(staticDataController)
        // and other controllers
    )
    .listen(PORT, () => {
        console.log(`🦊 Elysia is running at ${app.server?.hostname}:${PORT}`);
    });