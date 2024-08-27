import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../tursodb/index';
import { SelectUser, usersTable } from '../tursodb/schema';
import { eq } from 'drizzle-orm';


export const usersController = (app: Elysia) =>
    app.group('/users', (app) =>
        app
            // Using JWT
            .use(
                jwt({
                    name: 'jwt',
                    secret: process.env.JWT_SECRET as string,
                })
            )
            // Validating required properties using Guard schema
            .guard({
                    body: t.Object({
                        username: t.String(),
                        password: t.String()
                    })
                }, (app) => app
                    // This route is protected by the Guard above
                    .post('/login', async ({ body, jwt, set }) => {
                        const user = await db.select().from(usersTable).where(eq(usersTable.userName, body.username));
                            if (user.length === 0) {
                                set.status = 400;
                                return 'Invalid username or password';
                            }
                            // return first user exclude password field
                            return user[0] as Omit<SelectUser, 'password'>;
                    })

            )
    );