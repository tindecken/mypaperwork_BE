import { Context } from "hono";
import { AuthType } from "../../better-auth/auth";

/**
 * Gets the logged-in user information from the Hono context
 * @param c Hono Context with AuthType variables
 * @returns User object if logged in, null otherwise
 */
export const getUserInfo = async (c: Context<{ Variables: AuthType }>) => {
  const user = c.get("user");
  if (!user) return null;
  
  return user;
};
