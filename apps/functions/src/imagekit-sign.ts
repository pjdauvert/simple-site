import type { Handler } from '@netlify/functions';
import crypto from 'node:crypto';
import { getServerEnv } from './types/index.js';

export const handler: Handler = async () => {
  const env = getServerEnv();
  const expire = Math.floor(Date.now() / 1000) + 60 * 5;
  const token = crypto.randomBytes(16).toString('hex');
  const signature = crypto
    .createHmac('sha1', env.IMAGEKIT_PRIVATE_KEY)
    .update(token + expire)
    .digest('hex');

  return {
    statusCode: 200,
    body: JSON.stringify({
      token,
      expire,
      signature,
      publicKey: env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
    }),
    headers: { 'Content-Type': 'application/json' },
  };
};
