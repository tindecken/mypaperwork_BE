import { db } from "./index";
import {
  themesTable
} from "./schema";
import { sql } from "drizzle-orm"   ;

// Seed function to populate the database with sample data
export async function seed() {
  try {
    // Truncate tables in reverse order to respect foreign key constraints
    await db.delete(themesTable);

    // Light Themes
    await db.insert(themesTable).values({
        id: "01JY6Y7WV79E4EATEMMC5MTX1F",
        label: "Orange (Light)",
        value: "orange",
        isDefault: 0,
        isDark: 0,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY474KPHB0P7T4H2V60E4GWK",
        label: "Quasar (Light)",
        value: "quasar",
        isDefault: 0,
        isDark: 0,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY474KPJNTCBTHXAZK42XMWZ",
        label: "Blue (Light)",
        value: "blue",
        isDefault: 0,
        isDark: 0,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY474KPJHZZJTQDTYN6PDCRK",
        label: "Hight Contrast (Light)",
        value: "high-contrast",
        isDefault: 1,
        isDark: 0,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY474KPJVZ1JM1M6BJ9JYG8P",
        label: "Synthwave (Light)",
        value: "synthwave",
        isDefault: 0,
        isDark: 0,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY474KPJHGX8D4HWVVW1903R",
        label: "Ocean (Light)",
        value: "ocean",
        isDefault: 0,
        isDark: 0,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY474KPJ4HFGF1V4YP3RVG2B",
        label: "Pastels (Light)",
        value: "pastels",
        isDefault: 0,
        isDark: 0,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY474KPJHPNBBKHFMMEHH79C",
        label: "Sunset (Light)",
        value: "sunset",
        isDefault: 0,
        isDark: 0,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });

    // Dark theme
    await db.insert(themesTable).values({
        id: "01JY5A6C92A319ED3M2V2S7VZA",
        label: "Orange (Dark)",
        value: "orange",
        isDefault: 0,
        isDark: 1,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY5A6C92DTC3W161N8RHB4PT",
        label: "Quasar (Dark)",
        value: "quasar",
        isDefault: 0,
        isDark: 1,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY5A6C93Y8T3B6R9SZD0NAJ9",
        label: "Blue (Dark)",
        value: "blue",
        isDefault: 0,
        isDark: 1,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY5A6C93KQ9H9KDPYZS6H832",
        label: "Hight Contrast (Dark)",
        value: "high-contrast",
        isDefault: 1,
        isDark: 1,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY5A6C939ZATYA9Q5NBFSXPF",
        label: "Synthwave (Dark)",
        value: "synthwave",
        isDefault: 0,
        isDark: 1,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY5A6C93JZ6QZ00APZCVKQQ8",
        label: "Ocean (Dark)",
        value: "ocean",
        isDefault: 0,
        isDark: 1,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY5A6C93PEKFQD2EJPAV7QX5",
        label: "Pastels (Dark)",
        value: "pastels",
        isDefault: 0,
        isDark: 1,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    await db.insert(themesTable).values({
        id: "01JY5A6C93NDVZX8R41QR6WNVB",
        label: "Sunset (Dark)",
        value: "sunset",
        isDefault: 0,
        isDark: 1,
        description: "",
        createdAt: sql`CURRENT_TIMESTAMP`,
        createdBy: "system",
    });
    return { success: true, message: "Create theme successfully." };
  } catch (error) {
    console.error("Error seeding database:", error);
    return { success: false, message: `Error seeding database: ${error}` };
  }
}

// Export a function to run the seed
export async function runSeed() {
  const result = await seed();
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