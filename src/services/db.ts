import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { encryptData, decryptData, deriveKey } from './crypto';

// Constants for AsyncStorage keys
const USERS_KEY = '@users';
const ACTIVE_USER_KEY = '@active_user';
const VAULT_KEY_PREFIX = '@vault_';

export interface UserAccount {
  email: string;
  passwordHash: string;
  salt: string;
  encryptedMasterKeySignature: string; // Used to verify master password
  encryptedVault?: string; // Simulates cloud sync storage
  biometricsEnabled?: boolean;
  pinEnabled?: boolean;
}

export interface CredentialEntry {
  id: string;
  name: string;
  type: 'username' | 'email' | 'phone';
  identifier: string;
  passwordEncrypted: string;
  link: string;
  notesEncrypted: string;
  category: string;
  updatedAt: string;
}

export interface DecryptedCredentialEntry extends Omit<CredentialEntry, 'passwordEncrypted' | 'notesEncrypted'> {
  passwordDecrypted: string;
  notesDecrypted: string;
}

// In-memory active key (will be cleared when app is closed / locked)
let activeMasterKey: string | null = null;
let activeUserEmail: string | null = null;

// SecureStore helper with web fallback
const secureStore = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

/**
 * Gets all user accounts from storage.
 */
export async function getUsers(): Promise<UserAccount[]> {
  try {
    const data = await AsyncStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get users:', error);
    return [];
  }
}

/**
 * Saves all user accounts.
 */
