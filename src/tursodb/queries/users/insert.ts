import { db } from '../../index';
import { InsertUser, usersTable } from '../../schema';

export async function insertUser(user: InsertUser) {
  return await db.insert(usersTable).values(user);
}
