import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { firestoreService } from './firestoreService';

const MAX_WORDS = 10000;

export default function NotesTab() {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const colors = theme ? theme.colors : null;
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [currentNote, setCurrentNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [saving, setSaving] = useState(false);

  // Fallback colors
  const safeColors = colors || {
    background: '#F3F4F6',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    primary: '#4F46E5',
    border: '#E5E7EB'
  };

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    const words = noteContent.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [noteContent]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const notesData = await firestoreService.getNotes(currentUser.uid);
      setNotes(notesData);
    } catch (error) {
      console.error('Error loading notes:', error);
      Alert.alert('Error', 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleNewNote = () => {
    setCurrentNote(null);
    setNoteTitle('');
    setNoteContent('');
    setShowEditor(true);
  };

  const handleEditNote = (note) => {
    setCurrentNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setShowEditor(true);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!noteContent.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    if (wordCount > MAX_WORDS) {
      Alert.alert('Error', `Note exceeds maximum word limit of ${MAX_WORDS} words`);
      return;
    }

    try {
      setSaving(true);

      const noteData = {
        title: noteTitle,
        content: noteContent,
      };

      if (currentNote) {
        // Update existing note
        await firestoreService.updateNote(currentUser.uid, currentNote.id, noteData);
        Alert.alert('Success', 'Note updated');
      } else {
        // Create new note
        await firestoreService.addNote(currentUser.uid, noteData);
        Alert.alert('Success', 'Note created');
      }

      setShowEditor(false);
      setCurrentNote(null);
      setNoteTitle('');
      setNoteContent('');
      loadNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (note) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestoreService.deleteNote(currentUser.uid, note.id);
              Alert.alert('Success', 'Note deleted');
              loadNotes();
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Error', 'Failed to delete note');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getPreview = (content) => {
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: safeColors.background }]}>
        <ActivityIndicator size="large" color={safeColors.primary} />
        <Text style={[styles.loadingText, { color: safeColors.textSecondary }]}>Loading notes...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: safeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: safeColors.surface, borderBottomColor: safeColors.border }]}>
        <Text style={[styles.headerTitle, { color: safeColors.text }]}>Notes ({notes.length})</Text>
        <TouchableOpacity style={[styles.newButton, { backgroundColor: safeColors.primary }]} onPress={handleNewNote}>
          <Text style={styles.newButtonText}>+ New Note</Text>
        </TouchableOpacity>
      </View>

      {/* Notes List */}
      <ScrollView style={styles.scrollView}>
        {notes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={[styles.emptyText, { color: safeColors.text }]}>No notes yet</Text>
            <Text style={[styles.emptySubtext, { color: safeColors.textSecondary }]}>Tap the + button to create your first note</Text>
          </View>
        ) : (
          <View style={styles.notesList}>
            {notes.map((note) => (
              <TouchableOpacity
                key={note.id}
                style={[styles.noteCard, { backgroundColor: safeColors.surface }]}
                onPress={() => handleEditNote(note)}
                onLongPress={() => handleDeleteNote(note)}
              >
                <View style={styles.noteHeader}>
                  <Text style={[styles.noteTitle, { color: safeColors.text }]}>{note.title}</Text>
                  <Text style={[styles.noteWordCount, { color: safeColors.textSecondary }]}>{note.wordCount} words</Text>
                </View>
                <Text style={[styles.notePreview, { color: safeColors.textSecondary }]}>{getPreview(note.content)}</Text>
                <View style={styles.noteFooter}>
                  <Text style={[styles.noteDate, { color: safeColors.textSecondary }]}>{formatDate(note.updatedAt)}</Text>
                  <TouchableOpacity
                    style={styles.deleteIconButton}
                    onPress={() => handleDeleteNote(note)}
                  >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Editor Modal */}
      <Modal
        visible={showEditor}
        animationType="slide"
        onRequestClose={() => !saving && setShowEditor(false)}
      >
        <View style={styles.editorContainer}>
          {/* Editor Header */}
          <View style={styles.editorHeader}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                if (!saving) {
                  Alert.alert(
                    'Discard Changes',
                    'Are you sure you want to discard your changes?',
                    [
                      { text: 'Keep Editing', style: 'cancel' },
                      {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => {
                          setShowEditor(false);
                          setCurrentNote(null);
                          setNoteTitle('');
                          setNoteContent('');
                        }
                      }
                    ]
                  );
                }
              }}
              disabled={saving}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editorTitle}>
              {currentNote ? 'Edit Note' : 'New Note'}
            </Text>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSaveNote}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#4F46E5" size="small" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Word Count */}
          <View style={styles.wordCountContainer}>
            <Text style={[
              styles.wordCountText,
              wordCount > MAX_WORDS && styles.wordCountError
            ]}>
              {wordCount} / {MAX_WORDS} words
              {wordCount > MAX_WORDS && ' (Exceeded limit!)'}
            </Text>
          </View>

          {/* Title Input */}
          <TextInput
            style={styles.titleInput}
            placeholder="Note Title"
            placeholderTextColor="#9CA3AF"
            value={noteTitle}
            onChangeText={setNoteTitle}
            editable={!saving}
          />

          {/* Content Input */}
          <ScrollView style={styles.contentScrollView}>
            <TextInput
              style={styles.contentInput}
              placeholder="Start writing your note..."
              placeholderTextColor="#9CA3AF"
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              editable={!saving}
              textAlignVertical="top"
            />
          </ScrollView>
        </View>
      </Modal>
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
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  newButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  notesList: {
    padding: 16,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  noteWordCount: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  notePreview: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteIconButton: {
    padding: 4,
  },
  deleteIcon: {
    fontSize: 18,
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: 50, // Account for notch
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  saveText: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  wordCountContainer: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  wordCountText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  wordCountError: {
    color: '#DC2626',
    fontWeight: '600',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    color: '#111827',
  },
  contentScrollView: {
    flex: 1,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    padding: 16,
    color: '#111827',
    lineHeight: 24,
    minHeight: 500,
  },
});
