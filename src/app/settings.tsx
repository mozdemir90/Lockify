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
import { useLanguage } from '../context/LanguageContext';
import { ThemedText } from '../components/themed-text';

import { ThemedView } from '../components/themed-view';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import * as ClipboardExpo from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { 
  Fingerprint, 
  Lock, 
  LogOut, 
  User, 
  ShieldAlert, 
  Copy, 
  RefreshCw,
  Sliders,
  Check,
  FileText,
  Globe
} from 'lucide-react-native';
import { generatePassword } from '../services/crypto';
import { getVaultEntries, saveVaultEntries, DecryptedCredentialEntry } from '../services/db';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { t, locale, setLocale } = useLanguage();

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
        Alert.alert(
          t('settings_bio_not_supported'), 
          t('settings_bio_not_supported_desc')
        );
        return;
      }
      try {
        await enableBiometrics();
        Alert.alert(t('success'), t('settings_success_bio'));
      } catch (e: any) {
        Alert.alert(t('error'), (locale === 'tr' ? 'Biyometrik kilit ayarlanamadı: ' : 'Failed to setup biometrics: ') + e.message);
      }
    } else {
      await disableSecurityLocks();
      Alert.alert(t('info'), t('settings_success_locks_disabled'));
    }
  };

  // Toggle PIN
  const handlePinToggle = async (value: boolean) => {
    if (value) {
      setPinValue('');
      setPinModalVisible(true);
    } else {
      await disableSecurityLocks();
      Alert.alert(t('info'), t('settings_success_pin_disabled'));
    }
  };

  // Handle CSV/Excel Import
  const handleCSVImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/comma-separated-values',
          'text/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/octet-stream' // fallback for Android file pickers
        ],
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name.toLowerCase();
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

      let rows: any[][] = [];

      if (isExcel) {
        let workbook;
        if (Platform.OS === 'web') {
          const response = await fetch(fileUri);
          const arrayBuffer = await response.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);
          workbook = XLSX.read(data, { type: 'array' });
        } else {
          const base64 = await FileSystem.readAsStringAsync(fileUri, { 
            encoding: FileSystem.EncodingType.Base64 
          });
          workbook = XLSX.read(base64, { type: 'base64' });
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      } else {
        let csvText = '';
        if (Platform.OS === 'web') {
          const response = await fetch(fileUri);
          csvText = await response.text();
        } else {
          csvText = await FileSystem.readAsStringAsync(fileUri);
        }

        if (!csvText) {
          Alert.alert('Hata', 'Dosya okunamadı veya dosya boş.');
          return;
        }

        const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          Alert.alert('Hata', 'CSV dosyasında veri bulunamadı.');
          return;
        }

        // Detect separator: Semicolon (Excel default in TR) or Comma
        const headerLine = lines[0];
        const semicolonCount = (headerLine.match(/;/g) || []).length;
        const commaCount = (headerLine.match(/,/g) || []).length;
        const separator = semicolonCount > commaCount ? ';' : ',';

        rows = lines.map(row => 
          row.split(separator).map(c => c.trim().replace(/^"(.*)"$/, '$1').replace(/['"]/g, ''))
        );
      }

      if (rows.length < 2) {
        Alert.alert('Hata', 'Dosyada başlık satırı ve veri bulunamadı.');
        return;
      }

      // Parse headers using Array.from to prevent sparse array empty slots
      const headers = Array.from(rows[0] || []).map(h => (h ? String(h).trim().toLowerCase().replace(/['"]/g, '') : ''));
      
      // Determine columns mapping safely checking if element is defined
      const matchesHeader = (h: string | undefined, keywords: string[]) => {
        if (!h) return false;
        return keywords.some(keyword => h.includes(keyword));
      };

      let nameIndex = headers.findIndex(h => matchesHeader(h, ['name', 'title', 'ad', 'başlık', 'hesap']));
      let identifierIndex = headers.findIndex(h => matchesHeader(h, ['identifier', 'username', 'email', 'kullanıcı', 'mail', 'kimlik', 'e-posta']));
      let passwordIndex = headers.findIndex(h => matchesHeader(h, ['password', 'pass', 'şifre', 'parola']));
      let linkIndex = headers.findIndex(h => matchesHeader(h, ['link', 'url', 'bağlantı', 'web']));
      let notesIndex = headers.findIndex(h => matchesHeader(h, ['notes', 'note', 'not']));
      let categoryIndex = headers.findIndex(h => matchesHeader(h, ['category', 'kategori']));

      // Fallbacks if headers not detected
      if (nameIndex === -1) nameIndex = 0;
      if (identifierIndex === -1) identifierIndex = 1;
      if (passwordIndex === -1) passwordIndex = 2;
      if (linkIndex === -1) linkIndex = 3;
      if (notesIndex === -1) notesIndex = 4;
      if (categoryIndex === -1) categoryIndex = 5;

      const newCredentials: DecryptedCredentialEntry[] = [];

      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i];
        
        if (!cells || cells.length < 2 || (!cells[nameIndex] && !cells[identifierIndex])) {
          continue; // Skip invalid empty rows
        }

        const name = cells[nameIndex] ? String(cells[nameIndex]).trim() : 'Bilinmeyen Hesap';
        const identifier = cells[identifierIndex] ? String(cells[identifierIndex]).trim() : '';
        const passwordDecrypted = cells[passwordIndex] ? String(cells[passwordIndex]).trim() : '';
        const link = cells[linkIndex] ? String(cells[linkIndex]).trim() : '';
        const notesDecrypted = cells[notesIndex] ? String(cells[notesIndex]).trim() : '';
        
        // Determine identifier type (email, phone, or username)
        let type: 'email' | 'phone' | 'username' = 'username';
        if (identifier.includes('@')) {
          type = 'email';
        } else if (/^\+?[0-9\s-]{7,15}$/.test(identifier)) {
          type = 'phone';
        }

        // Determine category
        let category: 'personal' | 'work' | 'social' | 'finance' | 'other' = 'personal';
        const rawCat = (cells[categoryIndex] ? String(cells[categoryIndex]) : '').toLowerCase();
        if (rawCat.includes('social') || rawCat.includes('sosyal')) category = 'social';
        else if (rawCat.includes('work') || rawCat.includes('iş')) category = 'work';
        else if (rawCat.includes('finance') || rawCat.includes('finans')) category = 'finance';
        else if (rawCat.includes('other') || rawCat.includes('diğer')) category = 'other';

        newCredentials.push({
          id: Math.random().toString(36).substr(2, 9),
          name,
          type,
          identifier,
          passwordDecrypted,
          link,
          notesDecrypted,
          category,
          updatedAt: new Date().toISOString()
        });
      }

      if (newCredentials.length === 0) {
        Alert.alert('Hata', 'Dosyadan geçerli şifre kaydı okunamadı. Lütfen başlık sütunlarını kontrol edin.');
        return;
      }

      // Fetch existing vault and append
      const existingEntries = await getVaultEntries();
      const updatedEntries = [...newCredentials, ...existingEntries];
      
      await saveVaultEntries(updatedEntries);
      
      Alert.alert(
        'Başarılı', 
        `${newCredentials.length} adet şifre başarıyla içe aktarıldı! Değişiklikleri görmek için ana sayfanızı yenileyin.`,
        [{ text: 'Tamam' }]
      );
    } catch (error: any) {
      console.error('Import error:', error);
      const errMsg = String(error.message || '').toLowerCase();
      
      if (
        errMsg.includes('unsupported encryption') || 
        errMsg.includes('password') || 
        errMsg.includes('decrypt') || 
        errMsg.includes('encrypted') || 
        errMsg.includes('password-protected')
      ) {
        Alert.alert(
          'Şifreli Dosya Hatası',
          'Seçtiğiniz Excel dosyası şifre korumalıdır. Güvenlik ve teknik kısıtlamalar nedeniyle parola korumalı Excel dosyaları doğrudan içe aktarılamaz.\n\nÇözüm: Dosyayı Excel veya Google Sheets ile açıp şifresiz (parolasız) bir kopya olarak kaydedin ve o kopyayı yükleyin.'
        );
      } else {
        Alert.alert(
          'Dosya Okuma Hatası',
          'Dosya formatı çözülemedi veya dosya bozuk olabilir. Lütfen geçerli, şifresiz bir Excel (.xlsx) veya CSV dosyası seçtiğinizden emin olun.'
        );
      }
    }
  };

  const savePinConfig = async () => {
    if (pinValue.length !== 4 || isNaN(Number(pinValue))) {
      Alert.alert(t('error'), t('settings_pin_modal_error'));
      return;
    }

    try {
      await enablePin(pinValue);
      setPinModalVisible(false);
      Alert.alert(t('success'), t('settings_pin_modal_success'));
    } catch (e) {
      Alert.alert(t('error'), locale === 'tr' ? 'PIN kaydedilemedi.' : 'Failed to save PIN.');
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
            <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('settings_owner')}</ThemedText>
          </View>
        </ThemedView>

        {/* Language Selection */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>{t('settings_language')}</ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.rowItem}>
            <View style={styles.rowLabelGroup}>
              <Globe size={20} color={colors.text} style={{ marginRight: 12 }} />
              <View>
                <ThemedText style={styles.rowTitle}>{locale === 'tr' ? 'Türkçe (TR)' : 'English (EN)'}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('settings_language_desc')}</ThemedText>
              </View>
            </View>
            <Switch
              value={locale === 'en'}
              onValueChange={(value) => setLocale(value ? 'en' : 'tr')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            />
          </View>
        </ThemedView>

        {/* Security Options */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>{t('settings_sec_title')}</ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          {/* Biometrics */}
          <View style={[styles.rowItem, { borderBottomColor: colors.border }]}>
            <View style={styles.rowLabelGroup}>
              <Fingerprint size={20} color={colors.text} style={{ marginRight: 12 }} />
              <View>
                <ThemedText style={styles.rowTitle}>{t('settings_biometrics')}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('settings_biometrics_desc')}</ThemedText>
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
                <ThemedText style={styles.rowTitle}>{t('settings_pin')}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('settings_pin_desc')}</ThemedText>
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
        <ThemedText type="smallBold" style={styles.sectionLabel}>{t('settings_gen_title')}</ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.generatorOutputRow}>
            <TextInput
              value={generatedPassword}
              editable={false}
              placeholder={t('settings_gen_placeholder')}
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
            <ThemedText style={{ flex: 1 }}>{t('settings_gen_length')} ({genLength})</ThemedText>
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
              <ThemedText type="small" style={{ marginLeft: 6 }}>{t('settings_gen_upper')}</ThemedText>
            </TouchableOpacity>
            {/* Lower */}
            <TouchableOpacity style={styles.checkboxItem} onPress={() => setGenLower(!genLower)}>
              <Switch value={genLower} onValueChange={setGenLower} trackColor={{ false: colors.border, true: colors.primary }} />
              <ThemedText type="small" style={{ marginLeft: 6 }}>{t('settings_gen_lower')}</ThemedText>
            </TouchableOpacity>
            {/* Numbers */}
            <TouchableOpacity style={styles.checkboxItem} onPress={() => setGenNumbers(!genNumbers)}>
              <Switch value={genNumbers} onValueChange={setGenNumbers} trackColor={{ false: colors.border, true: colors.primary }} />
              <ThemedText type="small" style={{ marginLeft: 6 }}>{t('settings_gen_numbers')}</ThemedText>
            </TouchableOpacity>
            {/* Symbols */}
            <TouchableOpacity style={styles.checkboxItem} onPress={() => setGenSymbols(!genSymbols)}>
              <Switch value={genSymbols} onValueChange={setGenSymbols} trackColor={{ false: colors.border, true: colors.primary }} />
              <ThemedText type="small" style={{ marginLeft: 6 }}>{t('settings_gen_symbols')}</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* Data Operations Card */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>{t('settings_data_title')}</ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          <TouchableOpacity style={styles.rowItemBtn} onPress={handleCSVImport}>
            <FileText size={18} color={colors.text} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontWeight: 'bold' }}>{t('settings_data_import')}</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('settings_data_import_desc')}</ThemedText>
            </View>
          </TouchableOpacity>
        </ThemedView>

        {/* Session Card */}
        <ThemedText type="smallBold" style={styles.sectionLabel}>{t('settings_account_title')}</ThemedText>
        <ThemedView type="backgroundElement" style={styles.card}>
          <TouchableOpacity style={[styles.rowItemBtn, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]} onPress={lock}>
            <Lock size={18} color={colors.text} style={{ marginRight: 12 }} />
            <ThemedText style={{ fontWeight: 'bold' }}>{t('settings_lock_btn')}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowItemBtn} onPress={() => {
            Alert.alert(
              t('settings_logout_btn'),
              t('settings_logout_confirm'),
              [
                { text: t('cancel'), style: 'cancel' },
                { text: t('settings_logout_btn'), style: 'destructive', onPress: logout }
              ]
            );
          }}>
            <LogOut size={18} color={colors.error} style={{ marginRight: 12 }} />
            <ThemedText style={{ color: colors.error, fontWeight: 'bold' }}>{t('settings_logout_btn')}</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>

      {/* Local PIN Setup Modal */}
      {pinModalVisible && (
        <View style={styles.overlay}>
          <ThemedView type="backgroundElement" style={[styles.pinSetupCard, { borderColor: colors.border }]}>
            <ThemedText type="subtitle" style={{ textAlign: 'center', marginBottom: 12 }}>{t('settings_pin_modal_title')}</ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              {t('settings_pin_modal_desc')}
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
                <ThemedText style={{ fontWeight: 'bold' }}>{t('cancel')}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={savePinConfig}>
                <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>{t('home_btn_save')}</ThemedText>
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
