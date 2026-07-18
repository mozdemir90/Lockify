import aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';

/**
 * Derives a strong 256-bit encryption key asynchronously using native SHA-256 (1000 rounds).
 * Fast, native C++/Java execution on mobile without stack overflow.
 */
export async function deriveKey(masterPassword: string, salt: string): Promise<string> {
  let current = masterPassword + salt;
  for (let i = 0; i < 1000; i++) {
    current = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, current);
  }
  return current; // 64-char hex string (32 bytes = 256 bits)
}

/**
 * Converts a hex string to Uint8Array bytes.
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Converts Uint8Array bytes to a hex string.
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encrypts a string using AES-256-CTR mode with aes-js.
 * @param plaintext The plain text to encrypt.
 * @param keyHex The derived master key (hex string).
 * @returns Ciphertext hex string.
 */
export function encryptData(plaintext: string, keyHex: string): string {
  if (!plaintext) return '';
  try {
    const textBytes = aesjs.utils.utf8.toBytes(plaintext);
    const keyBytes = hexToBytes(keyHex.padEnd(64, '0').slice(0, 64)); // Ensure 32 bytes
    
    // Deterministic counter for CTR mode using first 16 bytes of key
    const counter = new aesjs.Counter(keyBytes.slice(0, 16));
    const aesCtr = new aesjs.ModeOfOperation.ctr(keyBytes, counter);
    const encryptedBytes = aesCtr.encrypt(textBytes);
    
    return bytesToHex(encryptedBytes);
  } catch (error) {
    console.error('encryptData error:', error);
    return '';
  }
}

/**
 * Decrypts an AES-256-CTR encrypted string.
 * @param ciphertextHex The encrypted text in hex format.
 * @param keyHex The derived master key (hex string).
 * @returns Plaintext string, or empty string if decryption fails.
 */
export function decryptData(ciphertextHex: string, keyHex: string): string {
  if (!ciphertextHex) return '';
  try {
    const encryptedBytes = hexToBytes(ciphertextHex);
    const keyBytes = hexToBytes(keyHex.padEnd(64, '0').slice(0, 64));
    
    const counter = new aesjs.Counter(keyBytes.slice(0, 16));
    const aesCtr = new aesjs.ModeOfOperation.ctr(keyBytes, counter);
    const decryptedBytes = aesCtr.decrypt(encryptedBytes);
    
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  } catch (error) {
    console.error('decryptData error:', error);
    return '';
  }
}

/**
 * Generates a random salt (hex string) using native Expo Crypto.
 */
export function generateRandomSalt(): string {
  const bytes = Crypto.getRandomBytes(16);
  return bytesToHex(bytes);
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

  // Fisher-Yates shuffle algorithm
  for (let i = guaranteedChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [guaranteedChars[i], guaranteedChars[j]] = [guaranteedChars[j], guaranteedChars[i]];
  }

  return guaranteedChars.join('');
}
