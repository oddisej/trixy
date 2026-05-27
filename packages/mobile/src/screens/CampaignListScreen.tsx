import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useApi } from '../hooks/useApi';

interface CampaignItem {
  id: string;
  title: string;
  lastPlayedAt: string;
}

export interface CampaignListScreenProps {
  onSelectCampaign: (campaignId: string) => void;
  onNewCampaign: () => void;
  onLogout: () => void;
}

/**
 * Displays a list of saved campaigns with a "New Campaign" button.
 * Requirements: 6.1, 6.2
 */
export function CampaignListScreen({ onSelectCampaign, onNewCampaign, onLogout }: CampaignListScreenProps): React.JSX.Element {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listCampaigns();
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setCampaigns(result.data.campaigns);
      }
    } catch {
      setError('Kampagnen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }

  function renderCampaignItem({ item }: { item: CampaignItem }) {
    return (
      <TouchableOpacity
        style={styles.campaignItem}
        onPress={() => onSelectCampaign(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`Kampagne ${item.title} fortsetzen`}
      >
        <Text style={styles.campaignTitle}>{item.title}</Text>
        <Text style={styles.campaignDate}>
          Zuletzt gespielt: {new Date(item.lastPlayedAt).toLocaleDateString('de-DE')}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Deine Kampagnen</Text>
        <TouchableOpacity onPress={onLogout} accessibilityRole="button" accessibilityLabel="Abmelden">
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a4ae0" />
        </View>
      ) : campaigns.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Noch keine Kampagnen vorhanden.</Text>
          <Text style={styles.emptySubtext}>Starte dein erstes Abenteuer!</Text>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={(item) => item.id}
          renderItem={renderCampaignItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={onNewCampaign}
        accessibilityRole="button"
        accessibilityLabel="Neue Kampagne starten"
      >
        <Text style={styles.buttonText}>+ Neue Kampagne</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  logoutText: {
    color: '#7b7bf0',
    fontSize: 14,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#cccccc',
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#888888',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 16,
  },
  campaignItem: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333355',
  },
  campaignTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  campaignDate: {
    color: '#888888',
    fontSize: 12,
  },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: '#4a4ae0',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