async function saveUsers(users: UserAccount[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * Registers a new user.
 */
export async function registerUser(email: string, masterPassword: string, salt: string): Promise<boolean> {
  const users = await getUsers();
  const normalizedEmail = email.toLowerCase().trim();

  if (users.find(u => u.email === normalizedEmail)) {
    throw new Error('Bu e-posta adresiyle zaten bir hesap oluşturulmuş.');
  }

  // Derive master key
  const masterKey = deriveKey(masterPassword, salt);
  
  // Encrypt validation string to verify master password later
  const encryptedMasterKeySignature = encryptData('VAULT_KEY_VALID', masterKey);
  
  const newUser: UserAccount = {
    email: normalizedEmail,
    passwordHash: masterKey, // For simplicity in MVP, the derived key acts as password validation key
    salt,
    encryptedMasterKeySignature,
    biometricsEnabled: false,
    pinEnabled: false,
    encryptedVault: encryptData(JSON.stringify([]), masterKey)
  };

  users.push(newUser);
  await saveUsers(users);

  // Set active session
  activeMasterKey = masterKey;
  activeUserEmail = normalizedEmail;
  await AsyncStorage.setItem(ACTIVE_USER_KEY, normalizedEmail);

  return true;
}

/**
 * Authenticates user and decrypts their vault validation.
 */
export async function loginUser(email: string, masterPassword: string): Promise<boolean> {
  const users = await getUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users.find(u => u.email === normalizedEmail);

  if (!user) {
    throw new Error('Hesap bulunamadı. Lütfen önce kayıt olun.');
  }

  const masterKey = deriveKey(masterPassword, user.salt);
  const decryptedSignature = decryptData(user.encryptedMasterKeySignature, masterKey);

  if (decryptedSignature !== 'VAULT_KEY_VALID') {
    throw new Error('Master şifre hatalı!');
  }

  activeMasterKey = masterKey;
  activeUserEmail = normalizedEmail;
  await AsyncStorage.setItem(ACTIVE_USER_KEY, normalizedEmail);

  return true;
}

/**
 * Setup Pin unlock.
 */
export async function setupPinUnlock(pin: string): Promise<void> {
  if (!activeMasterKey || !activeUserEmail) throw new Error('No active session');
  
  await secureStore.setItem(`${activeUserEmail}_pin`, pin);
  await secureStore.setItem(`${activeUserEmail}_masterKey`, activeMasterKey);
  
  const users = await getUsers();
  const index = users.findIndex(u => u.email === activeUserEmail);
  if (index !== -1) {
    users[index].pinEnabled = true;
    await saveUsers(users);
  }
}

/**
 * Setup Biometrics unlock.
 */
export async function setupBiometricUnlock(): Promise<void> {
  if (!activeMasterKey || !activeUserEmail) throw new Error('No active session');
  
  await secureStore.setItem(`${activeUserEmail}_masterKey`, activeMasterKey);
  
  const users = await getUsers();
  const index = users.findIndex(u => u.email === activeUserEmail);
  if (index !== -1) {
    users[index].biometricsEnabled = true;
    await saveUsers(users);
  }
}

/**
 * Unlocks session using PIN.
 */
export async function unlockWithPin(email: string, pin: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const savedPin = await secureStore.getItem(`${normalizedEmail}_pin`);
  const savedKey = await secureStore.getItem(`${normalizedEmail}_masterKey`);

  if (savedPin === pin && savedKey) {
    activeMasterKey = savedKey;
    activeUserEmail = normalizedEmail;
    await AsyncStorage.setItem(ACTIVE_USER_KEY, normalizedEmail);
    return true;
  }
  return false;
}

/**
 * Unlocks session using Biometrics (retrieve master key directly).
 */
export async function unlockWithBiometrics(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const savedKey = await secureStore.getItem(`${normalizedEmail}_masterKey`);

  if (savedKey) {
    activeMasterKey = savedKey;
    activeUserEmail = normalizedEmail;
    await AsyncStorage.setItem(ACTIVE_USER_KEY, normalizedEmail);
    return true;
  }
  return false;
}

/**
 * Logs out / locks the current session.
 */
export async function lockSession(): Promise<void> {
  activeMasterKey = null;
  // Note: We keep activeUserEmail in AsyncStorage to know who was the last logged-in user (for easy PIN/Biometric unlock prompt).
}

/**
 * Fully signs out (clears auto-fill user).
 */
export async function logoutUser(): Promise<void> {
  if (activeUserEmail) {
    await secureStore.deleteItem(`${activeUserEmail}_pin`);
    await secureStore.deleteItem(`${activeUserEmail}_masterKey`);
  }
  activeMasterKey = null;
  activeUserEmail = null;
  await AsyncStorage.removeItem(ACTIVE_USER_KEY);
}

/**
 * Gets the last logged-in user email.
 */
export async function getActiveUserEmail(): Promise<string | null> {
  return await AsyncStorage.getItem(ACTIVE_USER_KEY);
}

/**
 * Gets user configuration (biometrics, pin status).
 */
export async function getUserConfig(email: string): Promise<{ biometricsEnabled: boolean; pinEnabled: boolean } | null> {
  const users = await getUsers();
  const user = users.find(u => u.email === email.toLowerCase().trim());
  if (!user) return null;
  return {
    biometricsEnabled: !!user.biometricsEnabled,
    pinEnabled: !!user.pinEnabled
  };
}

/**
 * Disables PIN / Biometrics.
 */
export async function disableLockMethods(): Promise<void> {
  if (!activeUserEmail) return;
  await secureStore.deleteItem(`${activeUserEmail}_pin`);
  await secureStore.deleteItem(`${activeUserEmail}_masterKey`);
  
  const users = await getUsers();
  const index = users.findIndex(u => u.email === activeUserEmail);
  if (index !== -1) {
    users[index].pinEnabled = false;
    users[index].biometricsEnabled = false;
    await saveUsers(users);
  }
}

/**
 * Fetches vault data, decrypts it, and returns the credentials.
 */
export async function getVaultEntries(): Promise<DecryptedCredentialEntry[]> {
  const masterKey = activeMasterKey;
  const userEmail = activeUserEmail;
  if (!masterKey || !userEmail) {
    throw new Error('Session is locked or no user active');
  }

  // Load from local storage first
  let encryptedDataStr = await AsyncStorage.getItem(`${VAULT_KEY_PREFIX}${userEmail}`);
  
  // If not in local storage, try fetching from user's account database (simulated cloud sync fallback)
  if (!encryptedDataStr) {
    const users = await getUsers();
    const user = users.find(u => u.email === userEmail);
    if (user && user.encryptedVault) {
      encryptedDataStr = user.encryptedVault;
      // Sync to local storage
      await AsyncStorage.setItem(`${VAULT_KEY_PREFIX}${userEmail}`, encryptedDataStr);
    }
  }

  if (!encryptedDataStr) return [];

  try {
    const decryptedJson = decryptData(encryptedDataStr, masterKey);
    if (!decryptedJson) return [];
    
    const entries: CredentialEntry[] = JSON.parse(decryptedJson);
    
    // Decrypt individual passwords and notes on the fly
    return entries.map(entry => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
      identifier: entry.identifier,
      link: entry.link,
      category: entry.category,
      updatedAt: entry.updatedAt,
      passwordDecrypted: decryptData(entry.passwordEncrypted, masterKey),
      notesDecrypted: decryptData(entry.notesEncrypted, masterKey)
    }));
  } catch (error) {
    console.error('Failed to parse vault data:', error);
    return [];
  }
}

/**
 * Saves vault data after encrypting it.
 */
export async function saveVaultEntries(entries: DecryptedCredentialEntry[]): Promise<void> {
  const masterKey = activeMasterKey;
  const userEmail = activeUserEmail;
  if (!masterKey || !userEmail) {
    throw new Error('Session is locked or no user active');
  }

  // Encrypt fields individually
  const encryptedEntries: CredentialEntry[] = entries.map(entry => ({
    id: entry.id,
    name: entry.name,
    type: entry.type,
    identifier: entry.identifier,
    link: entry.link,
    category: entry.category,
    updatedAt: entry.updatedAt,
    passwordEncrypted: encryptData(entry.passwordDecrypted, masterKey),
    notesEncrypted: encryptData(entry.notesDecrypted, masterKey)
  }));

  // Encrypt the entire collection string
  const ciphertext = encryptData(JSON.stringify(encryptedEntries), masterKey);

  // Save to local device storage
  await AsyncStorage.setItem(`${VAULT_KEY_PREFIX}${userEmail}`, ciphertext);

  // Sync to simulated cloud database (user profile object in users array)
  const users = await getUsers();
  const index = users.findIndex(u => u.email === userEmail);
  if (index !== -1) {
    users[index].encryptedVault = ciphertext;
    await saveUsers(users);
  }
}
