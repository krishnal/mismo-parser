// Define types for XML parsing
export type XmlObject = Record<string, any>;
export type PathSegment = string;
export type DefaultValue = any;

/**
 * Gets a value from a nested object via path segments, with special handling for XML structures
 */
export function getValue(obj: XmlObject, pathSegments: PathSegment[], defaultValue: DefaultValue = undefined): any {
    if (!obj) return defaultValue;
    
    let current = obj;
    for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        
        // Try regular segment
        if (current[segment] !== undefined) {
            current = current[segment];
            continue;
        }
        
        // Try with ULDD prefix
        const ulddSegment = 'ULDD:' + segment;
        if (current[ulddSegment] !== undefined) {
            current = current[ulddSegment];
            continue;
        }
        
        // Special handling for OTHER elements in EXTENSION which may contain ULDD prefixed elements
        if (segment === 'OTHER' && current['ULDD:OTHER'] !== undefined) {
            current = current['ULDD:OTHER'];
            continue;
        }
        
        // If we've reached an OTHER element that might contain multiple types of extensions,
        // try to find the right extension element
        if (i > 0 && pathSegments[i-1] === 'OTHER' && i+1 < pathSegments.length) {
            // Look for the extension with or without ULDD prefix
            const nextSegment = pathSegments[i+1];
            const extensionKey = Object.keys(current).find(key => 
                key === segment || 
                key === 'ULDD:' + segment ||
                key.endsWith('_' + segment) ||
                key.endsWith('_EXTENSION')
            );
            
            if (extensionKey) {
                current = current[extensionKey];
                continue;
            }
        }
        
        return defaultValue;
    }
    
    return current;
}

/**
 * Simplified helper for getting a direct value from an object.
 */
export function getDirectValue(obj: XmlObject, key: string, defaultValue: DefaultValue = undefined): any {
    return getValue(obj, [key], defaultValue);
} 