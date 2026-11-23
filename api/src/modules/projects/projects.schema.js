import { z } from 'zod';
import { paginationQuerySchema } from '../../common/pagination/pagination.js';

/** The config is the Lighthouse configuration; a saved project may be incomplete (a draft). */
const config = z.record(z.string(), z.unknown());

export const projectIdSchema = z.object({ id: z.uuid() });
export const listProjectsSchema = paginationQuerySchema;
export const createProjectSchema = z.object({ name: z.string().trim().min(1).max(60), config });
export const updateProjectSchema = z
  .object({ name: z.string().trim().min(1).max(60).optional(), config: config.optional() })
  .refine((v) => v.name !== undefined || v.config !== undefined, { message: 'Send name or config' });
