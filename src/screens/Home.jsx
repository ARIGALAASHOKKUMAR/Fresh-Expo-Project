import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import moment from 'moment';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import {
  commonAPICall,
  CONTEXT_HEADING,
  CREATENEWHARITHANDHRA,
  SCHEMES,
  VanamahotsavamEntry,
  VANASECTIONS,
} from '../utils/utils';
import ImageBucketRN from '../utils/ImageBucketRN';
import { GetSpecies, GetNewMandals, new_dist, NewVillages, GetBeat, GetCompartment, GetBlock } from '../utils/CommonFunctions';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
const Vanamahotsav = () => {
  const dispatch = useDispatch();
  const state = useSelector((s) => s.LoginReducer);
  const { districts, roleId } = state;
  
  const [speciesList, setSpeciesList] = useState([]);
  const [section, setSection] = useState([]);
  const [scheme, setScheme] = useState([]);
  const [mandal, setMandal] = useState([]);
  const [village, setVillage] = useState([]);
  const [districtCode, setDistrictCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [beat, setBeat] = useState([]);
  const [compartment, setCompartment] = useState([]);
  const [block, setBlock] = useState([]);

  // Determine location type based on roleId
  const locationType = roleId === 6 ? 'forest' : 'nonforest';

  // Validation Schema
  const validationSchema = Yup.object().shape({
    section: Yup.string().when('locationType', {
      is: (val) => val === 'forest',
      then: () => Yup.string().required('Section is required'),
      otherwise: () => Yup.string().notRequired(),
    }),
    beat: Yup.string().when('locationType', {
      is: (val) => val === 'forest',
      then: () => Yup.string().required('Beat is required'),
      otherwise: () => Yup.string().notRequired(),
    }),
    compartment: Yup.string().when('locationType', {
      is: (val) => val === 'forest',
      then: () => Yup.string().required('Compartment is required'),
      otherwise: () => Yup.string().notRequired(),
    }),
    block: Yup.string().when('locationType', {
      is: (val) => val === 'forest',
      then: () => Yup.string().required('Block is required'),
      otherwise: () => Yup.string().notRequired(),
    }),
    distCode: Yup.string().required('District is required'),
    mandalCode: Yup.string().required('Mandal is required'),
    villageCode: Yup.string().required('Village is required'),
    plantationDate: Yup.string().required('Plantation date is required'),
    landmark: Yup.string().when('locationType', {
      is: (val) => val === 'forest',
      then: () => Yup.string().notRequired(),
      otherwise: () => Yup.string().required('Landmark is required'),
    }),
    area: Yup.string().when('locationType', {
      is: (val) => val === 'forest',
      then: () => Yup.string().required('Area is required'),
      otherwise: () => Yup.string().notRequired(),
    }),
    scheme: Yup.string().when('locationType', {
      is: (val) => val === 'forest',
      then: () => Yup.string().required('Scheme is required'),
      otherwise: () => Yup.string().notRequired(),
    }),
    landType: Yup.string().when('locationType', {
      is: (val) => val === 'nonforest',
      then: () => Yup.string().required('Land type is required'),
      otherwise: () => Yup.string().notRequired(),
    }),
    inchargeName: Yup.string().when('locationType', {
      is: (val) => val === 'nonforest',
      then: () => Yup.string().required('Incharge name is required'),
      otherwise: () => Yup.string().notRequired(),
    }),
    inchargeDesignation: Yup.string().when('locationType', {
      is: (val) => val === 'nonforest',
      then: () => Yup.string().required('Designation is required'),
      otherwise: () => Yup.string().notRequired(),
    }),
    inchargeMobile: Yup.string().when('locationType', {
      is: (val) => val === 'nonforest',
      then: () => Yup.string()
        .required('Mobile number is required')
        .matches(/^[0-9]{10}$/, 'Must be exactly 10 digits'),
      otherwise: () => Yup.string().notRequired(),
    }),
    plantationType: Yup.string().required('Plantation type is required'),
    othersPlantationType: Yup.string().when('plantationType', {
      is: (val) => String(val) === '5',
      then: (schema) => schema.required('Other plantation type is required'),
      otherwise: (schema) => schema.notRequired(),
    }),
    speciesDetails: Yup.array().of(
      Yup.object().shape({
        species: Yup.string().required('Species is required'),
        noOfPlants: Yup.number()
          .typeError('Must be a number')
          .positive('Must be positive')
          .integer('Must be a whole number')
          .required('Number of plants is required'),
      })
    ).min(1, 'At least one species is required'),
    imageDetails: Yup.array().of(
      Yup.object().shape({
        imagePath: Yup.string().required('Image is required'),
      })
    ).min(4, 'Minimum 4 images required').max(15, 'Maximum 15 images allowed'),
  });

  // Get Sections
  const GetSections = async () => {
    try {
      const response = await commonAPICall(VANASECTIONS, {}, 'get', dispatch);
      if (response.status === 200) {
        if(typeof(response.data.UserSectionData) === "string"){
            setSection([])
        } else {
          setSection(response.data.UserSectionData);
        }
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  // Get Schemes
  const GetSchemes = async () => {
    try {
      const response = await commonAPICall(SCHEMES, {}, 'get', dispatch);
      if (response.status === 200) {
        setScheme(response.data.plantation_schemes);
      }
    } catch (error) {
      console.error('Error fetching schemes:', error);
    }
  };

  useEffect(() => {
    GetSpecies(setSpeciesList, dispatch);
    GetSections();
    GetSchemes();
  }, []);

  // Initialize with one species and 4 images
  const getInitialSpecies = () => {
    return [{
      species: '',
      noOfPlants: '',
    }];
  };

  const HandleSubmit = async (values) => {
    try {
      setLoading(true);
      
      // Transform the payload to match the required format
      const payload = {
        distCode: Number(values.distCode),
        mandalCode: Number(values.mandalCode),
        villageCode: Number(values.villageCode),
        plantationDate: values.plantationDate,
        locationType: values.locationType.toUpperCase(),
        plantationType: Number(values.plantationType),
        speciesDetails: values.speciesDetails.map(species => ({
          species: Number(species.species),
          noOfPlants: Number(species.noOfPlants),
        }))
      };

      // Add forest specific fields
      if (values.locationType === 'forest') {
        payload.section = values.section ? Number(values.section) : null;
        payload.beat = values.beat ? Number(values.beat) : null;
        payload.compartment = values.compartment ? Number(values.compartment) : null;
        payload.block = values.block ? Number(values.block) : null;
        payload.scheme = values.scheme ? Number(values.scheme) : null;
        payload.area = values.area ? Number(values.area) : null;
        if (values.landmark) payload.landmark = values.landmark;
      } else {
        // Non-forest specific fields
        payload.landType = values.landType;
        payload.inchargeName = values.inchargeName;
        payload.inchargeDesignation = values.inchargeDesignation;
        payload.inchargeMobile = values.inchargeMobile;
        payload.landmark = values.landmark;
      }

      // Add others plantation type if selected
      if (values.plantationType === '5' && values.othersPlantationType) {
        payload.othersPlantationType = values.othersPlantationType;
      }

      // Add image details (at top level, not in field array)
      payload.imageDetails = values.imageDetails.map(img => ({
        imagePath: img.imagePath,
        latitude: Number(img.latitude) || null,
        longitude: Number(img.longitude) || null,
      }));

      // Remove null values
      Object.keys(payload).forEach(key => {
        if (payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      });

      console.log("payload",payload);
      

      const response = await commonAPICall(CREATENEWHARITHANDHRA, payload, 'post', dispatch);
      if (response.status === 200) {
        formik.resetForm();
        Alert.alert('Success', 'Entry submitted successfully');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit entry');
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      roleId: roleId,
      locationType: locationType,
      section: '',
      beat: '',
      compartment: '',
      block: '',
      distCode: '',
      mandalCode: '',
      villageCode: '',
      plantationDate: moment().format('YYYY-MM-DD'),
      landmark: '',
      area: '',
      scheme: '',
      plantationType: '',
      othersPlantationType: '',
      landType: '',
      inchargeName: '',
      inchargeDesignation: '',
      inchargeMobile: '',
      speciesDetails: getInitialSpecies(),
      imageDetails: [
        {
          imagePath: '',
          latitude: null,
          longitude: null,
          locationName: '',
        },
        {
          imagePath: '',
          latitude: null,
          longitude: null,
          locationName: '',
        },
        {
          imagePath: '',
          latitude: null,
          longitude: null,
          locationName: '',
        },
        {
          imagePath: '',
          latitude: null,
          longitude: null,
          locationName: '',
        },
        
      ],
    },
    validationSchema: validationSchema,
    onSubmit: HandleSubmit,
  });

  // Handle Date Change
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || tempDate;
    setShowDatePicker(Platform.OS === 'ios');
    setTempDate(currentDate);
    const formattedDate = currentDate.toISOString().split('T')[0];
    formik.setFieldValue('plantationDate', formattedDate);
  };

  // Get location with latitude, longitude, and address
  const getLocationWithDetails = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Reverse geocode to get address
      let locationName = '';
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (geocode.length > 0) {
          const address = geocode[0];
          const parts = [];
          if (address.name) parts.push(address.name);
          if (address.street) parts.push(address.street);
          if (address.district) parts.push(address.district);
          if (address.city) parts.push(address.city);
          if (address.region) parts.push(address.region);
          if (address.country) parts.push(address.country);
          locationName = parts.join(', ');
        }
      } catch (geocodeError) {
        console.log('Geocoding error:', geocodeError);
        locationName = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        locationName: locationName,
      };
    } catch (error) {
      console.log('Error getting location:', error);
      Alert.alert('Error', 'Failed to get location');
      return null;
    }
  };

  // Add Species Field
  const addSpeciesField = () => {
    const currentSpecies = formik.values.speciesDetails || [];
    const newSpecies = {
      species: '',
      noOfPlants: '',
    };
    formik.setFieldValue('speciesDetails', [...currentSpecies, newSpecies]);
  };

  // Remove Species Field
  const removeSpeciesField = (index) => {
    const currentSpecies = formik.values.speciesDetails || [];
    if (currentSpecies.length <= 1) {
      Alert.alert('Cannot Remove', 'Minimum 1 species required');
      return;
    }
    const newSpecies = currentSpecies.filter((_, i) => i !== index);
    formik.setFieldValue('speciesDetails', newSpecies);
  };

  // Add Image Field
  const addImageField = () => {
    const currentImages = formik.values.imageDetails || [];
    
    if (currentImages.length >= 15) {
      Alert.alert('Limit Reached', 'Maximum 15 images allowed');
      return;
    }
    
    const newImages = [...currentImages, { 
      imagePath: '', 
      latitude: null, 
      longitude: null,
      locationName: '' 
    }];
    formik.setFieldValue('imageDetails', newImages);
  };

  // Remove Image Field
  const removeImageField = (index) => {
    const currentImages = formik.values.imageDetails || [];
    
    if (currentImages.length <= 4) {
      Alert.alert('Cannot Remove', 'Minimum 4 images required');
      return;
    }
    
    const newImages = currentImages.filter((_, i) => i !== index);
    formik.setFieldValue('imageDetails', newImages);
  };

  // Handle image capture with location
  const handleImageCapture = async (index) => {
    const path = 'APFD/VANAMAHOTSAV/';
    const imageFieldName = `imageDetails[${index}].imagePath`;
    const latitudeFieldName = `imageDetails[${index}].latitude`;
    const longitudeFieldName = `imageDetails[${index}].longitude`;
    const locationNameFieldName = `imageDetails[${index}].locationName`;
    
    // Capture image
    await ImageBucketRN(
      formik,
      path,
      imageFieldName,
      20971520,
      'camera',
      dispatch
    );
    
    // Get location with details after image capture
    const locationData = await getLocationWithDetails();
    if (locationData) {
      formik.setFieldValue(latitudeFieldName, locationData.latitude);
      formik.setFieldValue(longitudeFieldName, locationData.longitude);
      formik.setFieldValue(locationNameFieldName, locationData.locationName);
    }
  };

   const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth',"Sixth"];


  // Render Images
  const renderImages = () => {
    const images = formik.values.imageDetails || [];
    
    return (
      <View>
        <View style={styles.imageHeaderContainer}>
          <Text style={styles.subLabel}>
            Upload Images (Min: 4,Max: 6) <Text style={styles.star}>*</Text>
          </Text>
        </View>

        {images.map((item, index) => {
          const imageFieldName = `imageDetails[${index}].imagePath`;
          const latitudeFieldName = `imageDetails[${index}].latitude`;
          const longitudeFieldName = `imageDetails[${index}].longitude`;
          const locationNameFieldName = `imageDetails[${index}].locationName`;
          
          const imageError = formik.touched.imageDetails?.[index]?.imagePath && 
                           formik.errors.imageDetails?.[index]?.imagePath;
          const latError = formik.touched.imageDetails?.[index]?.latitude && 
                          formik.errors.imageDetails?.[index]?.latitude;
          const lngError = formik.touched.imageDetails?.[index]?.longitude && 
                          formik.errors.imageDetails?.[index]?.longitude;
          
          return (
            <View key={index} style={styles.imageFieldContainer}>
              
              <View
  style={{
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  }}
>
  <TouchableOpacity
    style={[
      styles.uploadButton,
      imageError && styles.inputError,
      { flex: 1 } // Take remaining width
    ]}
    onPress={() => handleImageCapture(index)}
  >

<Text style={styles.uploadButtonText}>
  📷 {ordinals[index]} Corner Image
</Text>
  </TouchableOpacity>

  {images.length > 4 && (
  <TouchableOpacity
    onPress={() => removeImageField(index)}
    style={{
      marginLeft: 5,
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: "#FF3B30",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#FF3B30",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    }}
  >
    <Icon name="trash-can-outline" size={18} color="white" />
  </TouchableOpacity>
)}
</View>
              
              {imageError && (
                <Text style={styles.errorText}>{imageError}</Text>
              )}
              
              {item.imagePath && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: item.imagePath }} style={styles.previewImage} />
                  
                  <View style={styles.locationContainer}>
                    <View style={styles.locationBox}>
                      <Text style={styles.locationEmoji}>📍</Text>
                      <View style={styles.locationTextContainer}>
                        <Text style={styles.locationText} numberOfLines={3}>
                          {item.locationName || 'Fetching location...'}
                        </Text>
                        <Text style={styles.coordinatesText}>
                          Lat: {item.latitude?.toFixed(6) || 'N/A'}, Lng: {item.longitude?.toFixed(6) || 'N/A'}
                        </Text>
                      </View>
                    </View>
                    {(latError || lngError) && (
                      <Text style={styles.errorText}>
                        {latError || lngError}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
        
        <View style={{display:"flex", justifyContent:"flex-end"}}>
          <TouchableOpacity
            style={styles.addSpeciesButton}
            onPress={addImageField}
          >
           <Text style={styles.addSpeciesButtonText}>➕ Add Another Image</Text>
          </TouchableOpacity>
        </View>

       
      </View>
    );
  };

  // Render Species Details
  const renderSpeciesDetails = () => {
    const speciesDetails = formik.values.speciesDetails || [];
    
    return (
      <View>
        {speciesDetails.map((species, speciesIndex) => {
          const speciesErrors = formik.errors.speciesDetails?.[speciesIndex] || {};
          const speciesTouched = formik.touched.speciesDetails?.[speciesIndex] || {};
          
          return (
            <View key={speciesIndex} style={styles.speciesCard}>
              <View style={styles.speciesCardHeader}>
                <Text style={styles.speciesCardTitle}>Species {speciesIndex + 1}</Text>
                {speciesDetails.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeSpeciesButton}
                    onPress={() => removeSpeciesField(speciesIndex)}
                  >
                    <Text style={styles.removeIcon}>❌</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Species */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Species <Text style={styles.star}>*</Text></Text>
                <View style={[
                  styles.pickerContainer,
                  speciesTouched.species && speciesErrors.species && styles.inputError
                ]}>
                  <Picker
                    selectedValue={species.species}
                    onValueChange={(itemValue) => {
                      const updatedSpecies = [...speciesDetails];
                      updatedSpecies[speciesIndex].species = itemValue;
                      formik.setFieldValue('speciesDetails', updatedSpecies);
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="---select---" value="" />
                    {speciesList?.map((d) => (
                      <Picker.Item key={d.id} label={d.species_scientific_name} value={String(d.id)} />
                    ))}
                    <Picker.Item label="Others" value="999" />
                  </Picker>
                </View>
                {speciesTouched.species && speciesErrors.species && (
                  <Text style={styles.errorText}>{speciesErrors.species}</Text>
                )}
                {species.species === '999' && (
                  <TextInput
                    style={[styles.input, styles.mt1]}
                    placeholder="Enter Other Species"
                    value={species.otherSpecies}
                    onChangeText={(text) => {
                      const updatedSpecies = [...speciesDetails];
                      updatedSpecies[speciesIndex].otherSpecies = text;
                      formik.setFieldValue('speciesDetails', updatedSpecies);
                    }}
                  />
                )}
              </View>

              {/* No of Plants */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>No.of Plants Planted <Text style={styles.star}>*</Text></Text>
                <TextInput
                  style={[
                    styles.input,
                    speciesTouched.noOfPlants && speciesErrors.noOfPlants && styles.inputError,
                  ]}
                  placeholder="Enter number of plants"
                  keyboardType="numeric"
                  value={String(species.noOfPlants || '')}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    const updatedSpecies = [...speciesDetails];
                    updatedSpecies[speciesIndex].noOfPlants = numericText;
                    formik.setFieldValue('speciesDetails', updatedSpecies);
                  }}
                  onBlur={() => {
                    formik.setFieldTouched(`speciesDetails[${speciesIndex}].noOfPlants`, true);
                  }}
                />
                {speciesTouched.noOfPlants && speciesErrors.noOfPlants && (
                  <Text style={styles.errorText}>{speciesErrors.noOfPlants}</Text>
                )}
              </View>
            </View>
          );
        })}
        
        <TouchableOpacity
          style={styles.addSpeciesButton}
          onPress={addSpeciesField}
        >
          <Text style={styles.addSpeciesButtonText}>➕ Add Another Species</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            🌿 Mission Haritha Andhra
          </Text>
        </View>
         
        <View style={styles.cardBody}>
          <View style={styles.panelBody}>
            {/* Location Type Display */}
            <View style={styles.locationTypeContainer}>
              <Text style={styles.locationEmoji}>
                {locationType === 'forest' ? '🌲' : '🏠'}
              </Text>
              <Text style={styles.locationTypeLabel}>Location Type:</Text>
              <Text style={styles.locationTypeValue}>
                {locationType === 'forest' ? 'Forest' : 'Non-Forest(Outside Forest)'}
              </Text>
            </View>

            {/* Forest Fields */}
            {locationType === 'forest' && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Section <Text style={styles.star}>*</Text></Text>
                  <View style={[
                    styles.pickerContainer,
                    formik.touched.section && formik.errors.section && styles.inputError
                  ]}>
                    <Picker
                      selectedValue={formik.values.section}
                      onValueChange={(itemValue) => {
                        formik.setFieldValue('section', itemValue);
                        GetBeat(itemValue, setBeat, setCompartment, setBlock, dispatch);
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="---select---" value="" />
                      {section?.map((s) => (
                        <Picker.Item key={s.id} label={s.section} value={String(s.id)} />
                      ))}
                    </Picker>
                  </View>
                  {formik.touched.section && formik.errors.section && (
                    <Text style={styles.errorText}>{formik.errors.section}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Beat <Text style={styles.star}>*</Text></Text>
                  <View style={[
                    styles.pickerContainer,
                    formik.touched.beat && formik.errors.beat && styles.inputError
                  ]}>
                    <Picker
                      selectedValue={formik.values.beat}
                      onValueChange={(itemValue) => {
                        formik.setFieldValue('beat', itemValue);
                        GetCompartment(itemValue, setCompartment, setBlock, dispatch);
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="---select---" value="" />
                      {beat?.map((s) => (
                        <Picker.Item key={s.id} label={s.beat} value={String(s.id)} />
                      ))}
                    </Picker>
                  </View>
                  {formik.touched.beat && formik.errors.beat && (
                    <Text style={styles.errorText}>{formik.errors.beat}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Compartment <Text style={styles.star}>*</Text></Text>
                  <View style={[
                    styles.pickerContainer,
                    formik.touched.compartment && formik.errors.compartment && styles.inputError
                  ]}>
                    <Picker
                      selectedValue={formik.values.compartment}
                      onValueChange={(itemValue) => {
                        formik.setFieldValue('compartment', itemValue);
                        GetBlock(itemValue, setBlock, dispatch, formik.values.beat);
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="---select---" value="" />
                      {compartment?.map((s) => (
                        <Picker.Item key={s.id} label={s.compartment} value={String(s.id)} />
                      ))}
                    </Picker>
                  </View>
                  {formik.touched.compartment && formik.errors.compartment && (
                    <Text style={styles.errorText}>{formik.errors.compartment}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Block <Text style={styles.star}>*</Text></Text>
                  <View style={[
                    styles.pickerContainer,
                    formik.touched.block && formik.errors.block && styles.inputError
                  ]}>
                    <Picker
                      selectedValue={formik.values.block}
                      onValueChange={(itemValue) => {
                        formik.setFieldValue('block', itemValue);
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="---select---" value="" />
                      {block?.map((s) => (
                        <Picker.Item key={s.id} label={s.forest_block} value={String(s.id)} />
                      ))}
                    </Picker>
                  </View>
                  {formik.touched.block && formik.errors.block && (
                    <Text style={styles.errorText}>{formik.errors.block}</Text>
                  )}
                </View>

                {/* Area - Forest only */}
              </>
            )}

            {/* District */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>District <Text style={styles.star}>*</Text></Text>
              <View style={[
                styles.pickerContainer,
                formik.touched.distCode && formik.errors.distCode && styles.inputError
              ]}>
                <Picker
                  selectedValue={formik.values.distCode}
                  onValueChange={(itemValue) => {
                    formik.setFieldValue('distCode', itemValue);
                    GetNewMandals(itemValue, setMandal, setVillage, dispatch);
                    formik.setFieldValue('mandalCode', '');
                    formik.setFieldValue('villageCode', '');
                    setDistrictCode(itemValue);
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="---Select---" value="" />
                  {new_dist.map((dist) => (
                    <Picker.Item key={dist.dist_code} label={dist.dist_name} value={String(dist.dist_code)} />
                  ))}
                </Picker>
              </View>
              {formik.touched.distCode && formik.errors.distCode && (
                <Text style={styles.errorText}>{formik.errors.distCode}</Text>
              )}
            </View>

            {/* Mandal */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Mandal <Text style={styles.star}>*</Text></Text>
              <View style={[
                styles.pickerContainer,
                formik.touched.mandalCode && formik.errors.mandalCode && styles.inputError
              ]}>
                <Picker
                  selectedValue={formik.values.mandalCode}
                  onValueChange={(itemValue) => {
                    formik.setFieldValue('mandalCode', itemValue);
                    NewVillages(itemValue, setVillage, dispatch, districtCode);
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="---Select---" value="" />
                  {mandal.map((m) => (
                    <Picker.Item key={m.mandal_code} label={m.mandal_name} value={String(m.mandal_code)} />
                  ))}
                </Picker>
              </View>
              {formik.touched.mandalCode && formik.errors.mandalCode && (
                <Text style={styles.errorText}>{formik.errors.mandalCode}</Text>
              )}
            </View>

            {/* Village */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Village Limit <Text style={styles.star}>*</Text></Text>
              <View style={[
                styles.pickerContainer,
                formik.touched.villageCode && formik.errors.villageCode && styles.inputError
              ]}>
                <Picker
                  selectedValue={formik.values.villageCode}
                  onValueChange={(itemValue) => {
                    formik.setFieldValue('villageCode', itemValue);
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="---Select---" value="" />
                  {village.map((v) => (
                    <Picker.Item key={v.village_code} label={v.village_name} value={String(v.village_code)} />
                  ))}
                </Picker>
              </View>
              {formik.touched.villageCode && formik.errors.villageCode && (
                <Text style={styles.errorText}>{formik.errors.villageCode}</Text>
              )}
            </View>

            {/* Plantation Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Date of Plantation <Text style={styles.star}>*</Text></Text>
              <TouchableOpacity
                style={[
                  styles.dateInputWrapper,
                  formik.touched.plantationDate && formik.errors.plantationDate && styles.inputError
                ]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dateInputText,
                  !formik.values.plantationDate && styles.datePlaceholder
                ]}>
                  {formik.values.plantationDate || 'YYYY-MM-DD'}
                </Text>
                <Text style={styles.calendarEmoji}>📅</Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                      minimumDate={new Date(new Date().getFullYear(), 0, 1)} // Jan 1 of current year
                  maximumDate={new Date()}
                />
              )}
              
              {formik.touched.plantationDate && formik.errors.plantationDate && (
                <Text style={styles.errorText}>{formik.errors.plantationDate}</Text>
              )}
            </View>

            {/* Plantation Type - Top level (Voluntary) */}
            <View style={styles.formGroup}>
  <Text style={styles.label}>Plantation Type <Text style={styles.star}>*</Text></Text>
  <View style={[
    styles.pickerContainer,
    formik.touched.plantationType && formik.errors.plantationType && styles.inputError
  ]}>
    <Picker
      selectedValue={formik.values.plantationType}
      onValueChange={(itemValue) => {
        formik.setFieldValue('plantationType', itemValue);
        formik.setFieldValue('othersPlantationType', '');
        // Reset area value when plantation type changes
        formik.setFieldValue('area', '');
      }}
      style={styles.picker}
    >
      <Picker.Item label="--Select--" value="" />
      <Picker.Item label="Block Plantation" value="1" />
      <Picker.Item label="Avenue Plantation" value="2" />
      <Picker.Item label="Bund / Canal Plantation" value="3" />
      <Picker.Item label="Agro Forestry / Horticulture" value="4" />
      <Picker.Item label="Institutional" value="5" />
      <Picker.Item label="Others" value="5" />
    </Picker>
  </View>
  {formik.touched.plantationType && formik.errors.plantationType && (
    <Text style={styles.errorText}>{formik.errors.plantationType}</Text>
  )}
</View>

{/* Area field - conditionally show based on plantation type and location */}
{(locationType === 'forest' || 
  ['2', '3'].includes(formik.values.plantationType)) && (
  <View style={styles.formGroup}>
    <Text style={styles.label}>
      {formik.values.plantationType === '2' || formik.values.plantationType === '3' 
        ? 'Length (Km)' 
        : 'Area (Ha)'} 
      <Text style={styles.star}>*</Text>
    </Text>
    <TextInput
      style={[
        styles.input,
        formik.touched.area && formik.errors.area && styles.inputError,
      ]}
      placeholder={
        formik.values.plantationType === '2' || formik.values.plantationType === '3'
          ? "Enter length in kilometers"
          : "Enter area in hectares"
      }
      keyboardType="numeric"
      value={formik.values.area}
      onChangeText={formik.handleChange('area')}
      onBlur={formik.handleBlur('area')}
    />
    {formik.touched.area && formik.errors.area && (
      <Text style={styles.errorText}>{formik.errors.area}</Text>
    )}
  </View>
)}
            {/* Others Plantation Type */}
            {formik.values.plantationType === '5' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Other Plantation Type <Text style={styles.star}>*</Text></Text>
                <TextInput
                  style={[
                    styles.input,
                    formik.touched.othersPlantationType && formik.errors.othersPlantationType && styles.inputError,
                  ]}
                  placeholder="Enter other plantation type"
                  value={formik.values.othersPlantationType}
                  onChangeText={formik.handleChange('othersPlantationType')}
                  onBlur={formik.handleBlur('othersPlantationType')}
                />
                {formik.touched.othersPlantationType && formik.errors.othersPlantationType && (
                  <Text style={styles.errorText}>{formik.errors.othersPlantationType}</Text>
                )}
              </View>
            )}

            {/* Landmark - Not mandatory for forest */}
            {locationType !== 'forest' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Location / Landmark <Text style={styles.star}>*</Text></Text>
                <TextInput
                  style={[
                    styles.input,
                    formik.touched.landmark && formik.errors.landmark && styles.inputError,
                  ]}
                  placeholder="Enter Location / Landmark"
                  value={formik.values.landmark}
                  onChangeText={formik.handleChange('landmark')}
                  onBlur={formik.handleBlur('landmark')}
                />
                {formik.touched.landmark && formik.errors.landmark && (
                  <Text style={styles.errorText}>{formik.errors.landmark}</Text>
                )}
              </View>
            )}

            {/* Non-Forest specific fields */}
            {locationType === 'nonforest' && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Land Type <Text style={styles.star}>*</Text></Text>
                  <View style={[
                    styles.pickerContainer,
                    formik.touched.landType && formik.errors.landType && styles.inputError
                  ]}>
                    <Picker
                      selectedValue={formik.values.landType}
                      onValueChange={(itemValue) => {
                        formik.setFieldValue('landType', itemValue);
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="--Select--" value="" />
                      <Picker.Item label="Patta" value="patta" />
                      <Picker.Item label="Govt/Poramboku" value="govt_poramboku" />
                    </Picker>
                  </View>
                  {formik.touched.landType && formik.errors.landType && (
                    <Text style={styles.errorText}>{formik.errors.landType}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Incharge Name <Text style={styles.star}>*</Text></Text>
                  <TextInput
                    style={[
                      styles.input,
                      formik.touched.inchargeName && formik.errors.inchargeName && styles.inputError,
                    ]}
                    placeholder="Enter incharge name"
                    value={formik.values.inchargeName}
                    onChangeText={formik.handleChange('inchargeName')}
                    onBlur={formik.handleBlur('inchargeName')}
                  />
                  {formik.touched.inchargeName && formik.errors.inchargeName && (
                    <Text style={styles.errorText}>{formik.errors.inchargeName}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Designation <Text style={styles.star}>*</Text></Text>
                  <TextInput
                    style={[
                      styles.input,
                      formik.touched.inchargeDesignation && formik.errors.inchargeDesignation && styles.inputError,
                    ]}
                    placeholder="Enter designation"
                    value={formik.values.inchargeDesignation}
                    onChangeText={formik.handleChange('inchargeDesignation')}
                    onBlur={formik.handleBlur('inchargeDesignation')}
                  />
                  {formik.touched.inchargeDesignation && formik.errors.inchargeDesignation && (
                    <Text style={styles.errorText}>{formik.errors.inchargeDesignation}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Mobile Number <Text style={styles.star}>*</Text></Text>
                  <TextInput
                    style={[
                      styles.input,
                      formik.touched.inchargeMobile && formik.errors.inchargeMobile && styles.inputError,
                    ]}
                    placeholder="Enter 10 digit mobile number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={formik.values.inchargeMobile}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, '');
                      formik.setFieldValue('inchargeMobile', numericText);
                    }}
                    onBlur={formik.handleBlur('inchargeMobile')}
                  />
                  {formik.touched.inchargeMobile && formik.errors.inchargeMobile && (
                    <Text style={styles.errorText}>{formik.errors.inchargeMobile}</Text>
                  )}
                </View>

                {/* Landmark for non-forest */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Location / Landmark <Text style={styles.star}>*</Text></Text>
                  <TextInput
                    style={[
                      styles.input,
                      formik.touched.landmark && formik.errors.landmark && styles.inputError,
                    ]}
                    placeholder="Enter Location / Landmark"
                    value={formik.values.landmark}
                    onChangeText={formik.handleChange('landmark')}
                    onBlur={formik.handleBlur('landmark')}
                  />
                  {formik.touched.landmark && formik.errors.landmark && (
                    <Text style={styles.errorText}>{formik.errors.landmark}</Text>
                  )}
                </View>
              </>
            )}

            {/* Scheme (Forest only) */}
            {locationType === 'forest' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Scheme <Text style={styles.star}>*</Text></Text>
                <View style={[
                  styles.pickerContainer,
                  formik.touched.scheme && formik.errors.scheme && styles.inputError
                ]}>
                  <Picker
                    selectedValue={formik.values.scheme}
                    onValueChange={(itemValue) => {
                      formik.setFieldValue('scheme', itemValue);
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="--Select--" value="" />
                    {scheme?.map((s) => (
                      <Picker.Item key={s.id} label={s.scheme_name} value={String(s.id)} />
                    ))}
                  </Picker>
                </View>
                {formik.touched.scheme && formik.errors.scheme && (
                  <Text style={styles.errorText}>{formik.errors.scheme}</Text>
                )}
              </View>
            )}

            {/* Species Details Section */}
            <View style={styles.speciesSection}>
              <View style={styles.speciesHeader}>
                <Text style={styles.speciesEmoji}>🌳</Text>
                <Text style={styles.speciesTitle}>Species Details</Text>
              </View>

              {renderSpeciesDetails()}
            </View>

            {/* Images Section - Top Level */}
            <View style={styles.imagesSection}>
              <View style={styles.imagesHeader}>
                <Text style={styles.imagesEmoji}>📸</Text>
                <Text style={styles.imagesTitle}>Plantation Photos</Text>
              </View>

              {renderImages()}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={() => {
                // Touch all fields to show validation errors
                const touchAllFields = (obj, prefix = '') => {
                  Object.keys(obj).forEach(key => {
                    const fieldName = prefix ? `${prefix}.${key}` : key;
                    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                      touchAllFields(obj[key], fieldName);
                    } else if (Array.isArray(obj[key])) {
                      obj[key].forEach((item, index) => {
                        touchAllFields(item, `${fieldName}[${index}]`);
                      });
                    } else if (!prefix && key === 'speciesDetails') {
                      obj[key].forEach((item, index) => {
                        touchAllFields(item, `${fieldName}[${index}]`);
                      });
                    } else {
                      formik.setFieldTouched(fieldName, true);
                    }
                  });
                };
                touchAllFields(formik.values);
                formik.handleSubmit();
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitEmoji}>✅</Text>
                  <Text style={styles.submitButtonText}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  cardHeader: {
    backgroundColor: '#2e7d32',
    padding: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardBody: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  panelBody: {
    padding: 8,
  },
  locationTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  locationTypeLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  locationTypeValue: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  star: {
    color: '#dc3545',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color:"black"
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  dateInputText: {
    fontSize: 14,
    color: '#333',
  },
  datePlaceholder: {
    color: '#999',
  },
  calendarEmoji: {
    fontSize: 20,
  },
  speciesSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  speciesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  speciesEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  speciesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  speciesCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  speciesCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  speciesCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  removeSpeciesButton: {
    padding: 4,
  },
  removeIcon: {
    fontSize: 24,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  imageHeaderContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  imagesSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  imagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  imagesEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  imagesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  imageFieldContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  imageFieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageFieldTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  removeImageButton: {
    padding: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7d32',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginVertical: 4,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  previewContainer: {
    marginTop: 8,
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 6,
    resizeMode: 'cover',
  },
  locationContainer: {
    marginTop: 8,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f5e9',
    padding: 8,
    borderRadius: 6,
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '500',
  },
  coordinatesText: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  addImageText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
  },
  imageCountContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  imageCountText: {
    fontSize: 12,
    color: '#666',
  },
  addSpeciesButton: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addSpeciesButtonText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  submitEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  mt1: {
    marginTop: 8,
  },
});

export default Vanamahotsav;