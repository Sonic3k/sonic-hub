import { createHash, randomInt } from 'node:crypto';

/*
 * A code is what a player carries from one device to the next: twelve signs, written in three groups of four
 * (K7QM-2XPD-9RBT). The signs leave out 0 and O, 1, I and L, which are misread when a code is copied by hand.
 * Twelve of thirty-one signs is a little under sixty bits: nobody arrives at someone else's code by trying.
 */
const SIGNS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LENGTH = 12;
const WELL_FORMED = new RegExp(`^[${SIGNS}]{${LENGTH}}$`);

/** A new code, as it is shown: XXXX-XXXX-XXXX. */
export function newCode(): string {
  let bare = '';
  for (let i = 0; i < LENGTH; i++) bare += SIGNS[randomInt(SIGNS.length)];
  return formatCode(bare);
}

/** The twelve signs of a code however it was typed (small letters, spaces, dashes), or null if it cannot be one. */
export function bareCode(typed: string): string | null {
  const bare = typed.toUpperCase().replace(/[\s-]+/g, '');
  return WELL_FORMED.test(bare) ? bare : null;
}

export const formatCode = (bare: string): string => `${bare.slice(0, 4)}-${bare.slice(4, 8)}-${bare.slice(8)}`;

/** What is kept of a code: its SHA-256. A code is long and random, so a plain hash is enough to keep it unread. */
export const hashCode = (bare: string): string => createHash('sha256').update(bare).digest('hex');
