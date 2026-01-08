import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

const IMAGES_DIRECTORY = `${FileSystem.documentDirectory}images/`;

export const imageService = {
  // Initialize images directory
  async initializeDirectory() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(IMAGES_DIRECTORY, { intermediates: true });
      }
    } catch (error) {
      console.error('Error initializing directory:', error);
      // Directory might already exist, continue anyway
    }
  },

  // Request permissions
  async requestPermissions() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to upload images!');
      return false;
    }
    return true;
  },

  // Pick image from library
  async pickImage() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        return result.assets[0];
      }
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      return null;
    }
  },

  // Take photo with camera
  async takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions!');
      return null;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        return result.assets[0];
      }
      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      return null;
    }
  },

  // Save image locally to device
  async saveImageLocally(imageUri, imageName) {
    try {
      await this.initializeDirectory();
      
      // Create a unique filename with timestamp
      const timestamp = Date.now();
      const cleanName = imageName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${timestamp}_${cleanName}.jpg`;
      const localPath = `${IMAGES_DIRECTORY}${fileName}`;
      
      // Copy the image to our app's directory
      await FileSystem.copyAsync({
        from: imageUri,
        to: localPath
      });
      
      return {
        localPath: localPath,
        fileName: fileName
      };
    } catch (error) {
      console.error('Error saving image locally:', error);
      throw error;
    }
  },

  // Delete image from local storage
  async deleteImageLocally(localPath) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localPath);
      }
    } catch (error) {
      console.error('Error deleting local image:', error);
      throw error;
    }
  },

  // Get image size (in bytes)
  async getImageSize(imageUri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      return fileInfo.size || 0;
    } catch (error) {
      console.error('Error getting image size:', error);
      return 0;
    }
  },

  // Get all local images (for debugging)
  async getAllLocalImages() {
    try {
      await this.initializeDirectory();
      const files = await FileSystem.readDirectoryAsync(IMAGES_DIRECTORY);
      return files;
    } catch (error) {
      console.error('Error reading local images:', error);
      return [];
    }
  }
};
