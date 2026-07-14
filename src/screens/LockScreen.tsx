import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../context/SessionContext';
import { ThemedText } from '../components/themed-text';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { ShieldCheck, Fingerprint, Delete, LogOut } from 'lucide-react-native';

export const LockScreen: React.FC = () => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const { 
    activeUser, 
    biometricsEnabled, 
    biometricsAvailable, 
    unlockPin, 
    unlockBiometric, 
    logout 
  } = useSession();

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  // Trigger biometric unlock automatically on mount if enabled
  useEffect(() => {
    if (biometricsEnabled && biometricsAvailable) {
      handleBiometricUnlock();
    }
  }, [biometricsEnabled, biometricsAvailable]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        handlePinSubmit(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinSubmit = async (enteredPin: string) => {
    setLoading(true);
    try {
      const success = await unlockPin(enteredPin);
      if (!success) {
        Alert.alert('Hata', 'Girdiğiniz PIN kodu hatalı.');
        setPin('');
      }
    } catch (e) {
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricUnlock = async () => {
    try {
      await unlockBiometric();
    } catch (e) {
      console.warn('Biometric unlock failed', e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <ShieldCheck size={48} color={colors.primary} />
        </View>
        <ThemedText type="subtitle" style={styles.title}>
          VaultPass Kilitli
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          {activeUser} hesabı için kilit açın.
        </ThemedText>
      </View>

      {/* PIN Indicators */}
      <View style={styles.pinContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View 
            key={index} 
            style={[
              styles.dot, 
              { borderColor: colors.border },
              pin.length > index ? { backgroundColor: colors.primary } : null
            ]} 
          />
        ))}
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {/* Row 1 */}
        <View style={styles.row}>
          {['1', '2', '3'].map(n => (
            <TouchableOpacity key={n} style={[styles.key, { backgroundColor: colors.backgroundElement }]} onPress={() => handleKeyPress(n)}>
              <ThemedText style={styles.keyText}>{n}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 2 */}
        <View style={styles.row}>
          {['4', '5', '6'].map(n => (
            <TouchableOpacity key={n} style={[styles.key, { backgroundColor: colors.backgroundElement }]} onPress={() => handleKeyPress(n)}>
              <ThemedText style={styles.keyText}>{n}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 3 */}
        <View style={styles.row}>
          {['7', '8', '9'].map(n => (
            <TouchableOpacity key={n} style={[styles.key, { backgroundColor: colors.backgroundElement }]} onPress={() => handleKeyPress(n)}>
              <ThemedText style={styles.keyText}>{n}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 4 (Biometric, 0, Backspace) */}
        <View style={styles.row}>
          {biometricsEnabled && biometricsAvailable ? (
            <TouchableOpacity 
              style={[styles.key, styles.specialKey, { backgroundColor: colors.primary + '20' }]} 
              onPress={handleBiometricUnlock}
            >
              <Fingerprint size={28} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.key, styles.emptyKey]} />
          )}

          <TouchableOpacity style={[styles.key, { backgroundColor: colors.backgroundElement }]} onPress={() => handleKeyPress('0')}>
            <ThemedText style={styles.keyText}>0</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.key, styles.specialKey, { backgroundColor: colors.backgroundElement }]} onPress={handleBackspace}>
            <Delete size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer / Switch User */}
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={() => {
          Alert.alert(
            'Çıkış Yap',
            'Bu hesaptan çıkış yapmak istiyor musunuz? PIN ve parmak izi ayarlarınız temizlenecektir.',
            [
              { text: 'İptal', style: 'cancel' },
              { text: 'Çıkış Yap', style: 'destructive', onPress: logout }
            ]
          );
        }}
      >
        <LogOut size={16} color={colors.error} style={{ marginRight: 6 }} />
        <ThemedText type="small" style={{ color: colors.error, fontWeight: 'bold' }}>
          Başka Hesapla Giriş Yap
        </ThemedText>
      </TouchableOpacity>

      {loading && (
        <View style={[styles.overlay, { backgroundColor: colors.background + '80' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 50,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconContainer: {
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pinContainer: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 30,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  keypad: {
    width: '80%',
    maxWidth: 320,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  key: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  specialKey: {
    elevation: 0,
    shadowOpacity: 0,
  },
  emptyKey: {
    elevation: 0,
    shadowOpacity: 0,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
