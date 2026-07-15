import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import { requireNativeModule } from 'expo-modules-core';

// Safely resolve native ExpoCrypto module to avoid calling the JS wrapper and causing recursion
let ExpoCrypto: any = null;
try {
  ExpoCrypto = requireNativeModule('ExpoCrypto');
} catch (e) {
  console.warn('ExpoCrypto native module not found');
}

// Polyfill global.crypto for CryptoJS to generate secure random values on native devices
if (typeof global.crypto === 'undefined') {
  global.crypto = {} as any;
}
if (!global.crypto.getRandomValues) {
  global.crypto.getRandomValues = function (array: any) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      return window.crypto.getRandomValues(array);
    }
    if (ExpoCrypto && typeof ExpoCrypto.getRandomValues === 'function') {
      ExpoCrypto.getRandomValues(array);
      return array;
    }
    // Safe fallback for other environments
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  } as any;
}



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
  const randomBytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomBytes);
  } else if (ExpoCrypto && typeof ExpoCrypto.getRandomValues === 'function') {
    ExpoCrypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
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
