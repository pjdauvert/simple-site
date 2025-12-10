/**
 * Seed Blob Function
 * 
 * This module seeds the blob store with initial data from static JSON files.
 * It may be used in Development when accessing a blob that does not exist yet to initialize your local blob store.
 */

import { type Store } from "@netlify/blobs";
import { z } from "zod";
import { promises as fs } from 'fs';
import path from 'path';

export const seedBlob = async (store: Store, fromFile: string, schema: z.ZodSchema, key: string) => {
    const data = await store.get(key);
    if (process.env.CONTEXT === 'dev' && !data) {
        console.log(`Seeding blob store with data from ${fromFile}`);
        const blobPath = path.resolve(__dirname, `./${fromFile}`);
        const blobData = await fs.readFile(blobPath, 'utf8');
        
        // Parse the blob data with the schema
        const parsedData = schema.parse(blobData);

        // Seed the blob
        await store.set(key, JSON.stringify(parsedData));
        console.log(`✅ Seeded ${key} to store}`);
    }
}
