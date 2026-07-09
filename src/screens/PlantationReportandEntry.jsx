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
import Icon from '@expo/vector-icons/Ionicons';
import { commonAPICall, GETHARITHAANDHRADETAILS } from '../utils/utils';
import moment from 'moment';
import Vanamahotsav from './Home'; // adjust path as needed

const PlantationReportandEntry = () => {
  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('add');

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
  }, [activeTab]);

  const handleAddSuccess = () => {
    setActiveTab('view');
    fetchPlantations();
  };

  // Render each plantation card with only the selected fields
  const renderItem = ({ item }) => {
    // Helper to get a small thumbnail (first available image)
    const firstImage = item.image_1 || item.image_2 || item.image_3 || item.image_4 || null;

    // Get in-charge name: if incharge_name is null, show fro_name
    const getInchargeName = () => {
      if (item.incharge_name) {
        return item.incharge_name;
      }
      return `FRO-${item.fro_name} `|| 'N/A';
    };

    return (
      <View style={styles.card}>
        {/* Row 1: Species / Plantation Type */}
        <View style={styles.cardRow}>
          <Text style={styles.speciesName}>{item.scheme_name || 'Unknown'}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.plantation_type_name || 'Plantation'}</Text>
          </View>
        </View>

        {/* Row 2: Plantation Date */}
        <View style={styles.cardRow}>
          <Icon name="calendar-outline" size={16} color="#2e7d32" />
          <Text style={styles.infoText}>
            {item.plantation_date ? moment(item.plantation_date, 'DD-MM-YYYY').format('DD MMM YYYY') : 'N/A'}
          </Text>
        </View>

        {/* Row 3: District */}
        <View style={styles.cardRow}>
          <Icon name="location-outline" size={16} color="#2e7d32" />
          <Text style={styles.infoText}>{item.dist_name || 'N/A'}</Text>
        </View>

        {/* Row 4: Scheme & Forest Type */}
        <View style={styles.cardRow}>
          <Icon name="leaf-outline" size={16} color="#2e7d32" />
          <Text style={styles.infoText}>{item.location_type || 'N/A'}</Text>
        </View>

        {/* Row 5: Area & Total Plants */}
        <View style={styles.cardRow}>
          <Icon name="resize-outline" size={16} color="#2e7d32" />
          <Text style={styles.infoText}>Area: {item.plantation_area || 0} Ha</Text>
          <Text style={styles.spacer}>|</Text>
          <Icon name="stats-chart-outline" size={16} color="#2e7d32" />
          <Text style={styles.infoText}>Plants: {item.total_no_of_plants || item.no_of_plants || 0}</Text>
        </View>

        {/* Row 6: In-charge / FRO Name */}
        <View style={styles.cardRow}>
          <Icon name="person-outline" size={16} color="#2e7d32" />
          <Text style={styles.infoText}>
            Incharge Officer: {getInchargeName()}
          </Text>
        </View>

        {/* Optional thumbnail (small) */}
        <View style={{display:"flex",flexDirection:"row",gap:"40px"}}>
          {[1,2,3,4].map((each,index)=>(
 <Image
       source={{ uri: item[`image_${index + 1}`] }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          ))}
        
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Header */}
      <View style={styles.tabContainer}>
         <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.activeTab]}
          onPress={() => setActiveTab('add')}
        >
          <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>
            🌱 Add Plantation
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'view' && styles.activeTab]}
          onPress={() => setActiveTab('view')}
        >
          <Text style={[styles.tabText, activeTab === 'view' && styles.activeTabText]}>
           🌳 My Plantations
          </Text>
        </TouchableOpacity>
       
      </View>

      {/* Content */}
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
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#e8f5e9',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
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
    marginLeft: 6,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 6,
  },
  spacer: {
    marginHorizontal: 6,
    color: '#ccc',
  },
  froLabel: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
  thumbnail: {
    width: '25%',
    height: 60,
    borderRadius: 6,
    marginTop: 8,
    marginRight:2
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