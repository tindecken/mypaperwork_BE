import { eq, and } from 'drizzle-orm';
import { db } from '../../index';
import { usersTable, SelectUser } from '../../schema';

export async function getUserbyUserName(userName: SelectUser['userName']): Promise<
  Array<{
    id: string;
    name: string;
    userName: string;
    email: string;
    systemRole: string;
    isDeleted: number;
    password: string;
  }>
> {
  return db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.userName, userName), eq(usersTable.isDeleted, 0)));
}
