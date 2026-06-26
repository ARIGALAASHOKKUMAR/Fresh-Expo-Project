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
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import moment from 'moment';
import Icon from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  commonAPICall,
  CONTEXT_HEADING,
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
  const [fieldErrors, setFieldErrors] = useState({});

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

  // Get location
  const getLocation = async (fieldName) => {
    try {
      // You can implement actual location fetching here
      // For now, using a mock location
      const mockLocation = '17.1234, 78.5678';
      formik.setFieldValue(fieldName, mockLocation);
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    }
  };

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
    validateOnChange: true,
    validateOnBlur: true,
  });

  // Handle field validation on blur - only validate the field being blurred
  const handleFieldBlur = (fieldName) => {
    formik.setFieldTouched(fieldName, true);
    
    // Validate only the specific field
    try {
      Yup.reach(validationSchema, fieldName)
        .validate(formik.values[fieldName])
        .then(() => {
          // Field is valid, clear error for this field
          setFieldErrors(prev => ({ ...prev, [fieldName]: undefined }));
        })
        .catch((err) => {
          // Field is invalid, set error for this field
          setFieldErrors(prev => ({ ...prev, [fieldName]: err.message }));
        });
    } catch (error) {
      // Field might not exist in schema or is nested
      if (fieldName.includes('.')) {
        // Handle nested fields
        const [parent, child] = fieldName.split('.');
        if (parent === 'speciesDetails') {
          try {
            Yup.reach(validationSchema, `speciesDetails.${child}`)
              .validate(formik.values.speciesDetails[child])
              .then(() => {
                setFieldErrors(prev => ({ ...prev, [fieldName]: undefined }));
              })
              .catch((err) => {
                setFieldErrors(prev => ({ ...prev, [fieldName]: err.message }));
              });
          } catch (e) {
            // Field not in schema
          }
        }
      }
    }
  };

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
    // Validate the date field
    handleFieldBlur('plantationDate');
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

  // Get error message for a field
  const getFieldError = (fieldName) => {
    // Check if field is touched and has error
    const path = fieldName.split('.');
    let touched = formik.touched;
    let error = formik.errors;
    
    for (let key of path) {
      if (touched && touched[key] !== undefined) {
        touched = touched[key];
      } else {
        touched = undefined;
      }
      if (error && error[key] !== undefined) {
        error = error[key];
      } else {
        error = undefined;
      }
    }
    
    // Also check for specific field validation errors
    if (fieldErrors[fieldName]) {
      return fieldErrors[fieldName];
    }
    
    return touched && error ? error : undefined;
  };

  // Get touched status for a field
  const isFieldTouched = (fieldName) => {
    const path = fieldName.split('.');
    let touched = formik.touched;
    
    for (let key of path) {
      if (touched && touched[key] !== undefined) {
        touched = touched[key];
      } else {
        return false;
      }
    }
    return touched !== undefined;
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
                    <Icon name="close-circle" size={24} color="#dc3545" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  getFieldError(imageFieldName) && isFieldTouched(imageFieldName) &&
                  styles.inputError,
                ]}
                onPress={async () => {
                  const path = 'APFD/VANAMAHOTSAV/';
                  ImageBucketRN(
                    formik,
                    path,
                    imageFieldName,
                    20971520,
                    'camera',
                    dispatch
                  );
                  await getLocation(locationFieldName);
                  // Validate image after upload
                  setTimeout(() => {
                    handleFieldBlur(imageFieldName);
                    handleFieldBlur(locationFieldName);
                  }, 500);
                }}
              >
                <Icon name="camera-outline" size={24} color="#fff" />
                <Text style={styles.uploadButtonText}>Capture Image {index + 1}</Text>
              </TouchableOpacity>
              
              {getFieldError(imageFieldName) && isFieldTouched(imageFieldName) && (
                <Text style={styles.errorText}>{getFieldError(imageFieldName)}</Text>
              )}
              
              {item.image && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: item.image }} style={styles.previewImage} />
                  {item.imageLocation && (
                    <View style={styles.locationBox}>
                      <Icon name="location-outline" size={14} color="#666" />
                      <Text style={styles.locationText}>{item.imageLocation}</Text>
                    </View>
                  )}
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
            <Icon name="add-circle" size={28} color="#28a745" />
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
            <Icon name="leaf-outline" size={24} color="#2e7d32" /> Vana Mahotsav
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.panelBody}>
            {/* Location Type Display */}
            <View style={styles.locationTypeContainer}>
              <Icon 
                name={locationType === 'forest' ? 'forest-outline' : 'home-outline'} 
                size={20} 
                color="#2e7d32" 
              />
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
                  <View style={[styles.pickerContainer, 
                    getFieldError('section') && isFieldTouched('section') && styles.inputError
                  ]}>
                    <Picker
                      selectedValue={formik.values.section}
                      onValueChange={(itemValue) => {
                        formik.setFieldValue('section', itemValue);
                        formik.setFieldTouched('section', true);
                        setFieldErrors(prev => ({ ...prev, section: undefined }));
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
                  {getFieldError('section') && isFieldTouched('section') && (
                    <Text style={styles.errorText}>{getFieldError('section')}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Beat <Text style={styles.star}>*</Text></Text>
                  <View style={[styles.pickerContainer,
                    getFieldError('beat') && isFieldTouched('beat') && styles.inputError
                  ]}>
                    <Picker
                      selectedValue={formik.values.beat}
                      onValueChange={(itemValue) => {
                        formik.setFieldValue('beat', itemValue);
                        formik.setFieldTouched('beat', true);
                        setFieldErrors(prev => ({ ...prev, beat: undefined }));
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
                  {getFieldError('beat') && isFieldTouched('beat') && (
                    <Text style={styles.errorText}>{getFieldError('beat')}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Compartment <Text style={styles.star}>*</Text></Text>
                  <View style={[styles.pickerContainer,
                    getFieldError('compartment') && isFieldTouched('compartment') && styles.inputError
                  ]}>
                    <Picker
                      selectedValue={formik.values.compartment}
                      onValueChange={(itemValue) => {
                        formik.setFieldValue('compartment', itemValue);
                        formik.setFieldTouched('compartment', true);
                        setFieldErrors(prev => ({ ...prev, compartment: undefined }));
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
                  {getFieldError('compartment') && isFieldTouched('compartment') && (
                    <Text style={styles.errorText}>{getFieldError('compartment')}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Block <Text style={styles.star}>*</Text></Text>
                  <View style={[styles.pickerContainer,
                    getFieldError('block') && isFieldTouched('block') && styles.inputError
                  ]}>
                    <Picker
                      selectedValue={formik.values.block}
                      onValueChange={(itemValue) => {
                        formik.setFieldValue('block', itemValue);
                        formik.setFieldTouched('block', true);
                        setFieldErrors(prev => ({ ...prev, block: undefined }));
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="---select---" value="" />
                      {block?.map((s) => (
                        <Picker.Item key={s.id} label={s.forest_block} value={s.id} />
                      ))}
                    </Picker>
                  </View>
                  {getFieldError('block') && isFieldTouched('block') && (
                    <Text style={styles.errorText}>{getFieldError('block')}</Text>
                  )}
                </View>
              </>
            )}

            {/* District */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>District <Text style={styles.star}>*</Text></Text>
              <View style={[styles.pickerContainer,
                getFieldError('distCode') && isFieldTouched('distCode') && styles.inputError
              ]}>
                <Picker
                  selectedValue={formik.values.distCode}
                  onValueChange={(itemValue) => {
                    formik.setFieldValue('distCode', itemValue);
                    formik.setFieldTouched('distCode', true);
                    setFieldErrors(prev => ({ ...prev, distCode: undefined }));
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
              {getFieldError('distCode') && isFieldTouched('distCode') && (
                <Text style={styles.errorText}>{getFieldError('distCode')}</Text>
              )}
            </View>

            {/* Mandal */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Mandal <Text style={styles.star}>*</Text></Text>
              <View style={[styles.pickerContainer,
                getFieldError('mandalCode') && isFieldTouched('mandalCode') && styles.inputError
              ]}>
                <Picker
                  selectedValue={formik.values.mandalCode}
                  onValueChange={(itemValue) => {
                    formik.setFieldValue('mandalCode', itemValue);
                    formik.setFieldTouched('mandalCode', true);
                    setFieldErrors(prev => ({ ...prev, mandalCode: undefined }));
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
              {getFieldError('mandalCode') && isFieldTouched('mandalCode') && (
                <Text style={styles.errorText}>{getFieldError('mandalCode')}</Text>
              )}
            </View>

            {/* Village */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Village <Text style={styles.star}>*</Text></Text>
              <View style={[styles.pickerContainer,
                getFieldError('villageCode') && isFieldTouched('villageCode') && styles.inputError
              ]}>
                <Picker
                  selectedValue={formik.values.villageCode}
                  onValueChange={(itemValue) => {
                    formik.setFieldValue('villageCode', itemValue);
                    formik.setFieldTouched('villageCode', true);
                    setFieldErrors(prev => ({ ...prev, villageCode: undefined }));
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="---Select---" value="" />
                  {village.map((v) => (
                    <Picker.Item key={v.village_code} label={v.village_name} value={v.village_code} />
                  ))}
                </Picker>
              </View>
              {getFieldError('villageCode') && isFieldTouched('villageCode') && (
                <Text style={styles.errorText}>{getFieldError('villageCode')}</Text>
              )}
            </View>

            {/* Plantation Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Date of Plantation <Text style={styles.star}>*</Text></Text>
              <TouchableOpacity
                style={[
                  styles.dateInputWrapper,
                  getFieldError('plantationDate') && isFieldTouched('plantationDate') && styles.inputError
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
                <Icon name="calendar-outline" size={22} color="#2e7d32" />
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
              
              {getFieldError('plantationDate') && isFieldTouched('plantationDate') && (
                <Text style={styles.errorText}>{getFieldError('plantationDate')}</Text>
              )}
            </View>

            {/* Landmark */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Location / Landmark <Text style={styles.star}>*</Text></Text>
              <TextInput
                style={[
                  styles.input,
                  getFieldError('landmark') && isFieldTouched('landmark') && styles.inputError,
                ]}
                placeholder="Enter Location / Landmark"
                value={formik.values.landmark}
                onChangeText={(text) => {
                  formik.setFieldValue('landmark', text);
                  // Clear error when user starts typing
                  if (fieldErrors.landmark) {
                    setFieldErrors(prev => ({ ...prev, landmark: undefined }));
                  }
                }}
                onBlur={() => handleFieldBlur('landmark')}
              />
              {getFieldError('landmark') && isFieldTouched('landmark') && (
                <Text style={styles.errorText}>{getFieldError('landmark')}</Text>
              )}
            </View>

            {/* Scheme (Forest only) */}
            {locationType === 'forest' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Scheme <Text style={styles.star}>*</Text></Text>
                <View style={[styles.pickerContainer,
                  getFieldError('scheme') && isFieldTouched('scheme') && styles.inputError
                ]}>
                  <Picker
                    selectedValue={formik.values.scheme}
                    onValueChange={(itemValue) => {
                      formik.setFieldValue('scheme', itemValue);
                      formik.setFieldTouched('scheme', true);
                      setFieldErrors(prev => ({ ...prev, scheme: undefined }));
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="--Select--" value="" />
                    {scheme?.map((s) => (
                      <Picker.Item key={s.id} label={s.scheme_name} value={s.id} />
                    ))}
                  </Picker>
                </View>
                {getFieldError('scheme') && isFieldTouched('scheme') && (
                  <Text style={styles.errorText}>{getFieldError('scheme')}</Text>
                )}
              </View>
            )}

            {/* Species Details Section */}
            <View style={styles.speciesSection}>
              <View style={styles.speciesHeader}>
                <Icon name="tree-outline" size={20} color="#fff" />
                <Text style={styles.speciesTitle}>Species Details</Text>
              </View>

              <View style={styles.speciesCard}>
                {/* Species */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Species <Text style={styles.star}>*</Text></Text>
                  <View style={[styles.pickerContainer,
                    getFieldError('speciesDetails.species') && isFieldTouched('speciesDetails.species') && styles.inputError
                  ]}>
                    <Picker
                      selectedValue={formik.values.speciesDetails.species}
                      onValueChange={(itemValue) => {
                        formik.setFieldValue('speciesDetails.species', itemValue);
                        formik.setFieldTouched('speciesDetails.species', true);
                        setFieldErrors(prev => ({ ...prev, 'speciesDetails.species': undefined }));
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
                  {getFieldError('speciesDetails.species') && isFieldTouched('speciesDetails.species') && (
                    <Text style={styles.errorText}>{getFieldError('speciesDetails.species')}</Text>
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
                      getFieldError('speciesDetails.noOfPlants') && 
                        isFieldTouched('speciesDetails.noOfPlants') && 
                        styles.inputError,
                    ]}
                    placeholder="Enter number of plants"
                    keyboardType="numeric"
                    value={String(formik.values.speciesDetails.noOfPlants || '')}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, '');
                      formik.setFieldValue('speciesDetails.noOfPlants', numericText);
                      if (fieldErrors['speciesDetails.noOfPlants']) {
                        setFieldErrors(prev => ({ ...prev, 'speciesDetails.noOfPlants': undefined }));
                      }
                    }}
                    onBlur={() => handleFieldBlur('speciesDetails.noOfPlants')}
                  />
                  {getFieldError('speciesDetails.noOfPlants') && 
                    isFieldTouched('speciesDetails.noOfPlants') && (
                      <Text style={styles.errorText}>{getFieldError('speciesDetails.noOfPlants')}</Text>
                    )}
                </View>

                {/* Plantation Type */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Plantation Type <Text style={styles.star}>*</Text></Text>
                  <View style={[styles.pickerContainer,
                    getFieldError('speciesDetails.plantationType') && 
                    isFieldTouched('speciesDetails.plantationType') && styles.inputError
                  ]}>
                    <Picker
                      selectedValue={formik.values.speciesDetails.plantationType}
                      onValueChange={(itemValue) => {
                        formik.setFieldValue('speciesDetails.plantationType', itemValue);
                        formik.setFieldTouched('speciesDetails.plantationType', true);
                        setFieldErrors(prev => ({ ...prev, 'speciesDetails.plantationType': undefined }));
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
                  {getFieldError('speciesDetails.plantationType') && 
                    isFieldTouched('speciesDetails.plantationType') && (
                      <Text style={styles.errorText}>{getFieldError('speciesDetails.plantationType')}</Text>
                    )}
                </View>

                {/* Others Plantation Type */}
                {formik.values.speciesDetails.plantationType === '5' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Other Plantation Type <Text style={styles.star}>*</Text></Text>
                    <TextInput
                      style={[
                        styles.input,
                        getFieldError('speciesDetails.othersPlantationType') && 
                          isFieldTouched('speciesDetails.othersPlantationType') && 
                          styles.inputError,
                      ]}
                      placeholder="Enter other plantation type"
                      value={formik.values.speciesDetails.othersPlantationType}
                      onChangeText={(text) => {
                        formik.setFieldValue('speciesDetails.othersPlantationType', text);
                        if (fieldErrors['speciesDetails.othersPlantationType']) {
                          setFieldErrors(prev => ({ ...prev, 'speciesDetails.othersPlantationType': undefined }));
                        }
                      }}
                      onBlur={() => handleFieldBlur('speciesDetails.othersPlantationType')}
                    />
                    {getFieldError('speciesDetails.othersPlantationType') && 
                      isFieldTouched('speciesDetails.othersPlantationType') && (
                        <Text style={styles.errorText}>{getFieldError('speciesDetails.othersPlantationType')}</Text>
                      )}
                  </View>
                )}

                {/* Area */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Area (Ha) <Text style={styles.star}>*</Text></Text>
                  <TextInput
                    style={[
                      styles.input,
                      getFieldError('speciesDetails.speciesPlantationArea') && 
                        isFieldTouched('speciesDetails.speciesPlantationArea') && 
                        styles.inputError,
                    ]}
                    placeholder="Enter area in hectares"
                    keyboardType="numeric"
                    value={formik.values.speciesDetails.speciesPlantationArea}
                    onChangeText={(text) => {
                      formik.setFieldValue('speciesDetails.speciesPlantationArea', text);
                      if (fieldErrors['speciesDetails.speciesPlantationArea']) {
                        setFieldErrors(prev => ({ ...prev, 'speciesDetails.speciesPlantationArea': undefined }));
                      }
                    }}
                    onBlur={() => handleFieldBlur('speciesDetails.speciesPlantationArea')}
                  />
                  {getFieldError('speciesDetails.speciesPlantationArea') && 
                    isFieldTouched('speciesDetails.speciesPlantationArea') && (
                      <Text style={styles.errorText}>{getFieldError('speciesDetails.speciesPlantationArea')}</Text>
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
                        getFieldError('speciesDetails.kmlFilePath') && 
                          isFieldTouched('speciesDetails.kmlFilePath') && 
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
                        setTimeout(() => {
                          handleFieldBlur('speciesDetails.kmlFilePath');
                        }, 500);
                      }}
                    >
                      <Icon name="document-outline" size={20} color="#fff" />
                      <Text style={styles.uploadButtonText}>Upload KML File</Text>
                    </TouchableOpacity>
                  ) : (
                    <TextInput
                      style={[
                        styles.input,
                        getFieldError('speciesDetails.plantationLength') && 
                          isFieldTouched('speciesDetails.plantationLength') && 
                          styles.inputError,
                      ]}
                      placeholder="Enter plantation length"
                      keyboardType="numeric"
                      value={formik.values.speciesDetails.plantationLength}
                      onChangeText={(text) => {
                        formik.setFieldValue('speciesDetails.plantationLength', text);
                        if (fieldErrors['speciesDetails.plantationLength']) {
                          setFieldErrors(prev => ({ ...prev, 'speciesDetails.plantationLength': undefined }));
                        }
                      }}
                      onBlur={() => handleFieldBlur('speciesDetails.plantationLength')}
                    />
                  )}
                  {getFieldError('speciesDetails.kmlFilePath') && 
                    isFieldTouched('speciesDetails.kmlFilePath') && (
                      <Text style={styles.errorText}>{getFieldError('speciesDetails.kmlFilePath')}</Text>
                    )}
                  {getFieldError('speciesDetails.plantationLength') && 
                    isFieldTouched('speciesDetails.plantationLength') && (
                      <Text style={styles.errorText}>{getFieldError('speciesDetails.plantationLength')}</Text>
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
                  <Icon name="checkmark-circle-outline" size={20} color="#fff" />
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
  },
  cardHeader: {
    padding: 15,
    backgroundColor: '#e8f5e9',
    borderBottomWidth: 1,
    borderBottomColor: '#c8e6c9',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    textAlign: 'center',
  },
  cardBody: {
    padding: 10,
  },
  panelBody: {
    padding: 10,
  },
  locationTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  locationTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    marginRight: 4,
  },
  locationTypeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2e7d32',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 10,
    marginTop: 5,
  },
  star: {
    color: '#dc3545',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#333',
  },
  dateInputWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  dateInputText: {
    fontSize: 14,
    color: '#333',
  },
  datePlaceholder: {
    color: '#999',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  previewContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  imageFieldContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  imageFieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageFieldTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  imageHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    marginLeft: 4,
  },
  removeImageButton: {
    padding: 4,
  },
  speciesSection: {
    marginTop: 10,
  },
  speciesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7d32',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  speciesTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  speciesCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  mt1: {
    marginTop: 10,
  },
  imageCountContainer: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  imageCountText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7d32',
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default Vanamahotsav;