import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { getServerEnv } from './types/index.js';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { endpoint, ...rest } = event.queryStringParameters ?? {};

  if (!endpoint) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'MISSING_ENDPOINT' }),
    };
  }

  const env = getServerEnv();
  const target = new URL(endpoint, 'https://maps.googleapis.com/');

  Object.entries(rest).forEach(([key, value]) => {
    if (value) {
      target.searchParams.set(key, value);
    }
  });

  target.searchParams.set('key', env.GOOGLE_API_KEY_SERVER);

  try {
    const response = await fetch(target.toString());
    const body = await response.text();

    return {
      statusCode: response.status,
      body,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GOOGLE_PROXY_ERROR' }),
    };
  }
};
