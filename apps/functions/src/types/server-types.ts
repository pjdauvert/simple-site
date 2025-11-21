import type { Context } from "@netlify/functions";

// a standard request handler type for Netlify Functions v2
export type RequestHandler = (request: Request, context: Context) => Promise<Response>;
