import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import {
  ContactRequestSchema,
  ContactResponseSchema,
} from '@simple-site/interfaces';
import { getServerEnv } from './types/index.js';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const env = getServerEnv();

  try {
    const parsed = ContactRequestSchema.safeParse(JSON.parse(event.body || '{}'));
    if (!parsed.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'INVALID_BODY',
          issues: parsed.error.issues,
        }),
      };
    }

    const { name, email, message } = parsed.data;
    const auth = Buffer.from(`api:${env.MAILGUN_API_KEY}`).toString('base64');

    const subject = `New contact from ${name}`;
    const text = `Name: ${name}\nEmail: ${email}\nMessage: ${message}`;

    const response = await fetch(`https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from: `noreply@${env.MAILGUN_DOMAIN}`,
        to: env.MAILGUN_TO_EMAIL,
        subject,
        text,
      }).toString(),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Mailgun error', response.status, body);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'MAILGUN_ERROR' }),
      };
    }

    const result = ContactResponseSchema.parse({ ok: true });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error(`Error sending email with mailgun: ${error}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SERVER_ERROR' }),
    };
  }
};
