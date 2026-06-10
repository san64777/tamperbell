import { type ParseError, parse } from "jsonc-parser";

export interface ParseResult {
  value: unknown;
  parseError: boolean;
}

// Tolerant parse for strict JSON and JSONC (comments, trailing commas). Strips a leading
// UTF-8 BOM. Never throws.
export function parseConfig(bytes: string): ParseResult {
  const errors: ParseError[] = [];
  const value = parse(bytes.replace(/^\uFEFF/, ""), errors, {
    allowTrailingComma: true,
    disallowComments: false,
  });
  return { value: value ?? null, parseError: errors.length > 0 || value === undefined };
}
