/**
 * Seed Blobs Script
 * 
 * This Netlify function seeds the blob store with initial data from static JSON files.
 * Run this endpoint once after starting `netlify dev` to initialize your local blob store.
 * 
 * Usage: 
 *   1. Start netlify dev: `netlify dev`
 *   2. Call this endpoint: `curl -X POST http://localhost:8888/.netlify/functions/seed-blobs`
 * 
 * Or you can visit http://localhost:8888/.netlify/functions/seed-blobs in your browser (GET request)
 */

import { getStore } from '@netlify/blobs';
import { SiteConfigSchema, I18nSchema } from '@simple-site/interfaces';
import siteConfig from './modules/seed/siteConfig.json';
import translations from './modules/seed/i18n.json';
import type { Context } from '@netlify/functions';

export default async (_request: Request, _context: Context) => {
    // If running in netlify development context, seed the blob store with data from test/siteConfig.json and test/i18n.json, otherwise return not implemented
    if (!process.env.SEED_BLOBS) {
        return new Response(
            JSON.stringify({
                success: false,
                message: 'Not implemented',
            }),
            { status: 501, headers: { 'Content-Type': 'application/json' } }
        );
    }

    console.log(`Seeding blob store with data from test/siteConfig.json and test/i18n.json`);

    const STORE_NAME = `${process.env.APP_NAME}-store`;

    try {
        const store = getStore(STORE_NAME);

        // Seed config
        await store.set('config', JSON.stringify(SiteConfigSchema.parse(siteConfig)));
        console.log(`✅ Seeded config to store: ${STORE_NAME}`);

        // Seed translations
        await store.set('translations', JSON.stringify(I18nSchema.parse(translations)));
        console.log(`✅ Seeded translations to store: ${STORE_NAME}`);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Blob store seeded successfully',
                store: STORE_NAME,
                seeded: ['config', 'translations']
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error('Failed to seed blob store:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};

export const config = {
    path: '/api/seed-blobs'
};

