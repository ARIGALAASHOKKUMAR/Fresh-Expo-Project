import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { commonAPICall, GETHARITHAANDHRADETAILS } from '../utils/utils';
import moment from 'moment';
import Vanamahotsav from './Home';

const PlantationReportandEntry = () => {
  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('view'); // 'view' or 'add'

  const fetchPlantations = async () => {
    setLoading(true);
    try {
      const response = await commonAPICall(GETHARITHAANDHRADETAILS, {}, 'get', dispatch);
      if (response.status === 200 && response.data.status === 'success') {
        setData(response.data.HarithaAndhraEntryDetails || []);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error('Error fetching plantations:', error);
      Alert.alert('Error', 'Failed to load plantation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlantations();
  }, []);

  const handleAddSuccess = () => {
    // After successful addition, switch back to view tab and refresh list
    setActiveTab('view');
    fetchPlantations();
  };

  // Render each plantation card with all available fields
  const renderItem = ({ item, index }) => {
    const firstImage = item.image_1 || item.image_2 || item.image_3 || item.image_4 || null;

    // Helper to format location fields
    const getLocation = () => {
      const parts = [];
      if (item.village_name) parts.push(item.village_name);
      if (item.mandal_name) parts.push(item.mandal_name);
      if (item.dist_name) parts.push(item.dist_name);
      return parts.join(', ') || 'N/A';
    };

    const getCoordinates = () => {
      const lat = item.image_1_latitude || item.image_2_latitude || item.image_3_latitude || item.image_4_latitude;
      const lng = item.image_1_longitude || item.image_2_longitude || item.image_3_longitude || item.image_4_longitude;
      if (lat && lng) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      return 'N/A';
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.speciesName}>{item.species_scientific_name || 'Unknown Species'}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.plantation_type_name || 'Plantation'}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {/* Location & Date */}
          <View style={styles.infoRow}>
            <Icon name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.plantation_date ? moment(item.plantation_date, 'DD-MM-YYYY').format('DD MMM YYYY') : 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{getLocation()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="flag-outline" size={16} color="#666" />
            <Text style={styles.infoText}>Landmark: {item.landmark || 'N/A'}</Text>
          </View>

          {/* Plantation Details */}
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Plants</Text>
              <Text style={styles.detailValue}>{item.no_of_plants || 0}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Area (Ha)</Text>
              <Text style={styles.detailValue}>{item.plantation_area || 0}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Total Extent</Text>
              <Text style={styles.detailValue}>{item.total_extent_area || 0}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Total Plants</Text>
              <Text style={styles.detailValue}>{item.total_plants || 0}</Text>
            </View>
          </View>

          {/* Forest / Beat details */}
          <View style={styles.forestSection}>
            <Text style={styles.sectionTitle}>Forest Details</Text>
            <View style={styles.flexRow}>
              <Text style={styles.flexLabel}>Circle:</Text>
              <Text style={styles.flexValue}>{item.circle_name || 'N/A'}</Text>
            </View>
            <View style={styles.flexRow}>
              <Text style={styles.flexLabel}>Division:</Text>
              <Text style={styles.flexValue}>{item.dfo_name || 'N/A'}</Text>
            </View>
            <View style={styles.flexRow}>
              <Text style={styles.flexLabel}>Range/Beat:</Text>
              <Text style={styles.flexValue}>{item.beat_name || item.fro_name || 'N/A'}</Text>
            </View>
            <View style={styles.flexRow}>
              <Text style={styles.flexLabel}>Section:</Text>
              <Text style={styles.flexValue}>{item.section_name || 'N/A'}</Text>
            </View>
            <View style={styles.flexRow}>
              <Text style={styles.flexLabel}>Compartment:</Text>
              <Text style={styles.flexValue}>{item.compartment_name || 'N/A'}</Text>
            </View>
            <View style={styles.flexRow}>
              <Text style={styles.flexLabel}>Block:</Text>
              <Text style={styles.flexValue}>{item.block_name || 'N/A'}</Text>
            </View>
            <View style={styles.flexRow}>
              <Text style={styles.flexLabel}>Scheme:</Text>
              <Text style={styles.flexValue}>{item.scheme_name || 'N/A'}</Text>
            </View>
            <View style={styles.flexRow}>
              <Text style={styles.flexLabel}>Location Type:</Text>
              <Text style={styles.flexValue}>{item.location_type || 'N/A'}</Text>
            </View>
          </View>

          {/* Coordinates & Images */}
          <View style={styles.coordSection}>
            <Text style={styles.sectionTitle}>Coordinates</Text>
            <Text style={styles.coordText}>{getCoordinates()}</Text>
          </View>

          {firstImage && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: firstImage.replace(/"/g, '') }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Entry ID: {item.haritha_andhra_entry_id}</Text>
            <Text style={styles.metaText}>Source: {item.entry_source || 'N/A'}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'view' && styles.activeTab]}
          onPress={() => setActiveTab('view')}
        >
          <Text style={[styles.tabText, activeTab === 'view' && styles.activeTabText]}>
            🌲 View Plantations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.activeTab]}
          onPress={() => setActiveTab('add')}
        >
          <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>
            🌿 Add Plantation
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      {activeTab === 'view' ? (
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2e7d32" />
              <Text style={styles.loadingText}>Loading plantations...</Text>
            </View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(item) => item.haritha_andhra_entry_id?.toString() || Math.random().toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="leaf-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyText}>No plantations found</Text>
                  <Text style={styles.emptySubText}>Switch to "Add Plantation" to create a new entry.</Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      ) : (
        <ScrollView style={styles.formContainer}>
          <Vanamahotsav onSuccess={handleAddSuccess} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#2e7d32',
    borderBottomColor: '#1b5e20',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#2e7d32',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8f5e9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#e8f5e9',
    borderBottomWidth: 1,
    borderBottomColor: '#c8e6c9',
  },
  speciesName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1b5e20',
    flex: 1,
  },
  typeBadge: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  cardBody: {
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailItem: {
    width: '48%',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: '#888',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b5e20',
  },
  forestSection: {
    marginVertical: 6,
    paddingVertical: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 4,
  },
  flexRow: {
    flexDirection: 'row',
    marginVertical: 1,
  },
  flexLabel: {
    width: 90,
    fontSize: 12,
    color: '#666',
  },
  flexValue: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  coordSection: {
    marginVertical: 4,
  },
  coordText: {
    fontSize: 12,
    color: '#555',
    fontFamily: 'monospace',
  },
  imageContainer: {
    marginTop: 8,
    marginBottom: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 150,
    borderRadius: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  metaText: {
    fontSize: 11,
    color: '#888',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
  },
});

export default PlantationReportandEntry;