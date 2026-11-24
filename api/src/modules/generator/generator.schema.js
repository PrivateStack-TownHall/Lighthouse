import { z } from 'zod';
import { paginationQuerySchema } from '../../common/pagination/pagination.js';

/** The generator validates the configuration in depth; here we only check the outer shape. */
export const configBodySchema = z.object({
  config: z.record(z.string(), z.unknown()),
  projectId: z.uuid().optional(),
});
export const listGenerationsSchema = paginationQuerySchema;
export const generationIdSchema = z.object({ id: z.uuid() });
