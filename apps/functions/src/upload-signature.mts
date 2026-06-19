import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { UploadSignatureModule } from './handlers/UploadSignatureModule';
import type { RequestHandler } from './types/server-types';

export const config: Config = {
  method: ['POST'],
  path: '/api/upload/signature',
};

const signatureModule = new UploadSignatureModule();
const handler: RequestHandler = new AuthHandler(signatureModule).handle;

export default handler;
