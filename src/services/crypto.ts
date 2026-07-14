import CryptoJS from 'crypto-js';

/**
 * Derives a strong 256-bit encryption key from a master password and salt using PBKDF2.
 * @param masterPassword The user's master password.
 * @param salt A unique salt (e.g., derived from user's email or randomly generated).
 * @returns Hex-encoded key string.
 */
export function deriveKey(masterPassword: string, salt: string): string {
  // Use 1000 iterations for performance on React Native JS thread
  const key = CryptoJS.PBKDF2(masterPassword, salt, {
    keySize: 256 / 32, // 256 bits = 8 words
    iterations: 1000,
    hasher: CryptoJS.algo.SHA256,
  });
  return key.toString();
}

/**
 * Encrypts a string using AES-256.
 * @param plaintext The plain text to encrypt.
 * @param key The derived master key (hex string).
 * @returns Ciphertext string.
 */
export function encryptData(plaintext: string, key: string): string {
  if (!plaintext) return '';
  return CryptoJS.AES.encrypt(plaintext, key).toString();
}

/**
 * Decrypts an AES-256 encrypted string.
 * @param ciphertext The encrypted text.
 * @param key The derived master key (hex string).
 * @returns Plaintext string, or empty string if decryption fails.
 */
export function decryptData(ciphertext: string, key: string): string {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      console.warn('Decryption resulted in empty string, likely incorrect key');
      return '';
    }
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

/**
 * Generates a random salt (hex string).
 */
export function generateRandomSalt(): string {
  return CryptoJS.lib.WordArray.random(128 / 8).toString();
}

/**
 * Generates a strong random password of a given length.
 */
export function generatePassword(
  length = 16,
  options = { uppercase: true, lowercase: true, numbers: true, symbols: true }
): string {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let allowedChars = '';
  let guaranteedChars: string[] = [];

  if (options.uppercase) {
    allowedChars += uppercaseChars;
    guaranteedChars.push(uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)]);
  }
  if (options.lowercase) {
    allowedChars += lowercaseChars;
    guaranteedChars.push(lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)]);
  }
  if (options.numbers) {
    allowedChars += numberChars;
    guaranteedChars.push(numberChars[Math.floor(Math.random() * numberChars.length)]);
  }
  if (options.symbols) {
    allowedChars += symbolChars;
    guaranteedChars.push(symbolChars[Math.floor(Math.random() * symbolChars.length)]);
  }

  if (allowedChars.length === 0) {
    allowedChars = lowercaseChars + numberChars;
  }

  const remainingLength = length - guaranteedChars.length;
  for (let i = 0; i < remainingLength; i++) {
    const randomIndex = Math.floor(Math.random() * allowedChars.length);
    guaranteedChars.push(allowedChars[randomIndex]);
  }

  // Shuffle the guaranteed array
  return guaranteedChars.sort(() => Math.random() - 0.5).join('');
}
