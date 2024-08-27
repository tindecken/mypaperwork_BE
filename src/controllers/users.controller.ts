import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';

export const usersController = (app: Elysia) =>
    app.group('/users', (app: Elysia) =>
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
                        email: t.String(),
                        password: t.String()
                    })
                }, (app: Elysia) => app
                    // This route is protected by the Guard above
                    .post('/', async ({ body, jwt, set }) => {
                        try {
                            const newUser = new User();
                            newUser.username = body.username;
                            newUser.email = body.email;
                            newUser.password = body.password;

                            const savedUser = await newUser.save();

                            // JWT payload is based off user id
                            const accessToken = await jwt.sign({
                                userId: savedUser._id
                            });

                            // Returning JTW to the client (via headers)
                            set.headers = {
                                'X-Authorization': accessToken,
                            };
                            set.status = 201;

                            return newUser;
                        } catch (e: any) {
                            // If unique mongoose constraint (for username or email) is violated
                            if (e.name === 'MongoServerError' && e.code === 11000) {
                                set.status = 422;
                                return {
                                    message: 'Resource already exists!',
                                    status: 422,
                                };
                            }

                            set.status = 500;
                            return {
                                message: 'Unable to save entry to the database!',
                                status: 500,
                            };
                        }
                    }, {
                        onError(handler: Elysia.Handler) {
                            console.log(`wwwwwww  Handler - Status Code: ${handler.set.status}`);
                        }
                    })

            )

            // Guard does not affect the following routes
            .get('/', async ({ set }) => {
                try {
                    const users = await User.find({});
                    return users;
                } catch (e: unknown) {
                    set.status = 500;
                    return {
                        message: 'Unable to retrieve items from the database!',
                        status: 500,
                    };
                }
            })

            .get('/:id', async ({ set, params}) => {
                try {
                    const { id } = params;

                    const existingUser = await User.findById(id);

                    if (!existingUser) {
                        set.status = 404;
                        return {
                            message: 'Requested resource was not found!',
                            status: 404,
                        };
                    }

                    return existingUser;
                } catch (e: unknown) {
                    set.status = 500;
                    return {
                        message: 'Unable to retrieve the resource!',
                        status: 500,
                    };
                }
            })

            .patch('/:id', async ({ body, params, set}) => {
                try {
                    const { id } = params;

                    const changes: Partial<IUser> = body;

                    const updatedUser = await User.findOneAndUpdate(
                        { _id: id },
                        { $set: { ...changes } },
                        { new: true }
                    );

                    if (!updatedUser) {
                        set.status = 404;
                        return {
                            message: `User with id: ${id} was not found.`,
                            status: 404,
                        };
                    }

                    return updatedUser;
                } catch (e: unknown) {
                    set.status = 500;
                    return {
                        message: 'Unable to update resource!',
                        status: 500,
                    };
                }
            })

            .delete('/:id', async ({ params, set }) => {
                try {
                    const { id } = params;

                    const existingUser = await User.findById(id);

                    if (!existingUser) {
                        set.status = 404;
                        return {
                            message: `User with id: ${id} was not found.`,
                            status: 404,
                        };
                    }

                    await User.findOneAndRemove({ _id: id });

                    return {
                        message: `Resource deleted successfully!`,
                        status: 200,
                    };
                } catch (e: unknown) {
                    set.status = 500;
                    return {
                        message: 'Unable to delete resource!',
                        status: 500,
                    };
                }
            })
    );