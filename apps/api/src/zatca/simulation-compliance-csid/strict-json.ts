/** Bounded JSON parser that preserves the distinction between duplicate and unique members. */
export class StrictJsonError extends Error {
  constructor(readonly code: "JSON_INVALID" | "JSON_DUPLICATE_MEMBER" | "JSON_LIMIT_EXCEEDED") {
    super("Structured JSON was rejected.");
    this.name = "StrictJsonError";
  }
}

export function parseStrictJson(input: Buffer | string, maxDepth = 16): unknown {
  const text = Buffer.isBuffer(input) ? input.toString("utf8") : input;
  let offset = 0;
  const skipWhitespace = (): void => {
    while (offset < text.length && /[\x20\x09\x0a\x0d]/u.test(text[offset]!)) offset += 1;
  };
  const parseString = (): string => {
    const start = offset;
    if (text[offset] !== '"') throw new StrictJsonError("JSON_INVALID");
    offset += 1;
    while (offset < text.length) {
      const char = text[offset]!;
      if (char === '"') {
        offset += 1;
        try { return JSON.parse(text.slice(start, offset)) as string; } catch { throw new StrictJsonError("JSON_INVALID"); }
      }
      if (char === "\\") {
        offset += 1;
        if (offset >= text.length) throw new StrictJsonError("JSON_INVALID");
        const escaped = text[offset]!;
        if (escaped === "u") {
          const hex = text.slice(offset + 1, offset + 5);
          if (!/^[0-9a-f]{4}$/iu.test(hex)) throw new StrictJsonError("JSON_INVALID");
          offset += 5;
          continue;
        }
        if (!'"\\/bfnrt'.includes(escaped)) throw new StrictJsonError("JSON_INVALID");
        offset += 1;
        continue;
      }
      if (char.charCodeAt(0) < 0x20) throw new StrictJsonError("JSON_INVALID");
      offset += 1;
    }
    throw new StrictJsonError("JSON_INVALID");
  };
  const parseValue = (depth: number): unknown => {
    if (depth > maxDepth) throw new StrictJsonError("JSON_LIMIT_EXCEEDED");
    skipWhitespace();
    const char = text[offset];
    if (char === "{") {
      offset += 1;
      skipWhitespace();
      const value: Record<string, unknown> = {};
      const keys = new Set<string>();
      if (text[offset] === "}") { offset += 1; return value; }
      while (true) {
        skipWhitespace();
        const key = parseString();
        if (keys.has(key)) throw new StrictJsonError("JSON_DUPLICATE_MEMBER");
        keys.add(key);
        skipWhitespace();
        if (text[offset] !== ":") throw new StrictJsonError("JSON_INVALID");
        offset += 1;
        value[key] = parseValue(depth + 1);
        skipWhitespace();
        if (text[offset] === "}") { offset += 1; return value; }
        if (text[offset] !== ",") throw new StrictJsonError("JSON_INVALID");
        offset += 1;
      }
    }
    if (char === "[") {
      offset += 1;
      skipWhitespace();
      const value: unknown[] = [];
      if (text[offset] === "]") { offset += 1; return value; }
      while (true) {
        value.push(parseValue(depth + 1));
        skipWhitespace();
        if (text[offset] === "]") { offset += 1; return value; }
        if (text[offset] !== ",") throw new StrictJsonError("JSON_INVALID");
        offset += 1;
      }
    }
    if (char === '"') return parseString();
    const number = text.slice(offset).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u)?.[0];
    if (number) { offset += number.length; return Number(number); }
    for (const [literal, value] of [["true", true], ["false", false], ["null", null]] as const) {
      if (text.startsWith(literal, offset)) { offset += literal.length; return value; }
    }
    throw new StrictJsonError("JSON_INVALID");
  };
  const value = parseValue(0);
  skipWhitespace();
  if (offset !== text.length) throw new StrictJsonError("JSON_INVALID");
  return value;
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
