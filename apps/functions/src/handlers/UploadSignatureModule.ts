import { createHmac } from 'crypto';
import type { RequestHandler } from '../types/server-types';
import { BaseHandler } from './BaseHandler';
import { ErrorResponses } from '../errors/error';

function utcDateString(ms: number): string {
  return new Date(ms)
    .toISOString()
    .replace(/-/g, '/')
    .replace(/T/, ' ')
    .replace(/\.\d+Z$/, '+00:00');
}

export class UploadSignatureModule extends BaseHandler {
  override handle: RequestHandler = async (request) => {
    const path = request.url;
    try {
      const authKey    = Netlify.env.get('TRANSLOADIT_KEY');
      const authSecret = Netlify.env.get('TRANSLOADIT_SECRET');
      const templateId = Netlify.env.get('TRANSLOADIT_TEMPLATE_ID');

      if (!authKey || !authSecret || !templateId) {
        throw ErrorResponses.configurationError(
          'Transloadit credentials not configured — set TRANSLOADIT_KEY, TRANSLOADIT_SECRET, TRANSLOADIT_TEMPLATE_ID',
          undefined,
          path,
        );
      }

      const expires = utcDateString(Date.now() + 60 * 60 * 1000);

      const params = JSON.stringify({
        auth: { key: authKey, expires },
        template_id: templateId,
      });

      const signature = `sha384:${createHmac('sha384', authSecret)
        .update(Buffer.from(params, 'utf-8'))
        .digest('hex')}`;

      return this.createSuccessResponse({ params, signature });
    } catch (error) {
      return this.handleError(error, path);
    }
  };
}
