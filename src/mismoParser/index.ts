import { parseStringPromise } from 'xml2js';
import { z } from 'zod';
import { LoanApplicationSchema } from './schemas';
import { extractLoanSummaryData } from './extractors';

/**
 * Parse XML to JSON
 */
export async function parseXmlToJson(xmlString: string): Promise<z.infer<typeof LoanApplicationSchema>> {
    const result = await parseStringPromise(xmlString, {
        tagNameProcessors: [(name: string) => name.replace('ULDD:', '')], // Remove ULDD: prefix
        explicitArray: false, // Simplify access (use getValue carefully)
        ignoreAttrs: false,
        attrkey: '$',
        charkey: '_', // Keep text content accessible if needed
            normalizeTags: false, // Keep tag case to maintain consistency
            normalize: true, // Trim whitespace from text nodes
    });
    return extractLoanSummaryData(result);
}

// Re-export main types and schemas for external consumers
export { LoanApplicationSchema } from './schemas';
export type { XmlObject } from './xmlHelpers';
