import type { Context } from "@netlify/functions";
import { z } from "zod";
import type { RequestHandler } from "../types/server-types";

export interface ModuleEnv {
    USE_MODULE: boolean;
}

type ModuleEnvChecker = (moduleName: string, moduleEnvDefinition: z.ZodSchema<ModuleEnv>, handler: RequestHandler) => RequestHandler;

// a hook function to ensure the module is enabled, and the environment variables are valid
export const withModuleEnvChecker: ModuleEnvChecker = (moduleName, moduleEnvDefinition, handler) => {
  return async (request: Request, context: Context) => {
    const moduleEnv = await moduleEnvDefinition.safeParseAsync(process.env);
    if(!moduleEnv.success) {
        console.error(`Error parsing ${moduleName} environment variables`, moduleEnv.error);
        throw moduleEnv.error;   
    }
    return handler(request, context);
  }
}