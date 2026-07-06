import { z } from 'zod';

export const datasetValidator = z.object({});
export type DatasetValidatorInput = z.infer<typeof datasetValidator>;
