import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
  FlatList,
  Share
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { firestoreService } from './firestoreService';
import { notificationService } from './notificationService';

export default function LinksTab() {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const colors = theme ? theme.colors : null;
  const [links, setLinks] = useState([]);
  const [categories, setCategories] = useState([
    'AI', 'Job', 'Health', 'Python', 'StockMarket', 'Technicals', 'Fundamentals', 'Uncategorized'
  ]);
  const [tags, setTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showEditCategoryPicker, setShowEditCategoryPicker] = useState(false);
  const [newLink, setNewLink] = useState({ 
    url: '', 
    title: '', 
    category: '', 
    tags: [], 
    customCategory: '',
    reminderDate: null 
  });
  const [editingLink, setEditingLink] = useState(null);
  const [editForm, setEditForm] = useState({ 
    title: '', 
    url: '', 
    category: '', 
    tags: [] 
  });
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [tempReminderDate, setTempReminderDate] = useState(new Date());

  const safeColors = colors || {
    background: '#F3F4F6',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    primary: '#4F46E5',
    border: '#E5E7EB'
  };

  useEffect(() => {
    loadData();
    requestNotificationPermissions();
  }, []);

  const requestNotificationPermissions = async () => {
    await notificationService.requestPermissions();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [linksData, categoriesData, tagsData] = await Promise.all([
        firestoreService.getLinks(currentUser.uid),
        firestoreService.getCategories(currentUser.uid),
        firestoreService.getTags(currentUser.uid)
      ]);
      
      setLinks(linksData);
      if (categoriesData.length > 0) setCategories(categoriesData);
      if (tagsData.length > 0) setTags(tagsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const detectLinkType = (url) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter';
    if (url.includes('instagram.com')) return 'Instagram';
    if (url.includes('substack.com')) return 'Substack';
    if (url.includes('docs.google.com/spreadsheets')) return 'Google Sheets';
    return 'Webpage';
  };

  const suggestCategory = (url) => {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('ai') || urlLower.includes('artificial') || urlLower.includes('machine-learning')) return 'AI';
    if (urlLower.includes('job') || urlLower.includes('career') || urlLower.includes('hire')) return 'Job';
    if (urlLower.includes('health') || urlLower.includes('fitness') || urlLower.includes('medical')) return 'Health';
    if (urlLower.includes('python') || urlLower.includes('py')) return 'Python';
    if (urlLower.includes('stock') || urlLower.includes('market') || urlLower.includes('trading')) return 'StockMarket';
    if (urlLower.includes('technical') || urlLower.includes('analysis')) return 'Technicals';
    if (urlLower.includes('fundamental')) return 'Fundamentals';
    return 'Uncategorized';
  };

  const handlePasteURL = () => {
    Alert.prompt(
      'Paste URL',
      'Paste your URL here:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (url) => {
            if (url && url.trim()) {
              setNewLink({ 
                ...newLink, 
                url: url.trim(),
                category: suggestCategory(url.trim())
              });
              Alert.alert('Success', 'URL added successfully');
            } else {
              Alert.alert('Error', 'Please enter a valid URL');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const addLink = async () => {
    if (!newLink.url) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }
    
    const finalCategory = newLink.category || newLink.customCategory;
    if (!finalCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    
    try {
      const type = detectLinkType(newLink.url);
      
      if (newLink.customCategory && !categories.includes(newLink.customCategory)) {
        await firestoreService.addCategory(currentUser.uid, newLink.customCategory);
        setCategories([...categories, newLink.customCategory]);
      }

      let notificationId = null;
      if (newLink.reminderDate) {
        notificationId = await notificationService.scheduleReminder(
          newLink.title || newLink.url,
          newLink.url,
          newLink.reminderDate
        );
      }
      
      const linkData = {
        url: newLink.url,
        title: newLink.title || newLink.url,
        type,
        category: finalCategory,
        tags: newLink.tags,
        read: false,
        reminderDate: newLink.reminderDate ? newLink.reminderDate.toISOString() : null,
        notificationId,
        addedAt: new Date().toISOString()
      };
      
      await firestoreService.addLink(currentUser.uid, linkData);
      await loadData();
      setNewLink({ url: '', title: '', category: '', tags: [], customCategory: '', reminderDate: null });
      setShowAddModal(false);
      Alert.alert('Success', 'Link added successfully');
    } catch (error) {
      console.error('Error adding link:', error);
      Alert.alert('Error', 'Failed to add link');
    }
  };

  const toggleRead = async (linkId, currentReadStatus) => {
    try {
      await firestoreService.updateLink(currentUser.uid, linkId, { read: !currentReadStatus });
      await loadData();
    } catch (error) {
      console.error('Error updating link:', error);
      Alert.alert('Error', 'Failed to update link');
    }
  };

  const deleteLink = async (linkId, notificationId) => {
    Alert.alert(
      'Delete Link',
      'Are you sure you want to delete this link?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (notificationId) {
                await notificationService.cancelReminder(notificationId);
              }
              
              await firestoreService.deleteLink(currentUser.uid, linkId);
              await loadData();
              Alert.alert('Success', 'Link deleted');
            } catch (error) {
              console.error('Error deleting link:', error);
              Alert.alert('Error', 'Failed to delete link');
            }
          }
        }
      ]
    );
  };

  const startEditLink = (link) => {
    setEditingLink(link.id);
    setEditForm({
      title: link.title,
      url: link.url,
      category: link.category,
      tags: link.tags
    });
  };

  const saveEditLink = async () => {
    if (!editForm.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    try {
      await firestoreService.updateLink(currentUser.uid, editingLink, editForm);
      await loadData();
      setEditingLink(null);
      setEditForm({ title: '', url: '', category: '', tags: [] });
      Alert.alert('Success', 'Link updated');
    } catch (error) {
      console.error('Error updating link:', error);
      Alert.alert('Error', 'Failed to update link');
    }
  };

  const cancelEdit = () => {
    setEditingLink(null);
    setEditForm({ title: '', url: '', category: '', tags: [] });
  };

  const handleSetReminder = () => {
    setTempReminderDate(new Date());
    setShowReminderPicker(true);
  };

  const confirmReminder = () => {
    setNewLink({ ...newLink, reminderDate: tempReminderDate });
    setShowReminderPicker(false);
  };

  const clearReminder = () => {
    setNewLink({ ...newLink, reminderDate: null });
  };

  const filteredLinks = links.filter(link => {
    const matchesSearch = link.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         link.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         link.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || link.category === filterCategory;
    const matchesRead = filterRead === 'all' || 
                       (filterRead === 'read' && link.read) || 
                       (filterRead === 'unread' && !link.read);
    return matchesSearch && matchesCategory && matchesRead;
  });

  const getTypeColor = (type) => {
    switch (type) {
      case 'YouTube': return { bg: '#FEE2E2', text: '#991B1B' };
      case 'Twitter': return { bg: '#DBEAFE', text: '#1E3A8A' };
      case 'Instagram': return { bg: '#FCE7F3', text: '#831843' };
      case 'Substack': return { bg: '#FED7AA', text: '#9A3412' };
      case 'Google Sheets': return { bg: '#D1FAE5', text: '#065F46' };
      default: return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: safeColors.background }]}>
      <View style={[styles.searchSection, { backgroundColor: safeColors.surface }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: safeColors.background, borderColor: safeColors.border, color: safeColors.text }]}
          placeholder="Search links..."
          placeholderTextColor={safeColors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={[styles.addButton, { backgroundColor: safeColors.primary }]} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addButtonText}>+ Add Link</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.linksList}>
        {filteredLinks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: safeColors.textSecondary }]}>No links found. Add your first link to get started!</Text>
          </View>
        ) : (
          filteredLinks.map(link => (
            <View key={link.id} style={[styles.linkCard, { backgroundColor: safeColors.surface }]}>
              {editingLink === link.id ? (
                <View>
                  <TextInput
                    style={styles.input}
                    placeholder="Title/Label"
                    value={editForm.title}
                    onChangeText={(text) => setEditForm({ ...editForm, title: text })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="URL"
                    value={editForm.url}
                    onChangeText={(text) => setEditForm({ ...editForm, url: text })}
                  />
                  
                  <TouchableOpacity 
                    style={[styles.categoryButton, { borderColor: safeColors.primary }]}
                    onPress={() => setShowEditCategoryPicker(true)}
                  >
                    <Text style={[styles.categoryButtonText, { color: editForm.category ? safeColors.primary : safeColors.textSecondary }]}>
                      {editForm.category || 'Select Category *'}
                    </Text>
                  </TouchableOpacity>

                  <Modal
                    visible={showEditCategoryPicker}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowEditCategoryPicker(false)}
                  >
                    <View style={styles.categoryPickerContainer}>
                      <View style={styles.categoryPickerContent}>
                        <Text style={styles.categoryPickerTitle}>Select Category</Text>
                        <FlatList
                          data={categories}
                          keyExtractor={(item) => item}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[
                                styles.categoryOption,
                                editForm.category === item && styles.categoryOptionSelected
                              ]}
                              onPress={() => {
                                setEditForm({ ...editForm, category: item });
                                setShowEditCategoryPicker(false);
                              }}
                            >
                              <Text style={[
                                styles.categoryOptionText,
                                editForm.category === item && styles.categoryOptionTextSelected
                              ]}>
                                {item}
                              </Text>
                            </TouchableOpacity>
                          )}
                        />
                        <TouchableOpacity
                          style={styles.closeCategoryPicker}
                          onPress={() => setShowEditCategoryPicker(false)}
                        >
                          <Text style={styles.closeCategoryPickerText}>Close</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>

                  <View style={styles.editButtons}>
                    <TouchableOpacity style={styles.saveButton} onPress={saveEditLink}>
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.linkTitle}>{link.title}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: getTypeColor(link.type).bg }]}>
                      <Text style={[styles.badgeText, { color: getTypeColor(link.type).text }]}>
                        {link.type}
                      </Text>
                    </View>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{link.category}</Text>
                    </View>
                    {link.read && (
                      <View style={styles.readBadge}>
                        <Text style={styles.readBadgeText}>Read</Text>
                      </View>
                    )}
                    {link.reminderDate && (
                      <View style={styles.reminderBadge}>
                        <Text style={styles.reminderBadgeText}>⏰ Reminder</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.linkUrl} numberOfLines={2}>{link.url}</Text>
                  {link.reminderDate && (
                    <Text style={styles.reminderText}>
                      Reminder: {new Date(link.reminderDate).toLocaleString()}
                    </Text>
                  )}
                  <View style={styles.linkActions}>
                    <TouchableOpacity onPress={() => toggleRead(link.id, link.read)}>
                      <Text style={styles.actionText}>{link.read ? 'Unread' : 'Read'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => startEditLink(link)}>
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Linking.openURL(link.url)}>
                      <Text style={styles.actionText}>Open</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteLink(link.id, link.notificationId)}>
                      <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Link</Text>
              
              <View style={styles.urlInputContainer}>
                <TextInput
                  style={[styles.modalInput, { flex: 1 }]}
                  placeholder="Paste URL here..."
                  placeholderTextColor="#9CA3AF"
                  value={newLink.url}
                  onChangeText={(text) => setNewLink({ ...newLink, url: text, category: suggestCategory(text) })}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.pasteButton}
                  onPress={handlePasteURL}
                >
                  <Text style={styles.pasteButtonText}>📋</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Add a title/label"
                placeholderTextColor="#9CA3AF"
                value={newLink.title}
                onChangeText={(text) => setNewLink({ ...newLink, title: text })}
              />
              
              {newLink.url && (
                <View style={styles.detectedInfo}>
                  <Text style={styles.detectedText}>Type: {detectLinkType(newLink.url)}</Text>
                  <Text style={styles.detectedText}>Suggested: {suggestCategory(newLink.url)}</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={[styles.categoryButton, { borderColor: '#4F46E5' }]}
                onPress={() => setShowCategoryPicker(true)}
              >
                <Text style={[styles.categoryButtonText, { color: newLink.category ? '#4F46E5' : '#9CA3AF' }]}>
                  {newLink.category || 'Select Category *'}
                </Text>
              </TouchableOpacity>

              <Modal
                visible={showCategoryPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCategoryPicker(false)}
              >
                <View style={styles.categoryPickerContainer}>
                  <View style={styles.categoryPickerContent}>
                    <Text style={styles.categoryPickerTitle}>Select Category</Text>
                    <FlatList
                      data={categories}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.categoryOption,
                            newLink.category === item && styles.categoryOptionSelected
                          ]}
                          onPress={() => {
                            setNewLink({ ...newLink, category: item });
                            setShowCategoryPicker(false);
                          }}
                        >
                          <Text style={[
                            styles.categoryOptionText,
                            newLink.category === item && styles.categoryOptionTextSelected
                          ]}>
                            {item}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                    <TouchableOpacity
                      style={styles.closeCategoryPicker}
                      onPress={() => setShowCategoryPicker(false)}
                    >
                      <Text style={styles.closeCategoryPickerText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
              
              <View style={styles.reminderSection}>
                {newLink.reminderDate ? (
                  <View style={styles.reminderSet}>
                    <Text style={styles.reminderSetText}>
                      ⏰ {new Date(newLink.reminderDate).toLocaleString()}
                    </Text>
                    <TouchableOpacity onPress={clearReminder}>
                      <Text style={styles.clearReminderText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.setReminderButton} onPress={handleSetReminder}>
                    <Text style={styles.setReminderText}>⏰ Set Reminder (Optional)</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalAddButton} onPress={addLink}>
                  <Text style={styles.modalAddButtonText}>Add Link</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalCancelButton} 
                  onPress={() => {
                    setShowAddModal(false);
                    setNewLink({ url: '', title: '', category: '', tags: [], customCategory: '', reminderDate: null });
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {showReminderPicker && (
        <Modal visible={true} transparent={true} animationType="slide">
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerTitle}>Set Reminder</Text>
              <DateTimePicker
                value={tempReminderDate}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setTempReminderDate(selectedDate);
                  }
                }}
                minimumDate={new Date()}
              />
              <View style={styles.pickerButtons}>
                <TouchableOpacity style={styles.pickerConfirmButton} onPress={confirmReminder}>
                  <Text style={styles.pickerConfirmText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerCancelButton} onPress={() => setShowReminderPicker(false)}>
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
  },
  searchSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  linksList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  linkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  linkTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#E0E7FF',
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3730A3',
  },
  readBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
  },
  readBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  reminderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  reminderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  linkUrl: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  reminderText: {
    fontSize: 12,
    color: '#F59E0B',
    marginBottom: 8,
    fontWeight: '500',
  },
  linkActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  deleteText: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  categoryButton: {
    borderWidth: 2,
    borderColor: '#4F46E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  categoryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryPickerContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  categoryPickerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  categoryPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#111827',
  },
  categoryOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  categoryOptionTextSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  closeCategoryPicker: {
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeCategoryPickerText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginVertical: 60,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  pasteButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#E0E7FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  pasteButtonText: {
    fontSize: 18,
  },
  detectedInfo: {
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  detectedText: {
    fontSize: 14,
    color: '#4F46E5',
    marginBottom: 4,
  },
  reminderSection: {
    marginBottom: 12,
  },
  setReminderButton: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  setReminderText: {
    color: '#92400E',
    fontWeight: '600',
  },
  reminderSet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
  },
  reminderSetText: {
    color: '#92400E',
    fontWeight: '600',
  },
  clearReminderText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalAddButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalAddButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  pickerConfirmButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerCancelText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});
