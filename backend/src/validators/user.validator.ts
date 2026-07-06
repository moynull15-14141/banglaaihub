import { z } from 'zod';

export const userValidator = z.object({});
export type UserValidatorInput = z.infer<typeof userValidator>;
