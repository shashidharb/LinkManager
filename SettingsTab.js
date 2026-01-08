import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { firestoreService } from './firestoreService';

export default function SettingsTab() {
  const { currentUser } = useAuth();
  const themeContext = useTheme();

  const theme = themeContext?.theme ?? 'blue';
  const isDarkMode = themeContext?.isDarkMode ?? false;
  const colors = themeContext?.colors ?? null;
  const changeTheme = themeContext?.changeTheme ?? (() => {});
  const toggleDarkMode = themeContext?.toggleDarkMode ?? (() => {});
  const allThemes = themeContext?.allThemes ?? [];

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const safeColors = colors || {
    background: '#F3F4F6',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    primary: '#4F46E5',
    border: '#E5E7EB',
    success: '#10B981',
    error: '#EF4444',
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const statsData = await firestoreService.getStatistics(currentUser.uid);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const exportData = await firestoreService.exportUserData(currentUser.uid);
      Alert.alert(
        'Export Complete',
        `Data exported: ${exportData.links.length} links, ${exportData.images?.length || 0} images, ${exportData.notes?.length || 0} notes`
      );
    } catch {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: safeColors.background }]}>
        <ActivityIndicator size="large" color={safeColors.primary} />
        <Text style={[styles.loadingText, { color: safeColors.textSecondary }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: safeColors.background }]}>
      {/* Appearance */}
      <View style={[styles.section, { backgroundColor: safeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: safeColors.text }]}>Appearance</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: safeColors.text }]}>Dark Mode</Text>
            <Text style={[styles.settingDescription, { color: safeColors.textSecondary }]}>
              {isDarkMode ? 'Dark mode is on' : 'Light mode is on'}
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: safeColors.border, true: safeColors.primary }}
            thumbColor={isDarkMode ? safeColors.primary : '#f4f3f4'}
          />
        </View>

        <Text style={[styles.subsectionTitle, { color: safeColors.text }]}>Theme</Text>
        <Text style={[styles.subsectionDescription, { color: safeColors.textSecondary }]}>
          Choose your preferred color theme
        </Text>

        <View style={styles.themeGrid}>
          {allThemes.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.themeCard,
                {
                  backgroundColor: safeColors.background,
                  borderColor: theme === option.id ? safeColors.primary : safeColors.border,
                  borderWidth: theme === option.id ? 3 : 1,
                },
              ]}
              onPress={() => changeTheme(option.id)}
            >
              <View
                style={[
                  styles.themePreview,
                  { backgroundColor: option.colors.primary },
                ]}
              />
              <Text
                style={[
                  styles.themeName,
                  { color: safeColors.text, fontWeight: theme === option.id ? 'bold' : 'normal' },
                ]}
              >
                {option.name}
              </Text>
              {theme === option.id && (
                <Text style={[styles.themeSelected, { color: safeColors.primary }]}>
                  ✓ Selected
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Statistics */}
      <View style={[styles.section, { backgroundColor: safeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: safeColors.text }]}>Statistics</Text>

        <View style={styles.statsGrid}>
          {[
            ['Total Links', stats?.totalLinks],
            ['Read', stats?.readLinks],
            ['Unread', stats?.unreadLinks],
          ].map(([label, value]) => (
            <View key={label} style={[styles.statCard, { backgroundColor: safeColors.background }]}>
              <Text style={[styles.statValue, { color: safeColors.primary }]}>{value || 0}</Text>
              <Text style={[styles.statLabel, { color: safeColors.textSecondary }]}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.subsectionTitle, { color: safeColors.text }]}>By Category</Text>
        <View style={styles.categoryStats}>
          {stats?.byCategory &&
            Object.entries(stats.byCategory).map(([category, count]) => (
              <View
                key={category}
                style={[styles.categoryRow, { borderBottomColor: safeColors.border }]}
              >
                <Text style={[styles.categoryName, { color: safeColors.text }]}>{category}</Text>
                <Text style={[styles.categoryCount, { color: safeColors.primary }]}>{count}</Text>
              </View>
            ))}
        </View>

        <Text style={[styles.subsectionTitle, { color: safeColors.text }]}>By Type</Text>
        <View style={styles.categoryStats}>
          {stats?.byType &&
            Object.entries(stats.byType).map(
              ([type, count]) =>
                count > 0 && (
                  <View
                    key={type}
                    style={[styles.categoryRow, { borderBottomColor: safeColors.border }]}
                  >
                    <Text style={[styles.categoryName, { color: safeColors.text }]}>{type}</Text>
                    <Text style={[styles.categoryCount, { color: safeColors.primary }]}>{count}</Text>
                  </View>
                )
            )}
        </View>
      </View>

      {/* Account */}
      <View style={[styles.section, { backgroundColor: safeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: safeColors.text }]}>Account</Text>
        <Text style={[styles.accountValue, { color: safeColors.text }]}>{currentUser.email}</Text>
        <Text
          style={[styles.accountValue, { color: safeColors.text }]}
          numberOfLines={1}
        >
          {currentUser.uid}
        </Text>
      </View>

      {/* Data */}
      <View style={[styles.section, { backgroundColor: safeColors.surface }]}>
        <Text style={[styles.sectionTitle, { color: safeColors.text }]}>Data Management</Text>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: safeColors.primary }]}
          onPress={handleExportData}
        >
          <Text style={styles.actionButtonText}>Export My Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: safeColors.textSecondary }]}>
          Made with ❤️
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10 },

  section: { margin: 16, padding: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },

  settingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '600' },
  settingDescription: { fontSize: 14 },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 14 },

  subsectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  subsectionDescription: { fontSize: 14, marginBottom: 12 },

  categoryStats: { marginBottom: 16 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  categoryName: { fontSize: 14 },
  categoryCount: { fontSize: 14, fontWeight: '600' },

  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeCard: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 12, alignItems: 'center' },
  themePreview: { width: 60, height: 60, borderRadius: 30, marginBottom: 12 },
  themeName: { fontSize: 14 },
  themeSelected: { fontSize: 12 },

  actionButton: { padding: 16, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  accountValue: { fontSize: 16, marginBottom: 8 },

  footer: { padding: 32, alignItems: 'center' },
  footerText: { fontSize: 14 },
});

