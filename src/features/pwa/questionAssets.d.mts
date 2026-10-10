export const questionImageExtensions: readonly string[];
export const questionImageGlob: string;
export const pwaPrecacheGlobPatterns: string[];
export const maximumQuestionImageBytes: number;
export function isQuestionImagePath(src: unknown): src is string;
export function questionImageUrl(src: string, base: string): string | undefined;
