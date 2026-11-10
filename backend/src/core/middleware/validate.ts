import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export interface ValidationTargets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validateRequest = (schemaOrTargets: ZodSchema | ValidationTargets) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if ("parseAsync" in schemaOrTargets || "safeParse" in schemaOrTargets) {
        req.body = await (schemaOrTargets as ZodSchema).parseAsync(req.body);
      } else {
        const targets = schemaOrTargets as ValidationTargets;
        if (targets.body) {
          req.body = await targets.body.parseAsync(req.body);
        }
        if (targets.query) {
          req.query = (await targets.query.parseAsync(req.query)) as any;
        }
        if (targets.params) {
          req.params = (await targets.params.parseAsync(req.params)) as any;
        }
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(error);
      }
    }
  };
};
