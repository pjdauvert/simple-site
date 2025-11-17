import type { Handler } from '@netlify/functions';
import { MongoClient } from 'mongodb';
import { getServerEnv, UsersResponseSchema } from './types/index.js';

const env = getServerEnv();

let cachedClient: MongoClient | null = null;

async function getClient() {
  if (!cachedClient) {
    cachedClient = new MongoClient(env.MONGODB_URI);
    await cachedClient.connect();
  }

  return cachedClient;
}

export const handler: Handler = async () => {
  try {
    const client = await getClient();
    const db = client.db('app');
    const collection = db.collection('users');
    const rawUsers = await collection.find({}).limit(10).toArray();

    const users = UsersResponseSchema.parse(
      rawUsers.map((user) => ({
        _id: String(user._id),
        name: user.name,
        email: user.email,
      }))
    );

    return {
      statusCode: 200,
      body: JSON.stringify(users),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'DB_ERROR' }),
    };
  }
};
