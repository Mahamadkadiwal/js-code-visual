import { parse, type ParserOptions } from "@babel/parser";
import type * as t from "@babel/types";

const PARSER_OPTIONS: ParserOptions = {
  sourceType: "script",
  plugins: [],
  errorRecovery: false,
};

export function parseCode(source: string): t.File {
  return parse(source, PARSER_OPTIONS);
}
