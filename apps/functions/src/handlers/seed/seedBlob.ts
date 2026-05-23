/**
 * Seed Blob Function
 * 
 * This module seeds the blob store with initial data from static JSON files.
 * It may be used in Development when accessing a blob that does not exist yet to initialize your local blob store.
 */

import { type Store } from "@netlify/blobs";
import { z } from "zod";

// Import seed data directly - bundled at compile time
import i18nSeedData from './i18n.json';
import siteConfigSeedData from './siteConfig.json';

const seedFiles: Record<string, unknown> = {
    'i18n.json': i18nSeedData,
    'siteConfig.json': siteConfigSeedData,
};

export const seedBlob = async (store: Store, fromFile: string, schema: z.ZodSchema, key: string) => {
    if (Netlify.env.get('CONTEXT') !== 'dev') return;

    const data = await store.get(key);
    if (!data) {
        console.log(`Seeding blob store with data from ${fromFile}`);
        const blobData = seedFiles[fromFile];

        if (!blobData) {
            throw new Error(`Seed file "${fromFile}" not found. Available files: ${Object.keys(seedFiles).join(', ')}`);
        }

        const parsedData = schema.parse(blobData);
        await store.set(key, JSON.stringify(parsedData));
        console.log(`✅ Seeded ${key} to store`);
    }
}
