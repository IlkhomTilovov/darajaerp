const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);

const camelToSnakeKey = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const snakeToCamelKey = (key: string) => key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

export function toSnakeCase<T = unknown>(input: T): T {
  if (Array.isArray(input)) return input.map((item) => toSnakeCase(item)) as unknown as T;
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      out[camelToSnakeKey(key)] = toSnakeCase(value);
    }
    return out as T;
  }
  return input;
}

export function toCamelCase<T = unknown>(input: T): T {
  if (Array.isArray(input)) return input.map((item) => toCamelCase(item)) as unknown as T;
  if (isPlainObject(input)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      out[snakeToCamelKey(key)] = toCamelCase(value);
    }
    return out as T;
  }
  return input;
}
