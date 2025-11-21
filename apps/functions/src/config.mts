// Netlify Function v2 that uses the env vars, logs, and returns

import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { withErrorHandler } from './errors/errorHandler';
import { createSuccessResponse } from './handlers/responseHandler';
import { createErrorResponse } from './handlers/responseHandler';
import { ErrorResponses } from './errors/error';

export const config: Config = {
  method: ['GET', 'POST'],
  path: '/api/config',
};

const APP_NAME = 'simple-site';
const CONFIG_KEY = 'config';

const configHandler = async (request: Request, _context: Context) => {
  // Get the store name from the environment
  const STORE_NAME = `${APP_NAME}-store`;
  const configStore = getStore(STORE_NAME);
  
  if(request.method === 'GET') {
    const appConfig = await configStore.get(CONFIG_KEY);
    if(!appConfig) {
      return createErrorResponse(ErrorResponses.notFound(request.url));
    }
    return createSuccessResponse(appConfig);
  } else if(request.method === 'POST') {
    // Read and parse the request body
    const body = await request.text();
    if(!body) {
      return createErrorResponse(ErrorResponses.invalidRequest('Request body is required'));
    }
    // Validate that it's valid JSON
    try {
      JSON.parse(body);
    } catch (error) {
      return createErrorResponse(ErrorResponses.invalidRequest('Invalid JSON in request body'));
    }
    
    // Store the configuration
    await configStore.set(CONFIG_KEY, body);
    
    return createSuccessResponse({ message: 'Configuration updated successfully' });
  } else {
    return createErrorResponse(ErrorResponses.methodNotAllowed(request.method, ['GET', 'POST']));
  }
};

export default withErrorHandler(configHandler);

