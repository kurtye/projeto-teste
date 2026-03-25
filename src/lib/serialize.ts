
/**
 * Deeply sterilizes any object to ensure it is a plain JSON object 
 * with only primitive values. This prevents Next.js 15 serialization 
 * from hitting circular reference or heavy object internal recursion.
 */
export function sterilize<T>(data: T): T {
  if (data === null || data === undefined) return data;
  
  // Hand-rolled recursion to avoid JSON.stringify if it's hitting limits,
  // but for broad compatibility, we use a controlled manual mapping for known types.
  
  if (Array.isArray(data)) {
    return data.map(item => sterilize(item)) as any;
  }
  
  if (typeof data === 'object') {
    // Check if it's a Firestore Timestamp or similar
    if ('seconds' in (data as any) && 'nanoseconds' in (data as any)) {
      return new Date((data as any).seconds * 1000).toISOString() as any;
    }

    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const val = (data as any)[key];
        
        // Only allow primitives, arrays, and plain objects
        if (val === null || val === undefined) {
          result[key] = val;
        } else if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
          result[key] = val;
        } else if (typeof val === 'object') {
          result[key] = sterilize(val);
        }
        // Functions and symbols are dropped
      }
    }
    return result;
  }
  
  return data;
}
