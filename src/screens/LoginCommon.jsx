import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
  Dimensions,
  ImageBackground,
  Linking,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import {
  commonAPICall,
  myAxios,
  myAxiosLogin,
  LOGIN_END_POINT,
  GENERATE_CAPTCHA,
  CHECKAPKVERSION,
  PROD_BASE_URL,
  UAT_BASE_URL,
} from '../utils/utils';
import { login } from '../actions';
import { showErrorToast, showSuccessToast } from '../utils/showToast';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const STATUS_API_URL =
  'https://swapi.dev.nidhi.apcfss.in/apsawmills/api/open/getHarithaStatus';

const APP_VERSION = '1.2.7';
const CUSTOM_APK_URL = 'https://forests.ap.gov.in/harithaandhraapk';

const LoginCommon = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaImage, setCaptchaImage] = useState('');
  const [storedCaptchaId, setStoredCaptchaId] = useState('');

  const baseUrlReadyRef = useRef(false);

  const navigation = useNavigation();

  // ---------------------------------------------------------------------------
  // Resolve base URL from getHarithaStatus response.
  // Writes the chosen URL directly onto the shared axios instances —
  // no setBaseUrl import needed.
  //
  //   harithaStatus[0].status === true  -> DEV/UAT url
  //   otherwise                         -> PROD url
  // ---------------------------------------------------------------------------
  const resolveBaseUrl = async () => {
    try {
      const res = await axios.get(STATUS_API_URL);

      const arr = res?.data?.harithaStatus;
      const flag =
        Array.isArray(arr) && arr.length > 0 ? arr[0]?.status === true : false;

      const chosen = flag ? UAT_BASE_URL : PROD_BASE_URL;

      // 👇 apply it directly to the shared axios instances
      myAxios.defaults.baseURL = chosen;
      myAxiosLogin.defaults.baseURL = chosen;

      console.log('[resolveBaseUrl] harithaStatus.status =>', flag);
      console.log('[resolveBaseUrl] using base_url =>', chosen);
      return flag;
    } catch (err) {
      console.log('[resolveBaseUrl] status API failed =>', err?.message);

      // fallback to PROD
      myAxios.defaults.baseURL = PROD_BASE_URL;
      myAxiosLogin.defaults.baseURL = PROD_BASE_URL;
      return false;
    } finally {
      baseUrlReadyRef.current = true;
    }
  };

  // Validation Schema
  const validationSchema = Yup.object({
    username: Yup.string()
      .required('Username is required')
      .min(4, 'Username must be at least 4 characters')
      .max(18, 'Username must be less than 18 characters'),
    password: Yup.string()
      .required('Password is required')
      .min(6, 'Password must be at least 6 characters'),
    captcha: Yup.string()
      .required('Captcha is required')
      .length(6, 'Captcha must be exactly 6 characters'),
  });

  const formik = useFormik({
    initialValues: { username: '', password: '', captcha: '' },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: handleLogin,
  });

  // Generate Captcha
  const generateCaptcha = async () => {
    try {
      const response = await commonAPICall(
        GENERATE_CAPTCHA,
        {},
        'get',
        dispatch
      );
      setCaptchaImage(response?.data?.captcha || '');
      setStoredCaptchaId(response?.data?.captchaId || '');
    } catch (error) {
      console.log('Captcha error:', error);
    }
  };

  useEffect(() => {
    (async () => {
      await resolveBaseUrl();
      generateCaptcha();
    })();
  }, []);

  // Handle Login
  async function handleLogin(values) {
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched({
        username: true,
        password: true,
        captcha: true,
      });
      return;
    }

    try {
      setLoading(true);

      if (!baseUrlReadyRef.current) {
        await resolveBaseUrl();
      }

      const payload = {
        username: values.username.trim(),
        password: btoa(values.password),
        deptCaptcha: values.captcha.trim(),
        storedCaptchaId: storedCaptchaId,
        latitude: null,
        longitude: null,
        loginSource: 'mobile',
      };

      const response = await commonAPICall(
        LOGIN_END_POINT,
        payload,
        'post',
        dispatch
      );

      if (response.status === 200) {
        const payload = {
          isLoggedIn: true,
          isDefaultPassword: response.data.isDefaultPassword,
          isProfileUpdated: response.data.isProfileUpdated,
          officerName: response.data.officerName,
          mobile: response.data.mobile,
          parents: response.data.parents,
          services: response.data.services,
          roleId: response.data.roleId,
          userId: response.data.userId,
          username: response.data.username,
          token: response.data.token,
          roleName: response.data.roleName,
          photoPath: response.data.photoPath,
          lastLoginTime: response.data.lastLoginTime,
          uuid: response.data.uuid,
          lastLogoutTime: response.data.lastLogoutTime,
          lastFailureAttemptTime: response.data.lastFailureAttemptTime,
          passwordSinceUpdated: response.data.passwordSinceUpdated,
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          loginLocation: response.data.location,
        };

        dispatch(login(payload));

        const currentTime = new Date().getHours();
        let welcomeMsg =
          currentTime >= 5 && currentTime < 12
            ? 'Good morning! Welcome to Haritha Andhra'
            : currentTime >= 12 && currentTime < 18
            ? 'Good afternoon! Welcome to Haritha Andhra'
            : 'Good evening! Welcome to Haritha Andhra';

        showSuccessToast(welcomeMsg);
        navigation.navigate('HOME');
      } else {
        generateCaptcha();
        formik.setFieldValue('captcha', '');
      }
    } catch (error) {
      generateCaptcha();
      if (error.response) {
        setCaptchaImage(error.response?.data?.captcha || '');
        setStoredCaptchaId(error.response?.data?.captchaId || '');
        showErrorToast(
          error.response?.data?.message || 'Please enter valid credentials'
        );
      } else {
        showErrorToast(error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Please contact your administrator');
  };

  const checkapkversion = async () => {
    try {
      if (!baseUrlReadyRef.current) {
        await resolveBaseUrl();
      }

      const res = await commonAPICall(
        CHECKAPKVERSION,
        { platform: 'Android', appVersion: APP_VERSION },
        'post',
        dispatch
      );

      if (res.status === 200 && res.data.updateAvailable) {
        showUpdateAlert();
      }
    } catch (error) {
      console.log('Version check error:', error);
    }
  };

  const showUpdateAlert = () => {
    Alert.alert(
      'Update Available',
      'A new version of the app is available. Please update to continue using the latest features and improvements.',
      [{ text: 'Download APK', onPress: () => Linking.openURL(CUSTOM_APK_URL) }],
      { cancelable: false }
    );
  };

  useFocusEffect(
    useCallback(() => {
      checkapkversion();

      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          resolveBaseUrl().then(() => checkapkversion());
        }
      });

      return () => {
        subscription.remove();
      };
    }, [])
  );

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={require('../../assets/correctharitha.png')}
        style={styles.screen}
        contentFit="contain"
      >
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ marginTop: 480 }}>
              {/* Username */}
              <View style={styles.fieldBlock}>
                <View
                  style={[
                    styles.inputWrapper,
                    formik.touched.username &&
                      formik.errors.username &&
                      styles.inputWrapperError,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#64748b"
                    style={styles.leftIcon}
                  />
                  <TextInput
                    placeholder="Username"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    value={formik.values.username}
                    onChangeText={formik.handleChange('username')}
                    onBlur={formik.handleBlur('username')}
                    maxLength={18}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                {formik.touched.username && formik.errors.username && (
                  <Text style={styles.errorText}>{formik.errors.username}</Text>
                )}
              </View>

              {/* Password */}
              <View style={styles.fieldBlock}>
                <View
                  style={[
                    styles.inputWrapper,
                    formik.touched.password &&
                      formik.errors.password &&
                      styles.inputWrapperError,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#64748b"
                    style={styles.leftIcon}
                  />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    value={formik.values.password}
                    onChangeText={formik.handleChange('password')}
                    onBlur={formik.handleBlur('password')}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={22}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
                {formik.touched.password && formik.errors.password && (
                  <Text style={styles.errorText}>{formik.errors.password}</Text>
                )}
              </View>

              {/* Captcha */}
              <View style={styles.fieldBlock}>
                <View style={styles.captchaRow}>
                  <View
                    style={[
                      styles.captchaInputWrapper,
                      formik.touched.captcha &&
                        formik.errors.captcha &&
                        styles.inputWrapperError,
                    ]}
                  >
                    <TextInput
                      placeholder="Enter Captcha"
                      placeholderTextColor="#94a3b8"
                      style={styles.input}
                      value={formik.values.captcha}
                      onChangeText={formik.handleChange('captcha')}
                      onBlur={formik.handleBlur('captcha')}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <View style={styles.captchaBox}>
                    {captchaImage ? (
                      <Image
                        source={{ uri: captchaImage }}
                        style={styles.captchaImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.captchaPlaceholderText}>Captcha</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={generateCaptcha}
                    style={styles.refreshBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-circle" size={34} color="green" />
                  </TouchableOpacity>
                </View>
                {formik.touched.captcha && formik.errors.captcha && (
                  <Text style={styles.errorText}>{formik.errors.captcha}</Text>
                )}
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  loading && styles.loginButtonDisabled,
                ]}
                onPress={formik.handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.loginText}>SIGN IN</Text>
                <Ionicons
                  name="arrow-forward"
                  size={22}
                  color="#fff"
                  style={{ marginLeft: 10 }}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                marginTop: 20,
                textAlign: 'center',
                color: 'green',
                fontWeight: 'bold',
              }}
            >
              Andhra Pradesh Forest Department
            </Text>
            <Text
              style={{ textAlign: 'center', color: 'green', fontWeight: 'bold' }}
            >
              v 1.0.1
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  flexOne: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  inputWrapper: {
    minHeight: 34,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  captchaInputWrapper: {
    flex: 1.2,
    minHeight: 34,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapperError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  leftIcon: { marginRight: 12 },
  input: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    paddingVertical: 12,
    fontWeight: '500',
  },
  eyeButton: { paddingLeft: 10, paddingVertical: 6 },
  captchaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  captchaBox: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  captchaImage: { width: '100%', height: 42 },
  captchaPlaceholderText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  refreshBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  loginButton: {
    width: '100%',
    height: 46,
    backgroundColor: 'green',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonDisabled: { opacity: 0.7, backgroundColor: '#94a3b8' },
  loginText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  errorText: {
    color: '#ef4444',
    marginTop: 6,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LoginCommon;