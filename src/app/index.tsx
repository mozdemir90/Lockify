import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  ScrollView, 
  Alert,
  Platform,
  Clipboard,
  Share,
  Text
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../context/SessionContext';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import * as ClipboardExpo from 'expo-clipboard';
import { 
  Search, 
  Lock, 
  Plus, 
  Copy, 
  ExternalLink, 
  Trash2, 
  Eye, 
  EyeOff, 
  Key, 
  Globe, 
  Smartphone, 
  Mail, 
  FileText,
  Check,
  FolderOpen,
  Share2
} from 'lucide-react-native';
import { 
  getVaultEntries, 
  saveVaultEntries, 
  DecryptedCredentialEntry 
} from '../services/db';
import { generatePassword } from '../services/crypto';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { lock, activeUser } = useSession();

  // Vault data state
  const [entries, setEntries] = useState<DecryptedCredentialEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal form states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DecryptedCredentialEntry | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'username' | 'email' | 'phone'>('email');
  const [formIdentifier, setFormIdentifier] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCategory, setFormCategory] = useState<'social' | 'work' | 'finance' | 'personal' | 'other'>('personal');
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Load vault entries
  const loadVault = async () => {
    try {
      const data = await getVaultEntries();
      setEntries(data);
    } catch (e) {
      console.error('Failed to load vault entries:', e);
    }
  };

  useEffect(() => {
    loadVault();
  }, []);

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.notesDecrypted.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Handle quick copy
  const handleQuickCopy = async (id: string, text: string) => {
    await ClipboardExpo.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Handle native share
  const handleShare = async (entry: DecryptedCredentialEntry) => {
    try {
      const message = `Hesap Adı: ${entry.name}\nKimlik/Kullanıcı: ${entry.identifier}\nŞifre: ${entry.passwordDecrypted}${entry.link ? `\nLink: ${entry.link}` : ''}${entry.notesDecrypted ? `\nNot: ${entry.notesDecrypted}` : ''}`;
      await Share.share({
        message,
        title: entry.name,
      });
    } catch (error) {
      console.error('Sharing failed:', error);
    }
  };

  // Open modal for add
  const handleAddPress = () => {
    setEditingEntry(null);
    setFormName('');
    setFormType('email');
    setFormIdentifier('');
    setFormPassword('');
    setFormLink('');
    setFormNotes('');
    setFormCategory('personal');
    setShowFormPassword(false);
    setModalVisible(true);
  };

  // Open modal for edit
  const handleEditPress = (entry: DecryptedCredentialEntry) => {
    setEditingEntry(entry);
    setFormName(entry.name);
    setFormType(entry.type);
    setFormIdentifier(entry.identifier);
    setFormPassword(entry.passwordDecrypted);
    setFormLink(entry.link);
    setFormNotes(entry.notesDecrypted);
    setFormCategory(entry.category);
    setShowFormPassword(false);
    setModalVisible(true);
  };

  // Handle Password Generation
  const handleGeneratePassword = () => {
    const generated = generatePassword(16);
    setFormPassword(generated);
    setShowFormPassword(true);
  };

  // Handle Form Save
  const handleSave = async () => {
    if (!formName.trim() || !formIdentifier.trim() || !formPassword) {
      Alert.alert('Hata', 'Lütfen en azından Başlık, Kimlik ve Şifre alanlarını doldurun.');
      return;
    }

    try {
      let updatedEntries = [...entries];

      if (editingEntry) {
        // Edit mode
        updatedEntries = entries.map(entry => {
          if (entry.id === editingEntry.id) {
            return {
              ...entry,
              name: formName,
              type: formType,
              identifier: formIdentifier,
              passwordDecrypted: formPassword,
              link: formLink,
              notesDecrypted: formNotes,
              category: formCategory,
              updatedAt: new Date().toISOString()
            };
          }
          return entry;
        });
      } else {
        // Add mode
        const newEntry: DecryptedCredentialEntry = {
          id: Math.random().toString(36).substr(2, 9),
          name: formName,
          type: formType,
          identifier: formIdentifier,
          passwordDecrypted: formPassword,
          link: formLink,
          notesDecrypted: formNotes,
          category: formCategory,
          updatedAt: new Date().toISOString()
        };
        updatedEntries.unshift(newEntry);
      }

      await saveVaultEntries(updatedEntries);
      setEntries(updatedEntries);
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Hata', 'Şifre kaydedilemedi.');
    }
  };

  // Handle Delete Entry
  const handleDelete = () => {
    if (!editingEntry) return;

    Alert.alert(
      'Silme İşlemi',
      `"${editingEntry.name}" kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const updated = entries.filter(e => e.id !== editingEntry.id);
              await saveVaultEntries(updated);
              setEntries(updated);
              setModalVisible(false);
            } catch (err) {
              Alert.alert('Hata', 'Kayıt silinemedi.');
            }
          }
        }
      ]
    );
  };

  // Get matching icon for credential
  const getIcon = (category: string, type: string) => {
    if (category === 'social') return <Globe size={20} color={colors.primary} />;
    if (category === 'finance') return <Lock size={20} color={colors.success} />;
    
    if (type === 'email') return <Mail size={20} color={colors.textSecondary} />;
    if (type === 'phone') return <Smartphone size={20} color={colors.textSecondary} />;
    return <Key size={20} color={colors.textSecondary} />;
  };

  const categories = [
    { key: 'all', label: 'Tümü' },
    { key: 'personal', label: 'Kişisel' },
    { key: 'work', label: 'İş' },
    { key: 'social', label: 'Sosyal' },
    { key: 'finance', label: 'Finans' },
    { key: 'other', label: 'Diğer' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.primary, borderColor: colors.border }]}>
            <Text style={styles.profileAvatarText}>
              {activeUser ? activeUser.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.headerTexts}>
            <ThemedText type="smallBold" style={{ color: colors.textSecondary, lineHeight: 14 }}>Merhaba,</ThemedText>
            <ThemedText style={styles.headerTitle}>{activeUser}</ThemedText>
          </View>
        </View>
        <TouchableOpacity style={[styles.lockButton, { backgroundColor: colors.backgroundElement }]} onPress={lock}>
          <Lock size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchWrapper, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Şifrelerde ara..."
          placeholderTextColor={colors.textSecondary}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      {/* Categories Filter */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryBadge,
                { backgroundColor: colors.backgroundElement },
                selectedCategory === cat.key && [styles.activeCategoryBadge, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <ThemedText style={[
                styles.categoryText,
                selectedCategory === cat.key && styles.activeCategoryText
              ]}>
                {cat.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Vault Items List */}
      {filteredEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FolderOpen size={64} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 16 }} />
          <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {searchQuery ? 'Aramanızla eşleşen şifre bulunamadı.' : 'Kasanız henüz boş. Eklemek için + butonuna basın.'}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.itemCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}
              onPress={() => handleEditPress(item)}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.cardIconWrapper, { backgroundColor: colors.backgroundSelected }]}>
                  {getIcon(item.category, item.type)}
                </View>
                <View style={styles.cardTexts}>
                  <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>{item.identifier}</ThemedText>
                </View>
              </View>

              <View style={styles.cardRight}>
                <TouchableOpacity 
                  style={styles.cardActionBtn} 
                  onPress={() => handleShare(item)}
                >
                  <Share2 size={18} color={colors.textSecondary} />
                </TouchableOpacity>

                {item.link ? (
                  <TouchableOpacity style={styles.cardActionBtn} onPress={() => {
                    Alert.alert('Web sitesi', item.link);
                  }}>
                    <ExternalLink size={18} color={colors.primary} />
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity 
                  style={[styles.cardActionBtn, copiedId === item.id && { backgroundColor: colors.success + '20' }]} 
                  onPress={() => handleQuickCopy(item.id, item.passwordDecrypted)}
                >
                  {copiedId === item.id ? (
                    <Check size={18} color={colors.success} />
                  ) : (
                    <Copy size={18} color={colors.text} />
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleAddPress}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView type="background" style={[styles.modalContent, { borderTopColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                {editingEntry ? 'Şifre Güncelle' : 'Yeni Şifre Ekle'}
              </ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <ThemedText style={{ color: colors.textSecondary, fontWeight: 'bold' }}>Kapat</ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormScroll}>
              {/* Name */}
              <ThemedText type="smallBold" style={styles.formLabel}>Hesap Adı / Web Sitesi</ThemedText>
              <View style={[styles.formInputWrapper, { borderColor: colors.border }]}>
                <Globe size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Google, Netflix, E-Devlet vb."
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.formInput, { color: colors.text }]}
                />
              </View>

              {/* Link */}
              <ThemedText type="smallBold" style={[styles.formLabel, styles.topSpacing]}>Web Sitesi Bağlantısı (İsteğe Bağlı)</ThemedText>
              <View style={[styles.formInputWrapper, { borderColor: colors.border }]}>
                <ExternalLink size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  value={formLink}
                  onChangeText={setFormLink}
                  placeholder="https://google.com"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  style={[styles.formInput, { color: colors.text }]}
                />
              </View>

              {/* Type Select */}
              <ThemedText type="smallBold" style={[styles.formLabel, styles.topSpacing]}>Kimlik Türü</ThemedText>
              <View style={styles.typeSelectorRow}>
                {['email', 'username', 'phone'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeBadge,
                      { backgroundColor: colors.backgroundElement },
                      formType === type && [styles.typeBadgeActive, { backgroundColor: colors.primary }]
                    ]}
                    onPress={() => setFormType(type as any)}
                  >
                    <ThemedText style={formType === type ? styles.activeCategoryText : { color: colors.textSecondary }}>
                      {type === 'email' ? 'E-posta' : type === 'username' ? 'Kullanıcı Adı' : 'Telefon'}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Identifier Input */}
              <ThemedText type="smallBold" style={[styles.formLabel, styles.topSpacing]}>
                {formType === 'email' ? 'E-posta Adresi' : formType === 'username' ? 'Kullanıcı Adı' : 'Telefon Numarası'}
              </ThemedText>
              <View style={[styles.formInputWrapper, { borderColor: colors.border }]}>
                {formType === 'email' ? (
                  <Mail size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                ) : formType === 'phone' ? (
                  <Smartphone size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                ) : (
                  <Key size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                )}
                <TextInput
                  value={formIdentifier}
                  onChangeText={setFormIdentifier}
                  placeholder={formType === 'email' ? 'ornek@mail.com' : formType === 'phone' ? '0555...' : 'kullanici_adi'}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  style={[styles.formInput, { color: colors.text }]}
                />
              </View>

              {/* Password Input */}
              <ThemedText type="smallBold" style={[styles.formLabel, styles.topSpacing]}>Şifre</ThemedText>
              <View style={[styles.formInputWrapper, { borderColor: colors.border }]}>
                <Lock size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  value={formPassword}
                  onChangeText={setFormPassword}
                  placeholder="Şifre girin"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showFormPassword}
                  autoCapitalize="none"
                  style={[styles.formInput, { color: colors.text }]}
                />
                <TouchableOpacity onPress={() => setShowFormPassword(!showFormPassword)} style={{ marginRight: 8 }}>
                  {showFormPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.genBtn, { backgroundColor: colors.backgroundSelected }]} onPress={handleGeneratePassword}>
                  <ThemedText type="code" style={{ color: colors.primary, fontSize: 10 }}>ÜRET</ThemedText>
                </TouchableOpacity>
              </View>

              {/* Category selector */}
              <ThemedText type="smallBold" style={[styles.formLabel, styles.topSpacing]}>Kategori</ThemedText>
              <View style={styles.typeSelectorRow}>
                {['personal', 'work', 'social', 'finance', 'other'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.typeBadge,
                      { backgroundColor: colors.backgroundElement },
                      formCategory === cat && [styles.typeBadgeActive, { backgroundColor: colors.primary }]
                    ]}
                    onPress={() => setFormCategory(cat as any)}
                  >
                    <ThemedText style={formCategory === cat ? styles.activeCategoryText : { color: colors.textSecondary }}>
                      {cat === 'personal' ? 'Kişisel' : cat === 'work' ? 'İş' : cat === 'social' ? 'Sosyal' : cat === 'finance' ? 'Finans' : 'Diğer'}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
              <ThemedText type="smallBold" style={[styles.formLabel, styles.topSpacing]}>Basit Not Alanı</ThemedText>
              <View style={[styles.formInputWrapper, styles.formTextAreaWrapper, { borderColor: colors.border }]}>
                <FileText size={20} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 10, alignSelf: 'flex-start' }} />
                <TextInput
                  value={formNotes}
                  onChangeText={setFormNotes}
                  placeholder="Ekstra notlar, kurtarma kodları vb."
                  placeholderTextColor={colors.textSecondary}
                  multiline={true}
                  numberOfLines={4}
                  style={[styles.formInput, styles.formTextArea, { color: colors.text }]}
                />
              </View>

              {/* Save & Delete Buttons */}
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <ThemedText style={styles.saveButtonText}>
                  {editingEntry ? 'Güncellemeleri Kaydet' : 'Şifreyi Kaydet'}
                </ThemedText>
              </TouchableOpacity>

              {editingEntry ? (
                <TouchableOpacity style={[styles.deleteButton, { borderColor: colors.error }]} onPress={handleDelete}>
                  <Trash2 size={18} color={colors.error} style={{ marginRight: 8 }} />
                  <ThemedText style={{ color: colors.error, fontWeight: 'bold' }}>Bu Kaydı Sil</ThemedText>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  profileAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerTexts: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  lockButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesContainer: {
    marginVertical: 12,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeCategoryBadge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryText: {
    fontSize: 14,
  },
  activeCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTexts: {
    flex: 1,
  },
  itemName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardRight: {
    flexDirection: 'row',
    gap: 8,
  },
  cardActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  modalFormScroll: {
    padding: 20,
    paddingBottom: 50,
  },
  formLabel: {
    marginBottom: 8,
  },
  formInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  formInput: {
    flex: 1,
    fontSize: 16,
  },
  formTextAreaWrapper: {
    height: 100,
    alignItems: 'flex-start',
  },
  formTextArea: {
    height: '100%',
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  topSpacing: {
    marginTop: 16,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  typeBadgeActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  genBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  saveButton: {
    marginTop: 24,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
});
