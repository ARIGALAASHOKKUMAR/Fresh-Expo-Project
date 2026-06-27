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

const Vanamahotsav = () => {
  const dispatch = useDispatch();
  const state = useSelector((s) => s.LoginReducer);
  const { districts, roleId } = state;
  
  const [speciesList, setSpeciesList] = useState([]); // Renamed from species to speciesList
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
  // roleId 11 = Forest, others = Non-Forest
  const locationType = roleId !== 11 ? 'forest' : 'nonforest';

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
    landmark: Yup.string().required('Landmark is required'),
    scheme: Yup.string().when('locationType', {
      is: (val) => val === 'forest',
      then: () => Yup.string().required('Scheme is required'),
      otherwise: () => Yup.string().notRequired(),
    }),
    speciesDetails: Yup.array().of(
      Yup.object().shape({
        species: Yup.string().required('Species is required'),
        noOfPlants: Yup.number()
          .typeError('Must be a number')
          .positive('Must be positive')
          .integer('Must be a whole number')
          .required('Number of plants is required'),
        plantationType: Yup.string().required('Plantation type is required'),
        plantationArea: Yup.string()
          .when('plantationType', {
            is: (val) => val === '1' || val === '4',
            then: (schema) => schema.required('Area is required').matches(/^[0-9]+(\.[0-9]{1,2})?$/, 'Enter valid area in hectares'),
            otherwise: (schema) => schema.notRequired(),
          }),
        othersPlantationType: Yup.string().when('plantationType', {
          is: (val) => String(val) === '5',
          then: (schema) => schema.required('Other plantation type is required'),
          otherwise: (schema) => schema.notRequired(),
        }),
        imageDetails: Yup.array().of(
          Yup.object().shape({
            imagePath: Yup.string().required('Image is required'),
            latitude: Yup.number()
              .typeError('Latitude must be a number')
              .required('Latitude is required')
              .min(-90, 'Invalid latitude')
              .max(90, 'Invalid latitude'),
            longitude: Yup.number()
              .typeError('Longitude must be a number')
              .required('Longitude is required')
              .min(-180, 'Invalid longitude')
              .max(180, 'Invalid longitude'),
          })
        ).min(1, 'Minimum 1 image required').max(15, 'Maximum 15 images allowed'),
      })
    ).min(1, 'At least one species is required'),
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
    GetSpecies(setSpeciesList, dispatch); // Changed from setSpecies to setSpeciesList
    GetSections();
    GetSchemes();
  }, []);

  // Initialize with one species and one image
  const getInitialSpecies = () => {
    return [{
      species: '',
      noOfPlants: '',
      plantationType: '',
      kmlFilePath: '',
      plantationLength: '',
      othersPlantationType: '',
      plantationArea: '',
      imageDetails: [{
        imagePath: '',
        latitude: null,
        longitude: null,
      }],
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
        landmark: values.landmark,
        locationType: values.locationType.toUpperCase(),
        section: values.section ? Number(values.section) : null,
        beat: values.beat ? Number(values.beat) : null,
        compartment: values.compartment ? Number(values.compartment) : null,
        block: values.block ? Number(values.block) : null,
        scheme: values.scheme ? Number(values.scheme) : null,
        speciesDetails: values.speciesDetails.map(species => ({
          species: Number(species.species),
          noOfPlants: Number(species.noOfPlants),
          plantationType: Number(species.plantationType),
          plantationArea: species.plantationArea ? Number(species.plantationArea) : null,
          plantationLength: species.plantationLength ? Number(species.plantationLength) : null,
          othersPlantationType: species.othersPlantationType || null,
          kmlFilePath: species.kmlFilePath || null,
          imageDetails: species.imageDetails.map(img => ({
            imagePath: img.imagePath,
            latitude: Number(img.latitude),
            longitude: Number(img.longitude),
          }))
        }))
      };

      // Remove null values (optional)
      Object.keys(payload).forEach(key => {
        if (payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      });

      const response = await commonAPICall(CREATENEWHARITHANDHRA, payload, 'post', dispatch);
      if (response.status === 200) {
        formik.resetForm();
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
      scheme: '',
      speciesDetails: getInitialSpecies(),
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

  // Get location with latitude and longitude
  const getLocationWithCoords = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
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
      plantationType: '',
      kmlFilePath: '',
      plantationLength: '',
      othersPlantationType: '',
      plantationArea: '',
      imageDetails: [{
        imagePath: '',
        latitude: null,
        longitude: null,
      }],
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

  // Add Image Field for a specific species
  const addImageField = (speciesIndex) => {
    const currentSpecies = formik.values.speciesDetails || [];
    const species = currentSpecies[speciesIndex];
    const currentImages = species.imageDetails || [];
    
    if (currentImages.length >= 15) {
      Alert.alert('Limit Reached', 'Maximum 15 images allowed per species');
      return;
    }
    
    const newImages = [...currentImages, { imagePath: '', latitude: null, longitude: null }];
    const updatedSpecies = [...currentSpecies];
    updatedSpecies[speciesIndex].imageDetails = newImages;
    formik.setFieldValue('speciesDetails', updatedSpecies);
  };

  // Remove Image Field
  const removeImageField = (speciesIndex, imageIndex) => {
    const currentSpecies = formik.values.speciesDetails || [];
    const species = currentSpecies[speciesIndex];
    const currentImages = species.imageDetails || [];
    
    if (currentImages.length <= 1) {
      Alert.alert('Cannot Remove', 'Minimum 1 image required per species');
      return;
    }
    
    const newImages = currentImages.filter((_, i) => i !== imageIndex);
    const updatedSpecies = [...currentSpecies];
    updatedSpecies[speciesIndex].imageDetails = newImages;
    formik.setFieldValue('speciesDetails', updatedSpecies);
  };

  // Handle image capture with location
  const handleImageCapture = async (speciesIndex, imageIndex) => {
    const path = 'APFD/VANAMAHOTSAV/';
    const imageFieldName = `speciesDetails[${speciesIndex}].imageDetails[${imageIndex}].imagePath`;
    const latitudeFieldName = `speciesDetails[${speciesIndex}].imageDetails[${imageIndex}].latitude`;
    const longitudeFieldName = `speciesDetails[${speciesIndex}].imageDetails[${imageIndex}].longitude`;
    
    // Capture image
    await ImageBucketRN(
      formik,
      path,
      imageFieldName,
      20971520,
      'camera',
      dispatch
    );
    
    // Get location with lat/long after image capture
    const coords = await getLocationWithCoords();
    if (coords) {
      formik.setFieldValue(latitudeFieldName, coords.latitude);
      formik.setFieldValue(longitudeFieldName, coords.longitude);
    }
  };

  // Render Images for a specific species
  const renderImages = (speciesIndex) => {
    const species = formik.values.speciesDetails?.[speciesIndex];
    const images = species?.imageDetails || [];
    
    return (
      <View>
        <View style={styles.imageHeaderContainer}>
          <Text style={styles.subLabel}>
            Upload Images (Min: 4, Max: 15) <Text style={styles.star}>*</Text>
          </Text>
        </View>

        {images.map((item, imageIndex) => {
          const imageFieldName = `speciesDetails[${speciesIndex}].imageDetails[${imageIndex}].imagePath`;
          const latitudeFieldName = `speciesDetails[${speciesIndex}].imageDetails[${imageIndex}].latitude`;
          const longitudeFieldName = `speciesDetails[${speciesIndex}].imageDetails[${imageIndex}].longitude`;
          
          const imageError = formik.touched.speciesDetails?.[speciesIndex]?.imageDetails?.[imageIndex]?.imagePath && 
                           formik.errors.speciesDetails?.[speciesIndex]?.imageDetails?.[imageIndex]?.imagePath;
          const latError = formik.touched.speciesDetails?.[speciesIndex]?.imageDetails?.[imageIndex]?.latitude && 
                          formik.errors.speciesDetails?.[speciesIndex]?.imageDetails?.[imageIndex]?.latitude;
          const lngError = formik.touched.speciesDetails?.[speciesIndex]?.imageDetails?.[imageIndex]?.longitude && 
                          formik.errors.speciesDetails?.[speciesIndex]?.imageDetails?.[imageIndex]?.longitude;
          
          return (
            <View key={imageIndex} style={styles.imageFieldContainer}>
              <View style={styles.imageFieldHeader}>
                <Text style={styles.imageFieldTitle}>Image {imageIndex + 1}</Text>
                {images.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImageField(speciesIndex, imageIndex)}
                  >
                    <Text style={styles.removeIcon}>❌</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  imageError && styles.inputError,
                ]}
                onPress={() => handleImageCapture(speciesIndex, imageIndex)}
              >
                <Text style={styles.uploadButtonText}>📷 Capture Image {imageIndex + 1}</Text>
              </TouchableOpacity>
              
              {imageError && (
                <Text style={styles.errorText}>{imageError}</Text>
              )}
              
              {item.imagePath && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: item.imagePath }} style={styles.previewImage} />
                  
                  {/* Location displayed below the image */}
                  <View style={styles.locationContainer}>
                    <View style={styles.locationBox}>
                      <Text style={styles.locationEmoji}>📍</Text>
                      <Text style={styles.locationText} numberOfLines={2}>
                        Lat: {item.latitude?.toFixed(6) || 'N/A'}, 
                        Lng: {item.longitude?.toFixed(6) || 'N/A'}
                      </Text>
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
            style={styles.addImageButton}
            onPress={() => addImageField(speciesIndex)}
          >
            <Text style={styles.addIcon}>➕</Text>
          </TouchableOpacity>
        </View>

        {/* Show count */}
        <View style={styles.imageCountContainer}>
          <Text style={styles.imageCountText}>
            {images.length} / 15 Images
          </Text>
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
                    {speciesList?.map((d) => ( // Changed from species to speciesList
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

              {/* Plantation Type */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Plantation Type <Text style={styles.star}>*</Text></Text>
                <View style={[
                  styles.pickerContainer,
                  speciesTouched.plantationType && speciesErrors.plantationType && styles.inputError
                ]}>
                  <Picker
                    selectedValue={species.plantationType}
                    onValueChange={(itemValue) => {
                      const updatedSpecies = [...speciesDetails];
                      updatedSpecies[speciesIndex].plantationType = itemValue;
                      updatedSpecies[speciesIndex].kmlFilePath = '';
                      updatedSpecies[speciesIndex].plantationLength = '';
                      updatedSpecies[speciesIndex].othersPlantationType = '';
                      updatedSpecies[speciesIndex].plantationArea = '';
                      formik.setFieldValue('speciesDetails', updatedSpecies);
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="--Select--" value="" />
                    <Picker.Item label="Block Plantation" value="1" />
                    <Picker.Item label="Avenue Plantation" value="2" />
                    <Picker.Item label="Bund / Canal Plantation" value="3" />
                    <Picker.Item label="Agro Forestry / Horticulture" value="4" />
                    <Picker.Item label="Others" value="5" />
                  </Picker>
                </View>
                {speciesTouched.plantationType && speciesErrors.plantationType && (
                  <Text style={styles.errorText}>{speciesErrors.plantationType}</Text>
                )}
              </View>

              {/* Others Plantation Type */}
              {species.plantationType === '5' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Other Plantation Type <Text style={styles.star}>*</Text></Text>
                  <TextInput
                    style={[
                      styles.input,
                      speciesTouched.othersPlantationType && speciesErrors.othersPlantationType && styles.inputError,
                    ]}
                    placeholder="Enter other plantation type"
                    value={species.othersPlantationType}
                    onChangeText={(text) => {
                      const updatedSpecies = [...speciesDetails];
                      updatedSpecies[speciesIndex].othersPlantationType = text;
                      formik.setFieldValue('speciesDetails', updatedSpecies);
                    }}
                    onBlur={() => {
                      formik.setFieldTouched(`speciesDetails[${speciesIndex}].othersPlantationType`, true);
                    }}
                  />
                  {speciesTouched.othersPlantationType && speciesErrors.othersPlantationType && (
                    <Text style={styles.errorText}>{speciesErrors.othersPlantationType}</Text>
                  )}
                </View>
              )}

              {/* Area - Only for Block Plantation and Agro Forestry */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Area (Ha) <Text style={styles.star}>*</Text></Text>
                  <TextInput
                    style={[
                      styles.input,
                      speciesTouched.plantationArea && speciesErrors.plantationArea && styles.inputError,
                    ]}
                    placeholder="Enter area in hectares"
                    keyboardType="numeric"
                    value={species.plantationArea}
                    onChangeText={(text) => {
                      const updatedSpecies = [...speciesDetails];
                      updatedSpecies[speciesIndex].plantationArea = text;
                      formik.setFieldValue('speciesDetails', updatedSpecies);
                    }}
                    onBlur={() => {
                      formik.setFieldTouched(`speciesDetails[${speciesIndex}].plantationArea`, true);
                    }}
                  />
                  {speciesTouched.plantationArea && speciesErrors.plantationArea && (
                    <Text style={styles.errorText}>{speciesErrors.plantationArea}</Text>
                  )}
                </View>

              {/* KML File / Plantation Length */}
              

              {/* Dynamic Images */}
              {renderImages(speciesIndex)}
            </View>
          );
        })}
        
        {/* Add Species Button */}
        {/* <TouchableOpacity
          style={styles.addSpeciesButton}
          onPress={addSpeciesField}
        >
          <Text style={styles.addSpeciesButtonText}>➕ Add Another Species</Text>
        </TouchableOpacity> */}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            🌿 Vana Mahotsav
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
                {locationType === 'forest' ? 'Forest' : 'Non-Forest'}
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
              <Text style={styles.label}>Village <Text style={styles.star}>*</Text></Text>
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
                  maximumDate={new Date()}
                />
              )}
              
              {formik.touched.plantationDate && formik.errors.plantationDate && (
                <Text style={styles.errorText}>{formik.errors.plantationDate}</Text>
              )}
            </View>

            {/* Landmark */}
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
                      // Handle speciesDetails array
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
  removeIcon: {
    fontSize: 24,
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
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 8,
    borderRadius: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#2e7d32',
    marginLeft: 4,
    flex: 1,
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