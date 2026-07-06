import { z } from 'zod';

export const resourceValidator = z.object({});
export type ResourceValidatorInput = z.infer<typeof resourceValidator>;
