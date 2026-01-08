import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  query,
  orderBy,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';

export const firestoreService = {
  // ============ LINKS ============
  
  // Add a new link
  async addLink(userId, linkData) {
    try {
      const linksRef = collection(db, 'users', userId, 'links');
      const docRef = await addDoc(linksRef, {
        ...linkData,
        notificationId: linkData.notificationId || null,
        reminderDate: linkData.reminderDate || null,
	createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding link:', error);
      throw error;
    }
  },

  // Get all links for a user
  async getLinks(userId) {
    try {
      const linksRef = collection(db, 'users', userId, 'links');
      const q = query(linksRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting links:', error);
      throw error;
    }
  },

  // Update a link
  async updateLink(userId, linkId, updates) {
    try {
      const linkRef = doc(db, 'users', userId, 'links', linkId);
      await updateDoc(linkRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating link:', error);
      throw error;
    }
  },

  // Delete a link
  async deleteLink(userId, linkId) {
    try {
      const linkRef = doc(db, 'users', userId, 'links', linkId);
      await deleteDoc(linkRef);
    } catch (error) {
      console.error('Error deleting link:', error);
      throw error;
    }
  },

  // Get link count (for subscription limits)
  async getLinkCount(userId) {
    try {
      const links = await this.getLinks(userId);
      return links.length;
    } catch (error) {
      console.error('Error getting link count:', error);
      throw error;
    }
  },

  // ============ CATEGORIES ============
  
  // Get all categories for a user
  async getCategories(userId) {
    try {
      // First check if user has custom categories
      const categoriesRef = collection(db, 'users', userId, 'categories');
      const snapshot = await getDocs(categoriesRef);
      
      if (snapshot.empty) {
        // Return default categories if none exist
        return ['AI', 'Job', 'Health', 'Python', 'StockMarket', 'Technicals', 'Fundamentals', 'Uncategorized'];
      }
      
      return snapshot.docs.map(doc => doc.data().name);
    } catch (error) {
      console.error('Error getting categories:', error);
      // Return defaults on error
      return ['AI', 'Job', 'Health', 'Python', 'StockMarket', 'Technicals', 'Fundamentals', 'Uncategorized'];
    }
  },

  // Add a new category
  async addCategory(userId, categoryName) {
    try {
      const categoriesRef = collection(db, 'users', userId, 'categories');
      await addDoc(categoriesRef, { 
        name: categoryName,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  },

  // Delete a category
  async deleteCategory(userId, categoryName) {
    try {
      const categoriesRef = collection(db, 'users', userId, 'categories');
      const snapshot = await getDocs(categoriesRef);
      const categoryDoc = snapshot.docs.find(doc => doc.data().name === categoryName);
      
      if (categoryDoc) {
        await deleteDoc(categoryDoc.ref);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },

  // ============ TAGS ============
  
  // Get all tags for a user
  async getTags(userId) {
    try {
      const tagsRef = collection(db, 'users', userId, 'tags');
      const snapshot = await getDocs(tagsRef);
      return snapshot.docs.map(doc => doc.data().name);
    } catch (error) {
      console.error('Error getting tags:', error);
      return [];
    }
  },

  // Add a new tag
  async addTag(userId, tagName) {
    try {
      const tagsRef = collection(db, 'users', userId, 'tags');
      await addDoc(tagsRef, { 
        name: tagName,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding tag:', error);
      throw error;
    }
  },

  // Delete a tag
  async deleteTag(userId, tagName) {
    try {
      const tagsRef = collection(db, 'users', userId, 'tags');
      const snapshot = await getDocs(tagsRef);
      const tagDoc = snapshot.docs.find(doc => doc.data().name === tagName);
      
      if (tagDoc) {
        await deleteDoc(tagDoc.ref);
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  },

  // ============ USER PROFILE ============
  
  // Get user profile
  async getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data();
      } else {
        // Create default profile if doesn't exist
        const defaultProfile = {
          createdAt: new Date().toISOString(),
          subscription: {
            plan: 'free',
            status: 'active',
            linkLimit: 20
          }
        };
        await setDoc(userRef, defaultProfile);
        return defaultProfile;
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  },

  // Update user profile
  async updateUserProfile(userId, updates) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // ============ SUBSCRIPTION ============
  
  // Get user subscription status
  async getSubscription(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      return profile.subscription || {
        plan: 'free',
        status: 'active',
        linkLimit: 50
      };
    } catch (error) {
      console.error('Error getting subscription:', error);
      return {
        plan: 'free',
        status: 'active',
        linkLimit: 50
      };
    }
  },

  // Update subscription (after successful payment)
  async updateSubscription(userId, subscriptionData) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        subscription: subscriptionData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  },

  // Check if user can add more links (for free tier limits)
  async canAddLink(userId) {
    try {
      const subscription = await this.getSubscription(userId);
      
      // Premium users have unlimited links
      if (subscription.plan === 'premium' || subscription.plan === 'pro') {
        return { canAdd: true, reason: null };
      }
      
      // Free users have a limit
      const linkCount = await this.getLinkCount(userId);
      const limit = subscription.linkLimit || 50;
      
      if (linkCount >= limit) {
        return { 
          canAdd: false, 
          reason: `You've reached the free tier limit of ${limit} links. Upgrade to Premium for unlimited links.` 
        };
      }
      
      return { canAdd: true, reason: null };
    } catch (error) {
      console.error('Error checking link limit:', error);
      // Allow on error to not block users
      return { canAdd: true, reason: null };
    }
  },

  // ============ STATISTICS ============
  
  // Get user statistics
  async getStatistics(userId) {
    try {
      const links = await this.getLinks(userId);
      const categories = await this.getCategories(userId);
      const tags = await this.getTags(userId);
      
      const stats = {
        totalLinks: links.length,
        readLinks: links.filter(l => l.read).length,
        unreadLinks: links.filter(l => !l.read).length,
        byCategory: {},
        byType: {},
        recentLinks: links.slice(0, 5),
        totalCategories: categories.length,
        totalTags: tags.length
      };
      
      // Count by category
      categories.forEach(cat => {
        stats.byCategory[cat] = links.filter(l => l.category === cat).length;
      });
      
      // Count by type
      const types = ['YouTube', 'Twitter', 'Instagram', 'Substack', 'Google Sheets', 'Webpage'];
      types.forEach(type => {
        stats.byType[type] = links.filter(l => l.type === type).length;
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  },

  // ============ BULK OPERATIONS ============
  
  // Delete all links (for testing or account cleanup)
  async deleteAllLinks(userId) {
    try {
      const links = await this.getLinks(userId);
      const deletePromises = links.map(link => this.deleteLink(userId, link.id));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting all links:', error);
      throw error;
    }
  },

  // Export user data (for GDPR compliance)
  async exportUserData(userId) {
    try {
      const [links, categories, tags, profile] = await Promise.all([
        this.getLinks(userId),
        this.getCategories(userId),
        this.getTags(userId),
        this.getUserProfile(userId)
      ]);
      
      return {
        exportDate: new Date().toISOString(),
        userId,
        profile,
        links,
        categories,
        tags
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  },

async addImage(userId, imageData) {
  try {
    const imagesRef = collection(db, 'users', userId, 'images');
    const docRef = await addDoc(imagesRef, {
      ...imageData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding image:', error);
    throw error;
  }
},

async getImages(userId) {
  try {
    const imagesRef = collection(db, 'users', userId, 'images');
    const q = query(imagesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting images:', error);
    return [];
  }
},

async deleteImage(userId, imageId) {
  try {
    const imageRef = doc(db, 'users', userId, 'images', imageId);
    await deleteDoc(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
},

// Add to firestoreService object:

// ============ NOTES ============

async addNote(userId, noteData) {
  try {
    const notesRef = collection(db, 'users', userId, 'notes');
    const docRef = await addDoc(notesRef, {
      ...noteData,
      wordCount: noteData.content.split(/\s+/).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
},

async getNotes(userId) {
  try {
    const notesRef = collection(db, 'users', userId, 'notes');
    const q = query(notesRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting notes:', error);
    return [];
  }
},

async updateNote(userId, noteId, updates) {
  try {
    const noteRef = doc(db, 'users', userId, 'notes', noteId);
    const wordCount = updates.content ? updates.content.split(/\s+/).length : 0;
    
    await updateDoc(noteRef, {
      ...updates,
      wordCount,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  }
},

async deleteNote(userId, noteId) {
  try {
    const noteRef = doc(db, 'users', userId, 'notes', noteId);
    await deleteDoc(noteRef);
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
 }
};
