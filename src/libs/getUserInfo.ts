import { Context } from 'hono';
import { auth } from '../better-auth/auth';

/**
 * Checks if a user is authenticated by examining the Hono context
 * @param c The Hono context object
 * @returns true if the user is logged in, false otherwise
 */
export const getUserInfo = (c: Context): typeof auth.$Infer.Session.user | null => {
  const user = c.get('user');
  return user;
};
