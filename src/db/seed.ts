import { db } from "./index";
import {
  usersTable,
  categoriesTable,
  paperworksTable,
  paperworksCategoriesTable,
  accountsTable,
  documentsTable,
} from "./schema";
import { auth } from '../better-auth/auth';

// Seed function to populate the database with sample data
export async function seed() {
  try {
    // Hash the password
    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash("1Rivaldo@");
    console.log('hashedPassword:', hashedPassword)

    console.log("Starting database seeding...");

    // Truncate tables in reverse order to respect foreign key constraints
    console.log("Truncating existing data...");
    // First delete from documents (child table)
    await db.delete(documentsTable);
    console.log("Truncated documents table.");

    // First delete from paperworksCategories (child table)
    await db.delete(paperworksCategoriesTable);
    console.log("Truncated paperworksCategories table.");
    
    // Delete from accounts table
    await db.delete(accountsTable);
    console.log("Truncated accounts table.");
    
    // Then delete from paperworks
    await db.delete(paperworksTable);
    console.log("Truncated paperworks table.");
    
    // Then delete from categories
    await db.delete(categoriesTable);
    console.log("Truncated categories table.");
    
    // Finally delete from users (parent table)
    await db.delete(usersTable);
    console.log("Truncated users table.");

    // Insert users
    await db.insert(usersTable).values({
      id: "01JWG18JDJGXYCAABMMKB17JRD",
      email: "tindecken@gmail.com",
      name: "tindecken",
      isEmailVerified: false,
      userType: "free",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: 0
    });
    
    await db.insert(usersTable).values({
      id: "01JWG197QYG4TJ5KR4Q0WPJZ3X",
      email: "thaihoang85@gmail.com",
      name: "thaihoang85",
      isEmailVerified: false,
      userType: "free",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: 0
    });
    console.log("Users inserted.");
    
    // Insert accounts with passwords for both users
    await db.insert(accountsTable).values({
      id: "01JWG18JDJGXYCAABMMKB17JRE",
      accountId: "01JWG5WX6APN8GRPH2Z1VPVRPR",
      providerId: "credential",
      userId: "01JWG18JDJGXYCAABMMKB17JRD",
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await db.insert(accountsTable).values({
      id: "01JWG197QYG4TJ5KR4Q0WPJZ3Y",
      accountId: "01JWG5X4D208VPR1JC9ZK7AJDV",
      providerId: "credential",
      userId: "01JWG197QYG4TJ5KR4Q0WPJZ3X",
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log("User accounts with passwords inserted.");

    // Insert categories for user 1
    await db.insert(categoriesTable).values({
      id: "01JWG1BNNC6TYEH2W67BT30HZC",
      userId: "01JWG18JDJGXYCAABMMKB17JRD",
      name: "category 1 user 1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    
    await db.insert(categoriesTable).values({
      id: "01JWG1BNNCT10SH44JEX0PJ5B4",
      userId: "01JWG18JDJGXYCAABMMKB17JRD",
      name: "category 2 user 1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    
    await db.insert(categoriesTable).values({
      id: "01JWG1BNNCCNKAZ2SKKBQ84KKQ",
      userId: "01JWG18JDJGXYCAABMMKB17JRD",
      name: "Uncategorized",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    console.log("Categories for User 1 inserted.");

    // Insert categories for user 2
    await db.insert(categoriesTable).values({
      id: "01JWG1BNNCHEDW838DAZ98THWK",
      userId: "01JWG197QYG4TJ5KR4Q0WPJZ3X",
      name: "category 1 user 1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    
    await db.insert(categoriesTable).values({
      id: "01JWG1BNNC64V7QVQRZTSY2PZJ",
      userId: "01JWG197QYG4TJ5KR4Q0WPJZ3X",
      name: "category 2 user 1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    
    await db.insert(categoriesTable).values({
      id: "01JWG1BNNDG93AV51Q7W2YR89E",
      userId: "01JWG197QYG4TJ5KR4Q0WPJZ3X",
      name: "Uncategorized",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    console.log("Categories for User 2 inserted.");

    // Insert paperworks for user 1
    await db.insert(paperworksTable).values({
      id: "01JWG1BNNDQNJPJ00QV8E4HFSV",
      userId: "01JWG18JDJGXYCAABMMKB17JRD",
      name: "Paperwork 1 User 1",
      customFields: JSON.stringify([{"key":"key1", "value":"value1"}, {"key":"key2", "value":"value2"},{"key":"key3", "value":"value3"},{"key":"key4", "value":"value4"},{"key":"key5", "value":"value5"}]),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    
    await db.insert(paperworksTable).values({
      id: "01JWG1BNND1T2ZEBGPFX8B24QE",
      userId: "01JWG18JDJGXYCAABMMKB17JRD",
      name: "Paperwork 2 User 1",
      customFields: JSON.stringify([{"key":"key1", "value":"value1"}, {"key":"key2", "value":"value2"},{"key":"key3", "value":"value3"},{"key":"key4", "value":"value4"},{"key":"key5", "value":"value5"}]),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    console.log("Paperworks for User 1 inserted.");

    // Insert paperworks for user 2
    await db.insert(paperworksTable).values({
      id: "01JWG1BNNDT526YBTY1GQDSYPN",
      userId: "01JWG197QYG4TJ5KR4Q0WPJZ3X",
      name: "Paperwork 1 User 2",
      customFields: JSON.stringify([{"key":"key1", "value":"value1"}, {"key":"key2", "value":"value2"},{"key":"key3", "value":"value3"},{"key":"key4", "value":"value4"},{"key":"key5", "value":"value5"}]),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    
    await db.insert(paperworksTable).values({
      id: "01JWG1BNNDWV4CRPE63ZF5E590",
      userId: "01JWG197QYG4TJ5KR4Q0WPJZ3X",
      name: "Paperwork 2 User 2",
      customFields: JSON.stringify([{"key":"key1", "value":"value1"}, {"key":"key2", "value":"value2"},{"key":"key3", "value":"value3"},{"key":"key4", "value":"value4"},{"key":"key5", "value":"value5"}]),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    console.log("Paperworks for User 2 inserted.");

    // Insert paperworksCategories for user 1
    await db.insert(paperworksCategoriesTable).values({
      id: "01JWG1BNNDJ5RB75HK5QGYRW6N",
      paperworkId: "01JWG1BNNDQNJPJ00QV8E4HFSV",
      categoryId: "01JWG1BNNCT10SH44JEX0PJ5B4",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    
    await db.insert(paperworksCategoriesTable).values({
      id: "01JWG1BNND7CTD6GAQX300543V",
      paperworkId: "01JWG1BNND1T2ZEBGPFX8B24QE",
      categoryId: "01JWG1BNNCT10SH44JEX0PJ5B4",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    console.log("PaperworksCategories for User 1 inserted.");

    // Insert paperworksCategories for user 2
    await db.insert(paperworksCategoriesTable).values({
      id: "01JWG1BNNDDZPAFK0FE7VKJ5NG",
      paperworkId: "01JWG1BNNDT526YBTY1GQDSYPN",
      categoryId: "01JWG1BNNCHEDW838DAZ98THWK", // Fixed: using the correct category ID for user 2
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    
    await db.insert(paperworksCategoriesTable).values({
      id: "01JWG1BNNDCAECVX9X3EQGPWA9",
      paperworkId: "01JWG1BNNDWV4CRPE63ZF5E590",
      categoryId: "01JWG1BNNC64V7QVQRZTSY2PZJ", // Fixed: using the correct category ID for user 2
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      isDeleted: 0
    });
    console.log("PaperworksCategories for User 2 inserted.");

    console.log("Database seeding completed successfully.");
    
    return { success: true, message: "Database seeded successfully." };
  } catch (error) {
    console.error("Error seeding database:", error);
    return { success: false, message: `Error seeding database: ${error}` };
  }
}

// Export a function to run the seed
export async function runSeed() {
  const result = await seed();
  console.log(result.message);
  return result;
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Failed to seed database:", error);
      process.exit(1);
    });
}