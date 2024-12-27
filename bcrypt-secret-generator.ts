import {randomBytes} from 'crypto';

/**
 * Generate a strong secret for bcrypt.
 * @param length - The desired length of the secret.
 * @returns A base64-encoded string for use as a bcrypt secret.
 */
export const generateBcryptSecret = (length: number = 32): string => {
  if (length < 16) {
    throw new Error('Secret length should be at least 16 bytes for security.');
  }
  return randomBytes(length).toString('base64');
};

const secret = generateBcryptSecret(32);
console.log('Generated bcrypt secret:', secret);
