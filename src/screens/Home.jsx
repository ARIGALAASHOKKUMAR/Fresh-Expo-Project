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
import {
  commonAPICall,
  CONTEXT_HEADING,
  SCHEMES,
  VanamahotsavamEntry,
  VANASECTIONS,
} from '../utils/utils';
import ImageBucketRN, { getLocation } from '../utils/ImageBucketRN';
import { GetSpecies, GetNewMandals, new_dist, NewVillages, GetBeat, GetCompartment, GetBlock } from '../utils/CommonFunctions';

const Vanamahotsav = () => {
  const dispatch = useDispatch();
  const state = useSelector((s) => s.LoginReducer);
  const { districts, roleId } = state;
  
  const [species, setSpecies] = useState([]);
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
  const [currentImageIndex, setCurrentImageIndex] = useState(null);

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
    speciesDetails: Yup.object().shape({
      species: Yup.string().required('Species is required'),
      noOfPlants: Yup.number()
        .typeError('Must be a number')
        .positive('Must be positive')
        .integer('Must be a whole number')
        .required('Number of plants is required'),
      plantationType: Yup.string().required('Plantation type is required'),
      speciesPlantationArea: Yup.string()
        .required('Area is required')
        .matches(/^[0-9]+(\.[0-9]{1,2})?$/, 'Enter valid area in hectares'),
      othersPlantationType: Yup.string().when('plantationType', {
        is: (val) => String(val) === '5',
        then: (schema) => schema.required('Other plantation type is required'),
        otherwise: (schema) => schema.notRequired(),
      }),
      speciesImages: Yup.array().of(
        Yup.object().shape({
          image: Yup.string().required('Image is required'),
          imageLocation: Yup.string().required('Location is required'),
        })
      ).min(4, 'Minimum 4 images required').max(15, 'Maximum 15 images allowed'),
      kmlFilePath: Yup.string().when('plantationType', {
        is: (val) => val === '1' || val === '4',
        then: (schema) => schema.required('KML file is required'),
        otherwise: (schema) => schema.notRequired(),
      }),
      plantationLength: Yup.string().when('plantationType', {
        is: (val) => val === '2' || val === '3' || val === '5',
        then: (schema) => schema.required('Plantation length is required'),
        otherwise: (schema) => schema.notRequired(),
      }),
    }),
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
    GetSpecies(setSpecies, dispatch);
    GetSections();
    GetSchemes();
  }, []);

  // Initialize with 4 images
  const getInitialImages = () => {
    return Array(4).fill(null).map(() => ({
      image: '',
      imageLocation: '',
    }));
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
      speciesDetails: {
        species: '',
        noOfPlants: '',
        plantationType: '',
        kmlFilePath: '',
        plantationLength: '',
        othersPlantationType: '',
        speciesPlantationArea: '',
        speciesImages: getInitialImages(),
      },
    },
    validationSchema: validationSchema,
    onSubmit: HandleSubmit,
  });

  const HandleSubmit = async (values) => {
    try {
      setLoading(true);
      const payload = { ...values };
      
      // Ensure kmlFilePath is null if empty
      if (payload.speciesDetails) {
        payload.speciesDetails = {
          ...payload.speciesDetails,
          kmlFilePath: payload.speciesDetails.kmlFilePath || null,
        };
      }

      const response = await commonAPICall(VanamahotsavamEntry, payload, 'post', dispatch);
      if (response.status === 200) {
        formik.resetForm();
        Alert.alert('Success', 'Vanamahotsav entry submitted successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit entry');
    } finally {
      setLoading(false);
    }
  };

  // Handle Date Change
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || tempDate;
    setShowDatePicker(Platform.OS === 'ios');
    setTempDate(currentDate);
    const formattedDate = currentDate.toISOString().split('T')[0];
    formik.setFieldValue('plantationDate', formattedDate);
  };

  // Add Image Field
  const addImageField = () => {
    const currentImages = formik.values.speciesDetails.speciesImages || [];
    if (currentImages.length >= 15) {
      Alert.alert('Limit Reached', 'Maximum 15 images allowed');
      return;
    }
    const newImages = [...currentImages, { image: '', imageLocation: '' }];
    formik.setFieldValue('speciesDetails.speciesImages', newImages);
  };

  // Remove Image Field
  const removeImageField = (index) => {
    const currentImages = formik.values.speciesDetails.speciesImages || [];
    if (currentImages.length <= 4) {
      Alert.alert('Cannot Remove', 'Minimum 4 images required');
      return;
    }
    const newImages = currentImages.filter((_, i) => i !== index);
    formik.setFieldValue('speciesDetails.speciesImages', newImages);
  };

  // Handle image capture with location
  const handleImageCapture = async (index) => {
    const path = 'APFD/VANAMAHOTSAV/';
    const imageFieldName = `speciesDetails.speciesImages[${index}].image`;
    const locationFieldName = `speciesDetails.speciesImages[${index}].imageLocation`;
    
    // Store current index for location update
    setCurrentImageIndex(index);
    
    // Capture image using ImageBucketRN
    await ImageBucketRN(
      formik,
      path,
      imageFieldName,
      20971520,
      'camera',
      dispatch
    );
    
    // Get location after image capture
    try {
      const locationData = await getLocation(formik);
      if (locationData) {
        formik.setFieldValue(locationFieldName, locationData);
      }
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  // Render Images with Add/Remove functionality
  const renderImages = () => {
    const images = formik.values.speciesDetails.speciesImages || [];
    
    return (
      <View>
        <View style={styles.imageHeaderContainer}>
          <Text style={styles.subLabel}>
            Upload Images (Min: 4, Max: 15) <Text style={styles.star}>*</Text>
          </Text>
        </View>

        {images.map((item, index) => {
          const imageFieldName = `speciesDetails.speciesImages[${index}].image`;
          const locationFieldName = `speciesDetails.speciesImages[${index}].imageLocation`;
          
          return (
            <View key={index} style={styles.imageFieldContainer}>
              <View style={styles.imageFieldHeader}>
                <Text style={styles.imageFieldTitle}>Image {index + 1}</Text>
                {index >= 4 && (
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImageField(index)}
                  >
                    <Text style={styles.removeIcon}>❌</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  formik.touched[imageFieldName] && formik.errors[imageFieldName] && styles.inputError,
                ]}
                onPress={() => handleImageCapture(index)}
              >
                <Text style={styles.uploadButtonText}>📷 Capture Image {index + 1}</Text>
              </TouchableOpacity>
              
              {formik.touched[imageFieldName] && formik.errors[imageFieldName] && (
                <Text style={styles.errorText}>{formik.errors[imageFieldName]}</Text>
              )}
              
              {item.image && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: item.image }} style={styles.previewImage} />
                  
                  {/* Location displayed below the image */}
                  <View style={styles.locationContainer}>
                    <View style={styles.locationBox}>
                      <Text style={styles.locationEmoji}>📍</Text>
                      <Text style={styles.locationText} numberOfLines={2}>
                        {item.imageLocation || 'Location not available'}
                      </Text>
                    </View>
                    {formik.touched[locationFieldName] && formik.errors[locationFieldName] && (
                      <Text style={styles.errorText}>{formik.errors[locationFieldName]}</Text>
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
            onPress={addImageField}
          >
            <Text style={styles.addIcon}>➕</Text>
            <Text style={styles.addImageText}>Add</Text>
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
                        <Picker.Item key={s.id} label={s.section} value={s.id} />
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
                        <Picker.Item key={s.id} label={s.beat} value={s.id} />
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
                        <Picker.Item key={s.id} label={s.compartment} value={s.id} />
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
                        <Picker.Item key={s.id} label={s.forest_block} value={s.id} />
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
                    <Picker.Item key={dist.dist_code} label={dist.dist_name} value={dist.dist_code} />
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
                    <Picker.Item key={m.mandal_code} label={m.mandal_name} value={m.mandal_code} />
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
                    <Picker.Item key={v.village_code} label={v.village_name} value={v.village_code} />
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
                      <Picker.Item key={s.id} label={s.scheme_name} value={s.id} />
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

              <View style={styles.speciesCard}>
                {/* Species */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Species <Text style={styles.star}>*</Text></Text>
                  <View style={[
                    styles.pickerContainer,
                    formik.touched.speciesDetails?.species && formik.errors.speciesDetails?.species && styles.inputError
                  ]}>
                    <Picker
                      selectedValue={formik.values.speciesDetails.species}
                      onValueChange={(itemValue) => {
                        formik.setFieldValue('speciesDetails.species', itemValue);
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="---select---" value="" />
                      {species?.map((d) => (
                        <Picker.Item key={d.id} label={d.species_scientific_name} value={d.id} />
                      ))}
                      <Picker.Item label="Others" value="999" />
                    </Picker>
                  </View>
                  {formik.touched.speciesDetails?.species && formik.errors.speciesDetails?.species && (
                    <Text style={styles.errorText}>{formik.errors.speciesDetails.species}</Text>
                  )}
                  {formik.values.speciesDetails.species === '999' && (
                    <TextInput
                      style={[styles.input, styles.mt1]}
                      placeholder="Enter Other Species"
                      value={formik.values.speciesDetails.otherSpecies}
                      onChangeText={(text) => {
                        formik.setFieldValue('speciesDetails.otherSpecies', text);
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
                      formik.touched.speciesDetails?.noOfPlants && 
                        formik.errors.speciesDetails?.noOfPlants && 
                        styles.inputError,
                    ]}
                    placeholder="Enter number of plants"
                    keyboardType="numeric"
                    value={String(formik.values.speciesDetails.noOfPlants || '')}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, '');
                      formik.setFieldValue('speciesDetails.noOfPlants', numericText);
                    }}
                    onBlur={formik.handleBlur('speciesDetails.noOfPlants')}
                  />
                  {formik.touched.speciesDetails?.noOfPlants && 
                    formik.errors.speciesDetails?.noOfPlants && (
                      <Text style={styles.errorText}>{formik.errors.speciesDetails.noOfPlants}</Text>
                    )}
                </View>

                {/* Plantation Type */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Plantation Type <Text style={styles.star}>*</Text></Text>
                  <View style={[
                    styles.pickerContainer,
                    formik.touched.speciesDetails?.plantationType && 
                    formik.errors.speciesDetails?.plantationType && styles.inputError
                  ]}>
                    <Picker
                      selectedValue={formik.values.speciesDetails.plantationType}
                      onValueChange={(itemValue) => {
                        formik.setFieldValue('speciesDetails.plantationType', itemValue);
                        // Clear dependent fields
                        formik.setFieldValue('speciesDetails.kmlFilePath', '');
                        formik.setFieldValue('speciesDetails.plantationLength', '');
                        formik.setFieldValue('speciesDetails.othersPlantationType', '');
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
                  {formik.touched.speciesDetails?.plantationType && 
                    formik.errors.speciesDetails?.plantationType && (
                      <Text style={styles.errorText}>{formik.errors.speciesDetails.plantationType}</Text>
                    )}
                </View>

                {/* Others Plantation Type */}
                {formik.values.speciesDetails.plantationType === '5' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Other Plantation Type <Text style={styles.star}>*</Text></Text>
                    <TextInput
                      style={[
                        styles.input,
                        formik.touched.speciesDetails?.othersPlantationType && 
                          formik.errors.speciesDetails?.othersPlantationType && 
                          styles.inputError,
                      ]}
                      placeholder="Enter other plantation type"
                      value={formik.values.speciesDetails.othersPlantationType}
                      onChangeText={formik.handleChange('speciesDetails.othersPlantationType')}
                      onBlur={formik.handleBlur('speciesDetails.othersPlantationType')}
                    />
                    {formik.touched.speciesDetails?.othersPlantationType && 
                      formik.errors.speciesDetails?.othersPlantationType && (
                        <Text style={styles.errorText}>{formik.errors.speciesDetails.othersPlantationType}</Text>
                      )}
                  </View>
                )}

                {/* Area */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Area (Ha) <Text style={styles.star}>*</Text></Text>
                  <TextInput
                    style={[
                      styles.input,
                      formik.touched.speciesDetails?.speciesPlantationArea && 
                        formik.errors.speciesDetails?.speciesPlantationArea && 
                        styles.inputError,
                    ]}
                    placeholder="Enter area in hectares"
                    keyboardType="numeric"
                    value={formik.values.speciesDetails.speciesPlantationArea}
                    onChangeText={formik.handleChange('speciesDetails.speciesPlantationArea')}
                    onBlur={formik.handleBlur('speciesDetails.speciesPlantationArea')}
                  />
                  {formik.touched.speciesDetails?.speciesPlantationArea && 
                    formik.errors.speciesDetails?.speciesPlantationArea && (
                      <Text style={styles.errorText}>{formik.errors.speciesDetails.speciesPlantationArea}</Text>
                    )}
                </View>

                {/* KML File / Plantation Length */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    {['1', '4'].includes(formik.values.speciesDetails.plantationType) 
                      ? 'KML File' 
                      : 'Plantation Length'} <Text style={styles.star}>*</Text>
                  </Text>
                  
                  {['1', '4'].includes(formik.values.speciesDetails.plantationType) ? (
                    <TouchableOpacity
                      style={[
                        styles.uploadButton,
                        formik.touched.speciesDetails?.kmlFilePath && 
                          formik.errors.speciesDetails?.kmlFilePath && 
                          styles.inputError,
                      ]}
                      onPress={() => {
                        const path = 'APFD/VANAMAHOTSAV/';
                        ImageBucketRN(
                          formik,
                          path,
                          'speciesDetails.kmlFilePath',
                          20971520,
                          'document',
                          dispatch
                        );
                      }}
                    >
                      <Text style={styles.uploadButtonText}>📄 Upload KML File</Text>
                    </TouchableOpacity>
                  ) : (
                    <TextInput
                      style={[
                        styles.input,
                        formik.touched.speciesDetails?.plantationLength && 
                          formik.errors.speciesDetails?.plantationLength && 
                          styles.inputError,
                      ]}
                      placeholder="Enter plantation length"
                      keyboardType="numeric"
                      value={formik.values.speciesDetails.plantationLength}
                      onChangeText={formik.handleChange('speciesDetails.plantationLength')}
                      onBlur={formik.handleBlur('speciesDetails.plantationLength')}
                    />
                  )}
                  {formik.touched.speciesDetails?.kmlFilePath && 
                    formik.errors.speciesDetails?.kmlFilePath && (
                      <Text style={styles.errorText}>{formik.errors.speciesDetails.kmlFilePath}</Text>
                    )}
                  {formik.touched.speciesDetails?.plantationLength && 
                    formik.errors.speciesDetails?.plantationLength && (
                      <Text style={styles.errorText}>{formik.errors.speciesDetails.plantationLength}</Text>
                    )}
                </View>

                {/* Dynamic Images */}
                {renderImages()}
              </View>
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
                    } else if (!prefix && key === 'speciesDetails') {
                      touchAllFields(obj[key], 'speciesDetails');
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
    fontSize: 28,
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