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
  Text,
  Linking
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
  const { lock, activeUser, categories, addCategory } = useSession();

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
  const [formCategory, setFormCategory] = useState<string>('personal');
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Move Category states
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [selectedEntryForMove, setSelectedEntryForMove] = useState<DecryptedCredentialEntry | null>(null);

  // Add Category states
  const [newCategoryModalVisible, setNewCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySource, setNewCategorySource] = useState<'filter' | 'form' | 'move' | null>(null);

  // Quick Add states
  const [quickAddName, setQuickAddName] = useState('');

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

  // Handle moving category
  const handleMoveCategory = async (cat: 'social' | 'work' | 'finance' | 'personal' | 'other') => {
    if (!selectedEntryForMove) return;

    try {
      const updatedEntries = entries.map(entry => {
        if (entry.id === selectedEntryForMove.id) {
          return {
            ...entry,
            category: cat,
            updatedAt: new Date().toISOString()
          };
        }
        return entry;
      });

      await saveVaultEntries(updatedEntries);
      setEntries(updatedEntries);
      setMoveModalVisible(false);
      setSelectedEntryForMove(null);
    } catch (err) {
      Alert.alert('Hata', 'Kategori değiştirilemedi.');
    }
  };

  // Handle adding new custom category
  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      if (Platform.OS === 'web') alert('Lütfen kategori adı girin.');
      else Alert.alert('Hata', 'Lütfen kategori adı girin.');
      return;
    }

    const success = await addCategory(newCategoryName.trim());
    if (!success) {
      if (Platform.OS === 'web') alert('Bu isimde bir kategori zaten mevcut veya geçersiz.');
      else Alert.alert('Hata', 'Bu isimde bir kategori zaten mevcut veya geçersiz.');
      return;
    }

    const key = newCategoryName.trim().toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    if (newCategorySource === 'filter') {
      setSelectedCategory(key);
    } else if (newCategorySource === 'form') {
      setFormCategory(key);
    } else if (newCategorySource === 'move' && selectedEntryForMove) {
      try {
        const updatedEntries = entries.map(entry => {
          if (entry.id === selectedEntryForMove.id) {
            return {
              ...entry,
              category: key,
              updatedAt: new Date().toISOString()
            };
          }
          return entry;
        });
        await saveVaultEntries(updatedEntries);
        setEntries(updatedEntries);
        setMoveModalVisible(false);
        setSelectedEntryForMove(null);
      } catch (err) {
        console.error('Auto move failed:', err);
      }
    }

    setNewCategoryName('');
    setNewCategoryModalVisible(false);
    setNewCategorySource(null);
    
    if (Platform.OS === 'web') alert('Kategori başarıyla eklendi.');
    else Alert.alert('Başarılı', 'Kategori başarıyla eklendi.');
  };

  // Handle Quick Add submit
  const handleQuickAddSubmit = () => {
    const name = quickAddName.trim();
    setQuickAddName('');
    
    setEditingEntry(null);
    setFormName(name);
    setFormType('email');
    setFormIdentifier('');
    setFormPassword('');
    setFormLink('');
    setFormNotes('');
    setFormCategory('personal');
    setShowFormPassword(false);
    setModalVisible(true);
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
      if (Platform.OS === 'web') {
        alert('Hata: Lütfen en azından Başlık, Kimlik ve Şifre alanlarını doldurun.');
      } else {
        Alert.alert('Hata', 'Lütfen en azından Başlık, Kimlik ve Şifre alanlarını doldurun.');
      }
      return;
    }

    const isEditing = !!editingEntry;

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

      // Show success message
      const successMsg = isEditing ? 'Kayıt başarıyla güncellendi.' : 'Yeni kayıt başarıyla eklendi.';
      if (Platform.OS === 'web') {
        alert(successMsg);
      } else {
        Alert.alert('Başarılı', successMsg);
      }
    } catch (e: any) {
      if (Platform.OS === 'web') {
        alert('Hata: Şifre kaydedilemedi. ' + e.message);
      } else {
        Alert.alert('Hata', 'Şifre kaydedilemedi: ' + e.message);
      }
    }
  };

  // Handle Delete Entry
  const handleDelete = () => {
    if (!editingEntry) return;

    const performDelete = async () => {
      try {
        const updated = entries.filter(e => e.id !== editingEntry.id);
        await saveVaultEntries(updated);
        setEntries(updated);
        setModalVisible(false);
        
        if (Platform.OS === 'web') {
          alert('Kayıt başarıyla silindi.');
        } else {
          Alert.alert('Başarılı', 'Kayıt başarıyla silindi.');
        }
      } catch (err: any) {
        if (Platform.OS === 'web') {
          alert('Kayıt silinemedi: ' + err.message);
        } else {
          Alert.alert('Hata', 'Kayıt silinemedi: ' + err.message);
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm(`"${editingEntry.name}" kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`);
      if (confirmDelete) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Silme İşlemi',
        `"${editingEntry.name}" kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Sil', 
            style: 'destructive', 
            onPress: performDelete
          }
        ]
      );
    }
  };

  // Category metadata helper for distinct colors and icons
  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'personal':
        return { iconName: 'personal', color: '#8B5CF6', label: 'Kişisel' }; // Violet
      case 'work':
        return { iconName: 'work', color: '#F59E0B', label: 'İş' }; // Amber
      case 'social':
        return { iconName: 'social', color: '#3B82F6', label: 'Sosyal' }; // Blue
      case 'finance':
        return { iconName: 'finance', color: '#10B981', label: 'Finans' }; // Emerald
      case 'other':
        return { iconName: 'other', color: '#6B7280', label: 'Diğer' }; // Gray
      default:
        const colors = ['#EC4899', '#06B6D4', '#14B8A6', '#F43F5E', '#A855F7', '#E11D48'];
        let hash = 0;
        for (let i = 0; i < cat.length; i++) {
          hash = cat.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorIndex = Math.abs(hash) % colors.length;
        return { iconName: 'custom', color: colors[colorIndex], label: cat };
    }
  };

  // Get matching icon for credential
  const getIcon = (category: string, type: string) => {
    const meta = getCategoryMeta(category);
    if (meta.iconName === 'personal') return <Key size={20} color={meta.color} />;
    if (meta.iconName === 'work') return <FileText size={20} color={meta.color} />;
    if (meta.iconName === 'social') return <Globe size={20} color={meta.color} />;
    if (meta.iconName === 'finance') return <Lock size={20} color={meta.color} />;
    return <FolderOpen size={20} color={meta.color} />;
  };

  const filterCategories = [{ key: 'all', label: 'Tümü' }, ...categories];

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

      {/* Quick Add Bar */}
      <View style={[styles.quickAddWrapper, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}>
        <TextInput
          value={quickAddName}
          onChangeText={setQuickAddName}
          placeholder="Hızlı Şifre Kaydet (Örn: Netflix)"
          placeholderTextColor={colors.textSecondary}
          style={[styles.quickAddInput, { color: colors.text }]}
          onSubmitEditing={handleQuickAddSubmit}
        />
        <TouchableOpacity 
          style={[styles.quickAddBtn, { backgroundColor: colors.primary }]} 
          onPress={handleQuickAddSubmit}
        >
          <Plus size={18} color="#fff" />
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
          {filterCategories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryBadge,
                { backgroundColor: colors.backgroundElement },
                selectedCategory === cat.key && [styles.activeCategoryBadge, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {cat.key !== 'all' && (
                  <View 
                    style={[
                      styles.colorDot, 
                      { 
                        backgroundColor: selectedCategory === cat.key ? '#fff' : getCategoryMeta(cat.key).color 
                      }
                    ]} 
                  />
                )}
                <ThemedText style={[
                  styles.categoryText,
                  selectedCategory === cat.key && styles.activeCategoryText
                ]}>
                  {cat.label}
                </ThemedText>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.categoryBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary, borderWidth: 1 }]}
            onPress={() => {
              setNewCategorySource('filter');
              setNewCategoryModalVisible(true);
            }}
          >
            <ThemedText style={{ color: colors.primary, fontWeight: 'bold' }}>+ Yeni</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Hint Row */}
      {filteredEntries.length > 0 && (
        <View style={styles.hintContainer}>
          <ThemedText type="small" style={{ color: colors.textSecondary, textAlign: 'center', fontStyle: 'italic' }}>
            💡 Kategorisini hızlıca değiştirmek için şifre kartına basılı tutun.
          </ThemedText>
        </View>
      )}

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
              onLongPress={() => {
                setSelectedEntryForMove(item);
                setMoveModalVisible(true);
              }}
              delayLongPress={300}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.cardIconWrapper, { backgroundColor: getCategoryMeta(item.category).color + '15' }]}>
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
                    let url = item.link.trim();
                    if (!/^https?:\/\//i.test(url)) {
                      url = 'https://' + url;
                    }
                    Linking.openURL(url).catch(() => {
                      if (Platform.OS === 'web') {
                        alert('Bağlantı açılamadı.');
                      } else {
                        Alert.alert('Hata', 'Bağlantı açılamadı.');
                      }
                    });
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
                {categories.map((cat) => {
                  const meta = getCategoryMeta(cat.key);
                  const isSelected = formCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.typeBadge,
                        { backgroundColor: colors.backgroundElement },
                        isSelected && [styles.typeBadgeActive, { backgroundColor: meta.color }]
                      ]}
                      onPress={() => setFormCategory(cat.key)}
                    >
                      <ThemedText style={isSelected ? styles.activeCategoryText : { color: colors.textSecondary }}>
                        {cat.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.typeBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary, borderWidth: 1 }]}
                  onPress={() => {
                    setNewCategorySource('form');
                    setNewCategoryModalVisible(true);
                  }}
                >
                  <ThemedText style={{ color: colors.primary, fontWeight: 'bold' }}>+ Yeni Ekle</ThemedText>
                </TouchableOpacity>
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

      {/* Category Move Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={moveModalVisible}
        onRequestClose={() => setMoveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView type="background" style={[styles.modalContent, styles.moveModalContent, { borderTopColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <ThemedText type="subtitle" style={styles.modalTitle}>Kategoriye Taşı</ThemedText>
                {selectedEntryForMove && (
                  <ThemedText type="small" style={{ color: colors.textSecondary, marginTop: 2 }}>
                    "{selectedEntryForMove.name}" hesabını taşımak istediğiniz kategoriyi seçin.
                  </ThemedText>
                )}
              </View>
              <TouchableOpacity onPress={() => setMoveModalVisible(false)}>
                <ThemedText style={{ color: colors.textSecondary, fontWeight: 'bold' }}>Kapat</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.moveList}>
              {categories.map((item) => {
                const isCurrent = selectedEntryForMove?.category === item.key;
                
                let icon = <FolderOpen size={18} color={colors.textSecondary} />;
                if (item.key === 'personal') icon = <Key size={18} color={colors.textSecondary} />;
                else if (item.key === 'work') icon = <FileText size={18} color={colors.textSecondary} />;
                else if (item.key === 'social') icon = <Globe size={18} color={colors.primary} />;
                else if (item.key === 'finance') icon = <Lock size={18} color={colors.success} />;

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.moveItem,
                      { borderColor: colors.border, backgroundColor: colors.backgroundElement },
                      isCurrent && { borderColor: colors.primary, borderWidth: 1.5 }
                    ]}
                    onPress={() => handleMoveCategory(item.key as any)}
                  >
                    <View style={styles.moveItemLeft}>
                      <View style={[styles.moveIconWrapper, { backgroundColor: colors.backgroundSelected }]}>
                        {icon}
                      </View>
                      <ThemedText style={[styles.moveLabel, isCurrent && { color: colors.primary, fontWeight: 'bold' }]}>
                        {item.label}
                      </ThemedText>
                    </View>
                    {isCurrent && (
                      <View style={[styles.currentBadge, { backgroundColor: colors.primary + '15' }]}>
                        <ThemedText type="small" style={{ color: colors.primary, fontWeight: 'bold' }}>Mevcut</ThemedText>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.moveItem, { borderColor: colors.primary, borderStyle: 'dashed', backgroundColor: colors.primary + '05' }]}
                onPress={() => {
                  setNewCategorySource('move');
                  setNewCategoryModalVisible(true);
                }}
              >
                <View style={styles.moveItemLeft}>
                  <View style={[styles.moveIconWrapper, { backgroundColor: colors.primary + '15' }]}>
                    <Plus size={18} color={colors.primary} />
                  </View>
                  <ThemedText style={[styles.moveLabel, { color: colors.primary, fontWeight: 'bold' }]}>
                    Yeni Kategori Ekle
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>

      {/* Add Custom Category Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={newCategoryModalVisible}
        onRequestClose={() => {
          setNewCategoryModalVisible(false);
          setNewCategorySource(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.alertContent}>
            <ThemedText style={styles.alertTitle}>Yeni Kategori Ekle</ThemedText>
            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Kategori Adı (Örn: E-Devlet, Oyun)"
              placeholderTextColor={colors.textSecondary}
              autoFocus={true}
              style={[styles.alertInput, { color: colors.text, borderColor: colors.border }]}
            />
            <View style={styles.alertButtonsRow}>
              <TouchableOpacity 
                style={[styles.alertButton, { borderColor: colors.border, borderWidth: 1 }]} 
                onPress={() => {
                  setNewCategoryName('');
                  setNewCategoryModalVisible(false);
                  setNewCategorySource(null);
                }}
              >
                <ThemedText style={{ color: colors.textSecondary }}>İptal</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.alertButton, { backgroundColor: colors.primary }]} 
                onPress={handleAddNewCategory}
              >
                <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Ekle</ThemedText>
              </TouchableOpacity>
            </View>
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
  hintContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  moveList: {
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  moveItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  moveItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moveIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertContent: {
    width: '80%',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  alertInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  alertButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  alertButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  quickAddInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  quickAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
});
