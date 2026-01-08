import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions
} from 'react-native';
import { useAuth } from './AuthContext';
import { firestoreService } from './firestoreService';
import { imageService } from './imageService';

const { width } = Dimensions.get('window');
const imageSize = (width - 48) / 3; // 3 columns with padding

export default function ImagesTab() {
  const { currentUser } = useAuth();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [imageTitle, setImageTitle] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [selectedUri, setSelectedUri] = useState(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      const imagesData = await firestoreService.getImages(currentUser.uid);
      setImages(imagesData);
    } catch (error) {
      console.error('Error loading images:', error);
      Alert.alert('Error', 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await imageService.pickImage();
      if (result) {
        setSelectedUri(result.uri);
        setShowAddModal(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUploadImage = async () => {
    if (!selectedUri) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    if (!imageTitle.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      setUploading(true);

      // Save image locally to device
      const saveResult = await imageService.saveImageLocally(
        selectedUri,
        imageTitle
      );

      // Save metadata to Firestore (path is local, not cloud)
      await firestoreService.addImage(currentUser.uid, {
        title: imageTitle,
        description: imageDescription,
        localPath: saveResult.localPath,
        fileName: saveResult.fileName,
      });

      Alert.alert('Success', 'Image saved successfully');
      setShowAddModal(false);
      setImageTitle('');
      setImageDescription('');
      setSelectedUri(null);
      loadImages();
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Failed to save image');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (image) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from Storage
              await imageService.deleteImage(image.storagePath);
              
              // Delete from Firestore
              await firestoreService.deleteImage(currentUser.uid, image.id);
              
              Alert.alert('Success', 'Image deleted');
              loadImages();
            } catch (error) {
              console.error('Error deleting image:', error);
              Alert.alert('Error', 'Failed to delete image');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading images...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Images ({images.length})</Text>
        <TouchableOpacity style={styles.addButton} onPress={handlePickImage}>
          <Text style={styles.addButtonText}>+ Add Image</Text>
        </TouchableOpacity>
      </View>

      {/* Image Grid */}
      <ScrollView style={styles.scrollView}>
        {images.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🖼️</Text>
            <Text style={styles.emptyText}>No images yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add your first image</Text>
          </View>
        ) : (
          <View style={styles.imageGrid}>
            {images.map((image) => (
              <TouchableOpacity
                key={image.id}
                style={styles.imageCard}
                onPress={() => setSelectedImage(image)}
                onLongPress={() => handleDeleteImage(image)}
              >
                <Image
                  source={{ uri: image.thumbnailUrl }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <Text style={styles.imageTitle} numberOfLines={2}>
                    {image.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Full Image Modal */}
      {selectedImage && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.fullImageModal}>
            <TouchableOpacity
              style={styles.fullImageBackdrop}
              activeOpacity={1}
              onPress={() => setSelectedImage(null)}
            >
              <View style={styles.fullImageContainer}>
                <Image
                  source={{ uri: selectedImage.url }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
                <View style={styles.fullImageInfo}>
                  <Text style={styles.fullImageTitle}>{selectedImage.title}</Text>
                  {selectedImage.description && (
                    <Text style={styles.fullImageDescription}>
                      {selectedImage.description}
                    </Text>
                  )}
                  <Text style={styles.fullImageDate}>
                    Added {new Date(selectedImage.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.fullImageActions}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      setSelectedImage(null);
                      handleDeleteImage(selectedImage);
                    }}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* Add Image Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !uploading && setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Image</Text>

            {selectedUri && (
              <Image
                source={{ uri: selectedUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Image title *"
              value={imageTitle}
              onChangeText={setImageTitle}
              editable={!uploading}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={imageDescription}
              onChangeText={setImageDescription}
              multiline
              numberOfLines={3}
              editable={!uploading}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.uploadButton, uploading && styles.buttonDisabled]}
                onPress={handleUploadImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.uploadButtonText}>Upload</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  if (!uploading) {
                    setShowAddModal(false);
                    setImageTitle('');
                    setImageDescription('');
                    setSelectedUri(null);
                  }
                }}
                disabled={uploading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  addButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
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
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  imageCard: {
    width: imageSize,
    height: imageSize,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
  },
  imageTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  fullImageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  fullImageBackdrop: {
    flex: 1,
  },
  fullImageContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  fullImage: {
    width: '100%',
    height: '70%',
  },
  fullImageInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  fullImageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  fullImageDescription: {
    fontSize: 14,
    color: '#E5E7EB',
    marginBottom: 8,
  },
  fullImageDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  fullImageActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});
