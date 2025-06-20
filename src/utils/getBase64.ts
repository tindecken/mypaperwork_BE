import { readFile } from "fs/promises";
import * as path from "path";

/**
 * Reads a file and returns its contents as a base64 string
 * @param filePath Path to the file
 * @returns Promise<string> Base64 string
 */
export async function getFileBase64(filePath: string): Promise<string> {
  try {
    // Ensure the path is absolute
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    
    // Read the file
    const fileBuffer = await readFile(absolutePath);
    
    // Convert to base64
    const base64String = fileBuffer.toString('base64');
    
    return base64String;
  } catch (error) {
    console.error(`Error reading file at ${filePath}: ${error}`);
    throw error;
  }
}
