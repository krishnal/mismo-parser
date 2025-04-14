import { z } from 'zod';

/**
 * Parse a string as a date, with error handling for Zod context
 */
export function parseDateString(dateString: string, ctx: z.RefinementCtx): Date {
  if (!dateString) return new Date();
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid date format: ${dateString}`,
      });
      return new Date(); // Return a default date
    }
    return date;
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Failed to parse date: ${dateString}`,
    });
    return new Date(); // Return a default date
  }
}

/**
 * Parse a string as a number, with error handling for Zod context
 */
export function parseNumberString(numString: string | undefined, ctx: z.RefinementCtx): number {
  if (numString === undefined || numString === null || numString === '') return 0;
  
  try {
    const num = Number(numString);
    if (isNaN(num)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid number format: ${numString}`,
      });
      return 0; // Return a default number
    }
    return num;
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Failed to parse number: ${numString}`,
    });
    return 0; // Return a default number
  }
}

/**
 * Parse a string as a boolean, with error handling for Zod context
 */
export function parseBooleanString(boolString: string | undefined, ctx: z.RefinementCtx): boolean {
  if (boolString === undefined || boolString === null || boolString === '') return false;
  
  if (typeof boolString === 'boolean') return boolString;
  
  if (typeof boolString === 'string') {
    const lowerVal = boolString.toLowerCase();
    if (lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1') return true;
    if (lowerVal === 'false' || lowerVal === 'no' || lowerVal === '0') return false;
  }
  
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `Invalid boolean format: ${boolString}`,
  });
  return false; // Return a default boolean
}

// Exported Zod transformers
export const parseMismoDate = z.union([
  z.date(),
  z.string().transform((val, ctx) => parseDateString(val, ctx))
]);

export const parseMismoNumber = z.union([
  z.number(),
  z.string().transform((val, ctx) => parseNumberString(val, ctx))
]);

export const parseMismoBoolean = z.union([
  z.boolean(),
  z.string().transform((val, ctx) => parseBooleanString(val, ctx))
]);
