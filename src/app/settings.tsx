import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Switch, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  TextInput,
  Clipboard,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../context/SessionContext';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import * as ClipboardExpo from 'expo-clipboard';
import { 
  Fingerprint, 
  Lock, 
  LogOut, 
  User, 
  ShieldAlert, 
  Copy, 
  RefreshCw,
  Sliders,
  Check
} from 'lucide-react-native';
import { generatePassword } from '../services/crypto';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const { 
    activeUser, 
    biometricsAvailable, 
    biometricsEnabled, 
    pinEnabled, 
    enablePin, 
    enableBiometrics, 
    disableSecurityLocks,
    lock,
    logout 
  } = useSession();

  // Settings PIN entry modal state
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinValue, setPinValue] = useState('');

  // Password Generator states
  const [genLength, setGenLength] = useState('16');
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Toggle Biometrics
  const handleBiometricsToggle = async (value: boolean) => {
    if (value) {
      if (!biometricsAvailable) {
        Alert.alert('Desteklenmiyor', 'Cihazınızda biyometrik doğrulama aktif değil veya desteklenmiyor.');
        return;
      }
      try {
        await enableBiometrics();
        Alert.alert('Başarılı', 'Parmak izi / Face ID kilidi aktif edildi.');
      } catch (e) {
        Alert.alert('Hata', 'Biyometrik kilit ayarlanamadı.');
      }
    } else {
      await disableSecurityLocks();
      Alert.alert('Bilgi', 'Güvenlik kilitleri devre dışı bırakıldı.');
    }
  };

  // Toggle PIN
  const handlePinToggle = async (value: boolean) => {
    if (value) {
      setPinValue('');
      setPinModalVisible(true);
    } else {
      await disableSecurityLocks();
      Alert.alert('Bilgi', 'PIN kilidi devre dışı bırakıldı.');
    }
  };

  const savePinConfig = async () => {
    if (pinValue.length !== 4 || isNaN(Number(pinValue))) {
      Alert.alert('Hata', 'PIN kodu 4 haneli bir sayı olmalıdır.');
      return;
    }

    try {
      await enablePin(pinValue);
      setPinModalVisible(false);
      Alert.alert('Başarılı', 'PIN kilidi aktif edildi.');
    } catch (e) {
      Alert.alert('Hata', 'PIN kaydedilemedi.');
    }
  };

  // Generate Password
  const handleGenerate = () => {
    const len = Math.max(6, Math.min(64, parseInt(genLength) || 16));
    const pass = generatePassword(len, {
      uppercase: genUpper,
      lowercase: genLower,
      numbers: genNumbers,
      symbols: genSymbols
    });
    setGeneratedPassword(pass);
    setCopied(false);
  };

  // Copy Generated Password
  const handleCopy = async () => {
    if (!generatedPassword) return;
    await ClipboardExpo.setStringAsync(generatedPassword);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>Ayarlar</ThemedText>
        </View>

        {/* User Card */}
        <ThemedView type="backgroundElement" style={[styles.card, styles.userCard]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <User size={24} color="#fff" />
          </View>
          <View>
            <ThemedText style={{ fontWeight: 'bold' }}>{activeUser}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>Kasa Sahibi</ThemedText>
          </View>
        </ThemedView>

        {/* Security Options */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>Güvenlik Seçenekleri</ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          {/* Biometrics */}
          <View style={[styles.rowItem, { borderBottomColor: colors.border }]}>
            <View style={styles.rowLabelGroup}>
              <Fingerprint size={20} color={colors.text} style={{ marginRight: 12 }} />
              <View>
                <ThemedText style={styles.rowTitle}>Parmak İzi / Face ID</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>Biyometrik kilit açma</ThemedText>
              </View>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={handleBiometricsToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            />
          </View>

          {/* PIN */}
          <View style={styles.rowItem}>
            <View style={styles.rowLabelGroup}>
              <Lock size={20} color={colors.text} style={{ marginRight: 12 }} />
              <View>
                <ThemedText style={styles.rowTitle}>PIN Kodu Kilidi</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>4 haneli sayısal şifre</ThemedText>
              </View>
            </View>
            <Switch
              value={pinEnabled}
              onValueChange={handlePinToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            />
          </View>
        </ThemedView>

        {/* Password Generator Card */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>Şifre Üretici Araç</ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.generatorOutputRow}>
            <TextInput
              value={generatedPassword}
              editable={false}
              placeholder="Şifre üretmek için tıklayın"
              placeholderTextColor={colors.textSecondary}
              style={[styles.genOutputText, { color: colors.text }]}
            />
            <TouchableOpacity 
              style={[styles.copyBtn, { backgroundColor: colors.backgroundSelected }]} 
              onPress={handleCopy}
              disabled={!generatedPassword}
            >
              {copied ? <Check size={18} color={colors.success} /> : <Copy size={18} color={colors.text} />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.copyBtn, { backgroundColor: colors.primary }]} 
              onPress={handleGenerate}
            >
              <RefreshCw size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Controls */}
          <View style={[styles.controlRow, { marginTop: 12 }]}>
            <ThemedText style={{ flex: 1 }}>Karakter Uzunluğu ({genLength})</ThemedText>
            <TextInput
              value={genLength}
              onChangeText={setGenLength}
              keyboardType="number-pad"
              maxLength={2}
              style={[styles.lenInput, { borderColor: colors.border, color: colors.text }]}
            />
          </View>

          {/* Toggle Checklist */}
          <View style={styles.checkboxesRow}>
            {/* Upper */}
            <TouchableOpacity style={styles.checkboxItem} onPress={() => setGenUpper(!genUpper)}>
              <Switch value={genUpper} onValueChange={setGenUpper} trackColor={{ false: colors.border, true: colors.primary }} />
              <ThemedText type="small" style={{ marginLeft: 6 }}>Büyük Harf</ThemedText>
            </TouchableOpacity>
            {/* Lower */}
            <TouchableOpacity style={styles.checkboxItem} onPress={() => setGenLower(!genLower)}>
              <Switch value={genLower} onValueChange={setGenLower} trackColor={{ false: colors.border, true: colors.primary }} />
              <ThemedText type="small" style={{ marginLeft: 6 }}>Küçük Harf</ThemedText>
            </TouchableOpacity>
            {/* Numbers */}
            <TouchableOpacity style={styles.checkboxItem} onPress={() => setGenNumbers(!genNumbers)}>
              <Switch value={genNumbers} onValueChange={setGenNumbers} trackColor={{ false: colors.border, true: colors.primary }} />
              <ThemedText type="small" style={{ marginLeft: 6 }}>Sayılar</ThemedText>
            </TouchableOpacity>
            {/* Symbols */}
            <TouchableOpacity style={styles.checkboxItem} onPress={() => setGenSymbols(!genSymbols)}>
              <Switch value={genSymbols} onValueChange={setGenSymbols} trackColor={{ false: colors.border, true: colors.primary }} />
              <ThemedText type="small" style={{ marginLeft: 6 }}>Semboller</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* Session Card */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>Hesap Yönetimi</ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          <TouchableOpacity style={[styles.rowItemBtn, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]} onPress={lock}>
            <Lock size={18} color={colors.text} style={{ marginRight: 12 }} />
            <ThemedText style={{ fontWeight: 'bold' }}>Kasayı Kilitle</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowItemBtn} onPress={() => {
            Alert.alert(
              'Çıkış Yap',
              'Hesabınızdan çıkış yapmak istiyor musunuz?',
              [
                { text: 'İptal', style: 'cancel' },
                { text: 'Çıkış Yap', style: 'destructive', onPress: logout }
              ]
            );
          }}>
            <LogOut size={18} color={colors.error} style={{ marginRight: 12 }} />
            <ThemedText style={{ color: colors.error, fontWeight: 'bold' }}>Oturumu Kapat</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>

      {/* Local PIN Setup Modal */}
      {pinModalVisible && (
        <View style={styles.overlay}>
          <ThemedView type="backgroundElement" style={[styles.pinSetupCard, { borderColor: colors.border }]}>
            <ThemedText type="subtitle" style={{ textAlign: 'center', marginBottom: 12 }}>PIN Kodu Oluştur</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              Kasanızı hızlıca açmak için 4 haneli bir sayı girin.
            </ThemedText>
            <TextInput
              value={pinValue}
              onChangeText={setPinValue}
              keyboardType="number-pad"
              secureTextEntry={true}
              maxLength={4}
              placeholder="1234"
              placeholderTextColor={colors.textSecondary}
              style={[styles.pinInput, { borderColor: colors.border, color: colors.text }]}
            />
            <View style={styles.modalBtnsRow}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.backgroundSelected }]} onPress={() => setPinModalVisible(false)}>
                <ThemedText style={{ fontWeight: 'bold' }}>İptal</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={savePinConfig}>
                <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Kaydet</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    marginHorizontal: 20,
    marginBottom: 8,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  rowLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTitle: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  rowItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  // Generator Styles
  generatorOutputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  genOutputText: {
    flex: 1,
    fontSize: 16,
    height: 44,
    borderWidth: 0.5,
    borderRadius: 8,
    borderColor: '#ccc',
    paddingHorizontal: 12,
    fontWeight: '500',
  },
  copyBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
  },
  lenInput: {
    width: 60,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 'bold',
  },
  checkboxesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 10,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
    marginVertical: 4,
  },
  // PIN Overlay
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  pinSetupCard: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  pinInput: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 10,
  },
  modalBtnsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
