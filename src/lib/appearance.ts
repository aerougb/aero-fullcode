import type { CustomColors } from '@/types';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function normalizeCustomColors(value: unknown): CustomColors {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    ['background', 'surface', 'accent', 'glow']
      .filter((key) => typeof source[key] === 'string' && HEX_COLOR.test(source[key] as string))
      .map((key) => [key, source[key]])
  ) as CustomColors;
}

