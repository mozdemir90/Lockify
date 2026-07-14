import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../context/SessionContext';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { ShieldAlert, Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react-native';

export const AuthScreen: React.FC = () => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const { register, login, appLoading } = useSession();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleTabChange = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setErrorText('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async () => {
    setErrorText('');
    console.log('handleSubmit triggered. Mode:', isLogin ? 'LOGIN' : 'REGISTER', 'Email:', email);

    if (!email.trim() || !password) {
      const msg = 'Lütfen tüm alanları doldurun.';
      setErrorText(msg);
      console.log('Validation Error:', msg);
      Alert.alert('Hata', msg);
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        const msg = 'Şifreler uyuşmuyor.';
        setErrorText(msg);
        console.log('Validation Error:', msg);
        Alert.alert('Hata', msg);
        return;
      }

      if (password.length < 6) {
        const msg = 'Master şifreniz en az 6 karakter olmalıdır.';
        setErrorText(msg);
        console.log('Validation Error:', msg);
        Alert.alert('Hata', msg);
        return;
      }
    }

    try {
      if (isLogin) {
        console.log('Attempting login...');
        await login(email, password);
        console.log('Login request completed.');
      } else {
        console.log('Attempting registration...');
        await register(email, password);
        console.log('Registration request completed.');
      }
    } catch (e: any) {
      console.error('Submit caught error:', e);
      setErrorText(e.message || 'Bir hata oluştu.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <SafeAreaView style={styles.container}>
          {/* Logo / Icon Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <ShieldAlert size={48} color={colors.primary} />
            </View>
            <ThemedText type="subtitle" style={styles.title}>
              VaultPass
            </ThemedText>
            <ThemedText type="small" style={[styles.subtitle, { color: colors.textSecondary }]}>
              Gelişmiş şifre yöneticisi ile tüm şifreleriniz uçtan uca şifreli.
            </ThemedText>
          </View>

          {/* Toggle Tab */}
          <View style={[styles.tabContainer, { backgroundColor: colors.backgroundElement }]}>
            <TouchableOpacity 
              style={[styles.tab, isLogin && [styles.activeTab, { backgroundColor: colors.backgroundSelected }]]}
              onPress={() => handleTabChange(true)}
            >
              <ThemedText style={isLogin ? styles.activeTabText : { color: colors.textSecondary }}>
                Giriş Yap
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, !isLogin && [styles.activeTab, { backgroundColor: colors.backgroundSelected }]]}
              onPress={() => handleTabChange(false)}
            >
              <ThemedText style={!isLogin ? styles.activeTabText : { color: colors.textSecondary }}>
                Kayıt Ol
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ThemedView type="backgroundElement" style={styles.formCard}>
            <ThemedText type="smallBold" style={styles.label}>
              E-posta Adresi
            </ThemedText>
            <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
              <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@mail.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { color: colors.text }]}
              />
            </View>

            <ThemedText type="smallBold" style={[styles.label, styles.topSpacing]}>
              {isLogin ? 'Master Şifre' : 'Master Şifre Oluştur'}
            </ThemedText>
            <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
              <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="******"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, { color: colors.text }]}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <>
                <ThemedText type="smallBold" style={[styles.label, styles.topSpacing]}>
                  Şifreyi Onayla
                </ThemedText>
                <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                  <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="******"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    style={[styles.input, { color: colors.text }]}
                  />
                </View>
                <View style={styles.securityWarning}>
                  <CheckCircle size={16} color={colors.success} style={styles.warningIcon} />
                  <ThemedText type="small" style={{ color: colors.textSecondary, flex: 1 }}>
                    Master Şifre yerel anahtarınızı türetir ve kurtarılamaz. Lütfen bunu güvenli bir yerde saklayın.
                  </ThemedText>
                </View>
              </>
            )}

            {errorText ? (
              <ThemedText style={[styles.errorText, { color: colors.error }]}>
                {errorText}
              </ThemedText>
            ) : null}

            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={appLoading}
            >
              {appLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.submitButtonText}>
                  {isLogin ? 'Kilitleri Aç ve Giriş Yap' : 'Kasa Oluştur ve Kayıt Ol'}
                </ThemedText>
              )}
            </TouchableOpacity>
          </ThemedView>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingVertical: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
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
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  formCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  label: {
    marginBottom: 8,
  },
  topSpacing: {
    marginTop: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  securityWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 8,
  },
  warningIcon: {
    marginTop: 2,
  },
  submitButton: {
    marginTop: 24,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    marginTop: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
