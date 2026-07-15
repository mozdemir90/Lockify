import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

type Language = 'tr' | 'en';

export const translations = {
  tr: {
    // App name
    app_name: 'Lockify',
    app_description: 'Gelişmiş şifre yöneticisi ile tüm şifreleriniz uçtan uca şifreli.',

    // Navigation / Tabs
    tab_home: 'Kasa',
    tab_settings: 'Ayarlar',

    // Auth screen
    auth_login: 'Giriş Yap',
    auth_register: 'Kayıt Ol',
    auth_email: 'E-posta Adresi',
    auth_master_password: 'Master Şifre',
    auth_create_master_password: 'Master Şifre Oluştur',
    auth_confirm_password: 'Master Şifreyi Onayla',
    auth_submit_login: 'Kilitleri Aç ve Giriş Yap',
    auth_submit_register: 'Kasa Oluştur ve Kayıt Ol',
    auth_error_fill_fields: 'Lütfen tüm alanları doldurun.',
    auth_error_mismatch: 'Şifreler uyuşmuyor.',
    auth_error_min_length: 'Master şifreniz en az 6 karakter olmalıdır.',
    auth_error_invalid: 'Giriş yapılamadı. Şifrenizi kontrol edin.',

    // Lock screen
    lock_title: 'Kasa Kilitli',
    lock_subtitle: 'Devam etmek için kilidi açın',
    lock_pin_placeholder: 'PIN Kodu Girin',
    lock_biometrics_btn: 'Parmak İzi / Face ID',
    lock_pin_error: 'Hatalı PIN kodu.',

    // Home Screen (index)
    home_search_placeholder: 'Kasa içinde ara...',
    home_empty_title: 'Kasanız Boş',
    home_empty_subtitle: 'Henüz şifre eklemediniz. + Butonuna basarak ilk şifrenizi ekleyin.',
    home_add_title: 'Yeni Şifre Ekle',
    home_edit_title: 'Şifreyi Düzenle',
    home_field_title: 'Başlık / Hesap Adı',
    home_field_username: 'Kullanıcı Adı / Kimlik',
    home_field_type: 'Giriş Türü',
    home_field_password: 'Şifre',
    home_field_website: 'Web Sitesi / URL (İsteğe Bağlı)',
    home_field_notes: 'Notlar (İsteğe Bağlı)',
    home_field_category: 'Kategori',
    home_btn_save: 'Kaydet',
    home_btn_cancel: 'İptal',
    home_success_add: 'Yeni kayıt başarıyla eklendi.',
    home_success_update: 'Kayıt başarıyla güncellendi.',
    home_success_delete: 'Kayıt başarıyla silindi.',
    home_error_delete_fail: 'Kayıt silinemedi: ',
    home_error_fill_all: 'Lütfen gerekli alanları doldurun.',
    home_delete_confirm_title: 'Kayıt Sil',
    home_delete_confirm_desc: 'Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
    home_copied_password: 'Şifre kopyalandı!',
    home_copied_username: 'Kullanıcı adı kopyalandı!',

    // Settings Screen
    settings_title: 'Ayarlar',
    settings_owner: 'Kasa Sahibi',
    settings_sec_title: 'Güvenlik Seçenekleri',
    settings_biometrics: 'Parmak İzi / Face ID',
    settings_biometrics_desc: 'Biyometrik kilit açma',
    settings_pin: 'PIN Kodu Kilidi',
    settings_pin_desc: '4 haneli sayısal şifre',
    settings_gen_title: 'Şifre Üretici Araç',
    settings_gen_placeholder: 'Şifre üretmek için tıklayın',
    settings_gen_length: 'Karakter Uzunluğu',
    settings_gen_upper: 'Büyük Harf',
    settings_gen_lower: 'Küçük Harf',
    settings_gen_numbers: 'Sayılar',
    settings_gen_symbols: 'Semboller',
    settings_data_title: 'Veri İşlemleri',
    settings_data_import: 'Excel / CSV İçe Aktar',
    settings_data_import_desc: 'Şifrelerinizi toplu olarak aktarın',
    settings_account_title: 'Hesap Yönetimi',
    settings_lock_btn: 'Kasayı Kilitle',
    settings_logout_btn: 'Oturumu Kapat',
    settings_language: 'Dil / Language',
    settings_language_desc: 'Uygulama dilini değiştirin',
    settings_bio_not_supported: 'Biyometri Desteklenmiyor',
    settings_bio_not_supported_desc: 'Cihazınızda biyometrik doğrulama aktif değil veya desteklenmiyor. Lütfen sistem ayarlarından bir biyometri tanımlayın.',
    settings_success_bio: 'Parmak izi / Face ID kilidi başarıyla aktif edildi.',
    settings_success_locks_disabled: 'Güvenlik kilidi (PIN ve Biyometrik) başarıyla devre dışı bırakıldı.',
    settings_success_pin_disabled: 'PIN kilidi devre dışı bırakıldı.',
    settings_logout_confirm: 'Hesabınızdan çıkış yapmak istiyor musunuz?',
    settings_pin_modal_title: 'PIN Kodu Ayarla',
    settings_pin_modal_desc: 'Kilit açmak için 4 haneli yeni bir PIN kodu girin',
    settings_pin_modal_error: 'PIN kodu tam olarak 4 haneli olmalıdır.',
    settings_pin_modal_success: 'PIN kodu başarıyla ayarlandı!',

    // Common
    success: 'Başarılı',
    error: 'Hata',
    info: 'Bilgi',
    cancel: 'İptal',
    ok: 'Tamam',
    confirm: 'Onayla'
  },
  en: {
    // App name
    app_name: 'Lockify',
    app_description: 'With advanced password manager, all your passwords are end-to-end encrypted.',

    // Navigation / Tabs
    tab_home: 'Vault',
    tab_settings: 'Settings',

    // Auth screen
    auth_login: 'Log In',
    auth_register: 'Register',
    auth_email: 'Email Address',
    auth_master_password: 'Master Password',
    auth_create_master_password: 'Create Master Password',
    auth_confirm_password: 'Confirm Master Password',
    auth_submit_login: 'Unlock and Log In',
    auth_submit_register: 'Create Vault and Register',
    auth_error_fill_fields: 'Please fill in all fields.',
    auth_error_mismatch: 'Passwords do not match.',
    auth_error_min_length: 'Master password must be at least 6 characters.',
    auth_error_invalid: 'Login failed. Check your password.',

    // Lock screen
    lock_title: 'Vault Locked',
    lock_subtitle: 'Unlock to continue',
    lock_pin_placeholder: 'Enter PIN Code',
    lock_biometrics_btn: 'Fingerprint / Face ID',
    lock_pin_error: 'Incorrect PIN code.',

    // Home Screen (index)
    home_search_placeholder: 'Search in vault...',
    home_empty_title: 'Your Vault is Empty',
    home_empty_subtitle: 'You haven\'t added any passwords yet. Press the + button to add your first password.',
    home_add_title: 'Add New Password',
    home_edit_title: 'Edit Password',
    home_field_title: 'Title / Account Name',
    home_field_username: 'Username / ID',
    home_field_type: 'Login Type',
    home_field_password: 'Password',
    home_field_website: 'Website / URL (Optional)',
    home_field_notes: 'Notes (Optional)',
    home_field_category: 'Category',
    home_btn_save: 'Save',
    home_btn_cancel: 'Cancel',
    home_success_add: 'New entry successfully added.',
    home_success_update: 'Entry successfully updated.',
    home_success_delete: 'Entry successfully deleted.',
    home_error_delete_fail: 'Failed to delete entry: ',
    home_error_fill_all: 'Please fill in required fields.',
    home_delete_confirm_title: 'Delete Entry',
    home_delete_confirm_desc: 'Are you sure you want to delete this entry? This action cannot be undone.',
    home_copied_password: 'Password copied!',
    home_copied_username: 'Username copied!',

    // Settings Screen
    settings_title: 'Settings',
    settings_owner: 'Vault Owner',
    settings_sec_title: 'Security Options',
    settings_biometrics: 'Fingerprint / Face ID',
    settings_biometrics_desc: 'Biometric unlock',
    settings_pin: 'PIN Code Lock',
    settings_pin_desc: '4-digit numeric code',
    settings_gen_title: 'Password Generator Tool',
    settings_gen_placeholder: 'Click to generate password',
    settings_gen_length: 'Character Length',
    settings_gen_upper: 'Uppercase',
    settings_gen_lower: 'Lowercase',
    settings_gen_numbers: 'Numbers',
    settings_gen_symbols: 'Symbols',
    settings_data_title: 'Data Operations',
    settings_data_import: 'Import Excel / CSV',
    settings_data_import_desc: 'Import passwords in bulk',
    settings_account_title: 'Account Management',
    settings_lock_btn: 'Lock Vault',
    settings_logout_btn: 'Log Out',
    settings_language: 'Language / Dil',
    settings_language_desc: 'Change application language',
    settings_bio_not_supported: 'Biometrics Not Supported',
    settings_bio_not_supported_desc: 'Biometric authentication is not active or supported on this device. Please set up biometrics in your system settings.',
    settings_success_bio: 'Fingerprint / Face ID lock successfully enabled.',
    settings_success_locks_disabled: 'Security locks (PIN and Biometrics) successfully disabled.',
    settings_success_pin_disabled: 'PIN lock disabled.',
    settings_logout_confirm: 'Are you sure you want to log out of your account?',
    settings_pin_modal_title: 'Set PIN Code',
    settings_pin_modal_desc: 'Enter a new 4-digit PIN code to unlock',
    settings_pin_modal_error: 'PIN code must be exactly 4 digits.',
    settings_pin_modal_success: 'PIN code set successfully!',

    // Common
    success: 'Success',
    error: 'Error',
    info: 'Info',
    cancel: 'Cancel',
    ok: 'OK',
    confirm: 'Confirm'
  }
};

const LANGUAGE_KEY = '@app_language';

interface LanguageContextType {
  locale: Language;
  setLocale: (lang: Language) => Promise<void>;
  t: (key: keyof typeof translations['tr']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Language>('tr');

  useEffect(() => {
    const loadStoredLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (storedLang === 'tr' || storedLang === 'en') {
          setLocaleState(storedLang);
        } else {
          // Detect system locale
          const systemLocales = Localization.getLocales();
          const systemLang = systemLocales?.[0]?.languageCode;
          if (systemLang === 'en') {
            setLocaleState('en');
          } else {
            setLocaleState('tr'); // Default to Turkish
          }
        }
      } catch (err) {
        console.error('Failed to load language settings:', err);
      }
    };
    loadStoredLanguage();
  }, []);

  const setLocale = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      setLocaleState(lang);
    } catch (err) {
      console.error('Failed to save language settings:', err);
    }
  };

  const t = (key: keyof typeof translations['tr']): string => {
    return translations[locale][key] || translations['tr'][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
