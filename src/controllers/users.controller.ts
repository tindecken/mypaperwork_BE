import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../tursodb/index';
import { filesTable, SelectUser, usersFilesTable, usersTable} from '../tursodb/schema';
import { eq, and } from 'drizzle-orm';
import { GenericResponse } from "../models/GenericResponse";


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
                }, (app) => {
                return app
                    // This route is protected by the Guard above
                    .post('/login', async ({body, jwt, set}) => {
                        const res: GenericResponse = {}
                        const user = await db.select().from(usersTable).where(eq(usersTable.userName, body.username));
                        if (user.length === 0) {
                            set.status = 400;
                            return 'Invalid username or password';
                        }
                        const isPasswordValid = await Bun.password.verify(body.password, user[0].password);
                        if (!isPasswordValid) {
                            set.status = 400;
                            return 'Invalid username or password';
                        }
                        // Get selected files
                        const associatedUsersFiles = await db.select().from(usersFilesTable).where(eq(usersFilesTable.userId, user[0].id));
                        if (associatedUsersFiles.length === 0) {
                            res.data
                        }

                        return {
                            user: user[0], selectedFiles,
                        };
                        // Generate JWT token
                        const token = jwt.sign(user[0]);
                        set.headers = {Authorization: `Bearer ${token}`};
                        return token;

                    });
            })
    );