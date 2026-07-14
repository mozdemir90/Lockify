import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { 
  getActiveUserEmail, 
  getUserConfig, 
  loginUser, 
  registerUser, 
  unlockWithPin, 
  unlockWithBiometrics, 
  lockSession, 
  logoutUser, 
  disableLockMethods,
  setupPinUnlock,
  setupBiometricUnlock,
  getUsers
} from '../services/db';
import { generateRandomSalt } from '../services/crypto';

interface SessionContextType {
  isRegistered: boolean;
  isLoggedIn: boolean;
  isLocked: boolean;
  activeUser: string | null;
  biometricsAvailable: boolean;
  biometricsEnabled: boolean;
  pinEnabled: boolean;
  appLoading: boolean;
  register: (email: string, masterPassword: string) => Promise<void>;
  login: (email: string, masterPassword: string) => Promise<void>;
  lock: () => void;
  logout: () => Promise<void>;
  unlockPin: (pin: string) => Promise<boolean>;
  unlockBiometric: () => Promise<boolean>;
  enablePin: (pin: string) => Promise<void>;
  enableBiometrics: () => Promise<void>;
  disableSecurityLocks: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  categories: { key: string; label: string }[];
  addCategory: (label: string) => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [categories, setCategories] = useState<{ key: string; label: string }[]>([]);

  // Load user categories when activeUser logs in/changes
  useEffect(() => {
    const loadCategories = async () => {
      if (!activeUser) {
        setCategories([]);
        return;
      }
      try {
        const storedCats = await AsyncStorage.getItem(`${activeUser}_categories`);
        if (storedCats) {
          setCategories(JSON.parse(storedCats));
        } else {
          const defaultCats = [
            { key: 'personal', label: 'Kişisel' },
            { key: 'work', label: 'İş' },
            { key: 'social', label: 'Sosyal' },
            { key: 'finance', label: 'Finans' },
            { key: 'other', label: 'Diğer' }
          ];
          await AsyncStorage.setItem(`${activeUser}_categories`, JSON.stringify(defaultCats));
          setCategories(defaultCats);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, [activeUser]);

  const addCategory = async (label: string): Promise<boolean> => {
    if (!activeUser || !label.trim()) return false;
    
    // Normalize label to dynamic slug key (Turkish characters mapping)
    const key = label.trim().toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    if (!key) return false;

    // Check duplicate
    if (categories.some(c => c.key === key)) {
      return false;
    }

    try {
      const newCats = [...categories, { key, label: label.trim() }];
      await AsyncStorage.setItem(`${activeUser}_categories`, JSON.stringify(newCats));
      setCategories(newCats);
      return true;
    } catch (err) {
      console.error('Failed to save category:', err);
      return false;
    }
  };

  // Initialize and check device capabilities and registered users
  useEffect(() => {
    const initSession = async () => {
      try {
        // Check if there are any registered users
        const users = await getUsers();
        setIsRegistered(users.length > 0);

        // Check if biometrics are available on device
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricsAvailable(hasHardware && isEnrolled);

        // Check if there is an active session email
        const lastUser = await getActiveUserEmail();
        if (lastUser) {
          setActiveUser(lastUser);
          const config = await getUserConfig(lastUser);
          if (config) {
            setBiometricsEnabled(config.biometricsEnabled);
            setPinEnabled(config.pinEnabled);
            
            // If neither PIN nor biometrics is enabled, they need full master password login
            if (!config.biometricsEnabled && !config.pinEnabled) {
              setIsLocked(true);
              setIsLoggedIn(false);
            }
          }
        }
      } catch (error) {
        console.error('Session init error:', error);
      } finally {
        setAppLoading(false);
      }
    };

    initSession();
  }, []);

  const refreshConfig = async () => {
    if (!activeUser) return;
    const config = await getUserConfig(activeUser);
    if (config) {
      setBiometricsEnabled(config.biometricsEnabled);
      setPinEnabled(config.pinEnabled);
    }
    const users = await getUsers();
    setIsRegistered(users.length > 0);
  };

  const register = async (email: string, masterPassword: string) => {
    setAppLoading(true);
    try {
      const salt = generateRandomSalt();
      await registerUser(email, masterPassword, salt);
      setActiveUser(email);
      setIsRegistered(true);
      setIsLoggedIn(true);
      setIsLocked(false);
      setBiometricsEnabled(false);
      setPinEnabled(false);
    } catch (error: any) {
      Alert.alert('Kayıt Hatası', error.message || 'Kullanıcı kaydedilemedi.');
      throw error;
    } finally {
      setAppLoading(false);
    }
  };

  const login = async (email: string, masterPassword: string) => {
    setAppLoading(true);
    try {
      await loginUser(email, masterPassword);
      setActiveUser(email);
      setIsLoggedIn(true);
      setIsLocked(false);
      
      const config = await getUserConfig(email);
      if (config) {
        setBiometricsEnabled(config.biometricsEnabled);
        setPinEnabled(config.pinEnabled);
      }
    } catch (error: any) {
      Alert.alert('Kimlik Doğrulama Hatası', error.message || 'Giriş yapılamadı.');
      throw error;
    } finally {
      setAppLoading(false);
    }
  };

  const lock = () => {
    lockSession();
    setIsLocked(true);
  };

  const logout = async () => {
    await logoutUser();
    setIsLoggedIn(false);
    setIsLocked(true);
    setActiveUser(null);
    setBiometricsEnabled(false);
    setPinEnabled(false);
  };

  const unlockPin = async (pin: string): Promise<boolean> => {
    if (!activeUser) return false;
    const success = await unlockWithPin(activeUser, pin);
    if (success) {
      setIsLoggedIn(true);
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const unlockBiometric = async (): Promise<boolean> => {
    if (!activeUser || !biometricsEnabled || !biometricsAvailable) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Password Vault',
        fallbackLabel: 'Enter PIN / Password',
        disableDeviceFallback: true,
      });

      if (result.success) {
        const success = await unlockWithBiometrics(activeUser);
        if (success) {
          setIsLoggedIn(true);
          setIsLocked(false);
          return true;
        }
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
    }
    return false;
  };

  const enablePin = async (pin: string) => {
    await setupPinUnlock(pin);
    setPinEnabled(true);
  };

  const enableBiometrics = async () => {
    await setupBiometricUnlock();
    setBiometricsEnabled(true);
  };

  const disableSecurityLocks = async () => {
    await disableLockMethods();
    setPinEnabled(false);
    setBiometricsEnabled(false);
  };

  return (
    <SessionContext.Provider
      value={{
        isRegistered,
        isLoggedIn,
        isLocked,
        activeUser,
        biometricsAvailable,
        biometricsEnabled,
        pinEnabled,
        appLoading,
        register,
        login,
        lock,
        logout,
        unlockPin,
        unlockBiometric,
        enablePin,
        enableBiometrics,
        disableSecurityLocks,
        refreshConfig,
        categories,
        addCategory,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
