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
  Modal,
  Dimensions,
} from 'react-native';
import { useDispatch } from 'react-redux';
import Icon from '@expo/vector-icons/Ionicons';
import { commonAPICall, GETHARITHAANDHRADETAILS } from '../utils/utils';
import moment from 'moment';
import Vanamahotsav from './Home'; // adjust path as needed

const { width, height } = Dimensions.get('window');

const PlantationReportandEntry = () => {
  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('add');
  
  // Image preview states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fetchPlantations = async () => {
    setLoading(true);
    try {
      const response = await commonAPICall(GETHARITHAANDHRADETAILS, {}, 'get', dispatch);
      if (response.status === 200 && response.data.status === 'success') {
        setData(response.data.HarithaAndhraEntryDetails || []);
        console.log("response.data.HarithaAndhraEntryDetails ",response.data.HarithaAndhraEntryDetails );
        
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

  // Handle image press - open preview
  const handleImagePress = (item, index) => {
    // Collect all available images
    const images = [1, 2, 3, 4]
      .map(num => item[`image_${num}`])
      .filter(img => img !== null && img !== undefined && img !== '');
    
    if (images.length === 0) {
      Alert.alert('No Images', 'No images available for this plantation.');
      return;
    }
    
    setSelectedImages(images);
    setSelectedIndex(index < images.length ? index : 0);
    setModalVisible(true);
  };

  // Navigation handlers
  const handleNext = () => {
    if (selectedIndex < selectedImages.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  // Render each plantation card with only the selected fields
  const renderItem = ({ item }) => {
    // Get all available images
    const availableImages = [1, 2, 3, 4]
      .map(num => item[`image_${num}`])
      .filter(img => img !== null && img !== undefined && img !== '');

    // Get in-charge name: if incharge_name is null, show fro_name
    const getInchargeName = () => {
      if (item.incharge_name) {
        return item.incharge_name;
      }
      return `FRO-${item.fro_name}` || 'N/A';
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
<Text style={styles.infoText}>
  {item?.plantation_area?"Area":"Length"} {item.plantation_area ?? item.plantation_length}{" "}
  {item.plantation_area ? "Ha" : "Km"}
</Text>          <Text style={styles.spacer}>|</Text>
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

        {/* Image thumbnails */}
        <View style={styles.imageContainer}>
          {[1, 2, 3, 4].map((each, index) => {
            const imageUri = item[`image_${each}`];
            if (!imageUri) return null;
            
            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleImagePress(item, index)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            );
          })}
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

      {/* Image Preview Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
            activeOpacity={0.7}
          >
            <Icon name="close" size={30} color="#fff" />
          </TouchableOpacity>

          {/* Main image */}
          {selectedImages.length > 0 && selectedIndex < selectedImages.length && (
            <View style={styles.imageContainerModal}>
              <Image
                source={{ uri: selectedImages[selectedIndex] }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Navigation controls */}
          {selectedImages.length > 1 && (
            <View style={styles.navigationContainer}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  selectedIndex === 0 && styles.navButtonDisabled
                ]}
                onPress={handlePrevious}
                disabled={selectedIndex === 0}
                activeOpacity={0.7}
              >
                <Icon name="chevron-back" size={30} color="#fff" />
              </TouchableOpacity>

              <Text style={styles.counterText}>
                {selectedIndex + 1} / {selectedImages.length}
              </Text>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  selectedIndex === selectedImages.length - 1 && styles.navButtonDisabled
                ]}
                onPress={handleNext}
                disabled={selectedIndex === selectedImages.length - 1}
                activeOpacity={0.7}
              >
                <Icon name="chevron-forward" size={30} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Thumbnail strip at bottom */}
          {selectedImages.length > 1 && (
            <View style={styles.thumbnailStrip}>
              <FlatList
                horizontal
                data={selectedImages}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() => setSelectedIndex(index)}
                    style={[
                      styles.thumbnailItem,
                      selectedIndex === index && styles.thumbnailItemActive
                    ]}
                  >
                    <Image
                      source={{ uri: item }}
                      style={styles.thumbnailSmall}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailStripContent}
              />
            </View>
          )}
        </View>
      </Modal>
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
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainerModal: {
    width: width * 0.95,
    height: height * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: width * 0.9,
    paddingHorizontal: 20,
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  counterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  thumbnailStrip: {
    position: 'absolute',
    bottom: 40,
    width: width,
    height: 70,
    justifyContent: 'center',
  },
  thumbnailStripContent: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  thumbnailItem: {
    marginHorizontal: 4,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailItemActive: {
    borderColor: '#fff',
  },
  thumbnailSmall: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
});

export default PlantationReportandEntry;