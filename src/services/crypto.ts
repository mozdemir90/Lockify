import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import { requireNativeModule } from 'expo-modules-core';

// Safely resolve native ExpoCrypto module
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
    if (!array) return array;

    // Web environment native crypto
    if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
      return window.crypto.getRandomValues(array);
    }

    // Native environment via ExpoCrypto
    if (ExpoCrypto && typeof ExpoCrypto.getRandomValues === 'function') {
      try {
        // Native ExpoCrypto requires a Uint8Array. Create a Uint8Array view over array's buffer.
        const uint8 = array instanceof Uint8Array 
          ? array 
          : new Uint8Array(array.buffer, array.byteOffset || 0, array.byteLength || array.length);
        
        ExpoCrypto.getRandomValues(uint8);
        return array;
      } catch (e) {
        console.warn('ExpoCrypto.getRandomValues native call failed, using fallback:', e);
      }
    }

    // Fallback for any typed array using Math.random
    const uint8Fallback = array instanceof Uint8Array 
      ? array 
      : new Uint8Array(array.buffer, array.byteOffset || 0, array.byteLength || array.length);

    for (let i = 0; i < uint8Fallback.length; i++) {
      uint8Fallback[i] = Math.floor(Math.random() * 256);
    }
    return array;
  } as any;
}

/**
 * Derives a strong 256-bit encryption key from a master password and salt using PBKDF2.
 * @param masterPassword The user's master password.
 * @param salt A unique salt.
 * @returns Hex-encoded key string.
 */
export function deriveKey(masterPassword: string, salt: string): string {
  const key = CryptoJS.PBKDF2(masterPassword, salt, {
    keySize: 256 / 32, // 256 bits = 8 words
    iterations: 1000,
    hasher: CryptoJS.algo.SHA256,
  });
  return key.toString();
}

/**
 * Encrypts a string using AES-256 with a raw WordArray key and IV.
 * @param plaintext The plain text to encrypt.
 * @param keyHex The derived master key (hex string).
 * @returns Ciphertext string.
 */
export function encryptData(plaintext: string, keyHex: string): string {
  if (!plaintext) return '';
  try {
    const key = CryptoJS.enc.Hex.parse(keyHex);
    // Use first 16 bytes of key as IV for deterministic AES-256-CBC without random salt generation
    const iv = CryptoJS.lib.WordArray.create(key.words.slice(0, 4));
    return CryptoJS.AES.encrypt(plaintext, key, { iv }).toString();
  } catch (error) {
    console.error('encryptData error:', error);
    return '';
  }
}

/**
 * Decrypts an AES-256 encrypted string.
 * @param ciphertext The encrypted text.
 * @param keyHex The derived master key (hex string).
 * @returns Plaintext string, or empty string if decryption fails.
 */
export function decryptData(ciphertext: string, keyHex: string): string {
  if (!ciphertext) return '';
  try {
    const key = CryptoJS.enc.Hex.parse(keyHex);
    const iv = CryptoJS.lib.WordArray.create(key.words.slice(0, 4));
    const bytes = CryptoJS.AES.decrypt(ciphertext, key, { iv });
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      console.warn('Decryption resulted in empty string');
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
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
    window.crypto.getRandomValues(randomBytes);
  } else if (ExpoCrypto && typeof ExpoCrypto.getRandomValues === 'function') {
    try {
      ExpoCrypto.getRandomValues(randomBytes);
    } catch (e) {
      for (let i = 0; i < randomBytes.length; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }
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

  // Fisher-Yates shuffle algorithm (safe and unbiased)
  for (let i = guaranteedChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [guaranteedChars[i], guaranteedChars[j]] = [guaranteedChars[j], guaranteedChars[i]];
  }

  return guaranteedChars.join('');
}
