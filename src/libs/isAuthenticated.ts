import { Context } from 'hono';

/**
 * Checks if a user is authenticated by examining the Hono context
 * @param c The Hono context object
 * @returns true if the user is logged in, false otherwise
 */
export const isAuthenticated = (c: Context): boolean => {
  // Get the user from the context, which is set by the auth middleware
  const user = c.get('user');
  // If the user exists (not null and not undefined), the user is authenticated
  return user !== null && user !== undefined;
};
