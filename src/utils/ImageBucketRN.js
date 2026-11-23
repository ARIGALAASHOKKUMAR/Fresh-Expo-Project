
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import axios from "axios";
import * as Location from "expo-location";
import { hideLoader, showLoader } from "../actions";

export const IMG_UPLOAD_URL =
  " https://api.apfd.apcfss.in/socialwelfaredms/user-defined-path/file-upload/bucket/documents.socialwlfare.apcfss.in/";

export const IMG_DOWNLOAD_URL =
  "https://api.apfd.apcfss.in/socialwelfaredms/user-defined-path/file-download/bucket/documents.socialwlfare.apcfss.in/";

const SUPPORTED_FORMATS = [
  "image/jpg",
  "image/jpeg",
  "image/png",
  "application/pdf",
  "text/javascript",
  "video/mp4",
  "application/json",
  "application/vnd.google-earth.kml+xml",
  "image/svg+xml",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "",
];

const MAX_FILE_SIZE = 20971520;

// COMMON AXIOS POST
const CommonAxiosPost = async (url, values) => {
  try {
    const res = await axios({
      url,
      method: "post",
      data: values,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (res.status === 200) {
      return res;
    }

    return null;
  } catch (err) {
    console.log("Upload API error:", err);
    Alert.alert("Error", "Upload failed");
    return null;
  }
};

// FILE VALIDATION
function validateFileTypeAndSize(file, size) {
  const maxSizeMB = size / (1024 * 1024);

  const fileSize = file.size || file.fileSize || 0;
  const fileType = file.mimeType || file.type || "";

  if (fileSize > size) {
    Alert.alert(
      "Error",
      `Please check your file size, it should be less than ${maxSizeMB}MB`
    );
    return false;
  }

  const extension = file.name?.split(".").pop()?.toLowerCase();

  if (
    !SUPPORTED_FORMATS.includes(fileType) &&
    extension !== "geojson"
  ) {
    Alert.alert(
      "Error",
      `Invalid file format. Your file type is ${extension || fileType}`
    );
    return false;
  }

  return true;
}

// GET LOCATION
export const getLocation = async (name, formik) => {
  try {
    let addressText = "";

    const locPermission =
      await Location.requestForegroundPermissionsAsync();

    if (!locPermission.granted) {
      console.log("Location permission denied");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});

    const address = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });

    if (address.length > 0) {
      const place = address[0];

      addressText = [
        place.formattedAddress,
        `Lat:${loc.coords.latitude}`,
        `Lng:${loc.coords.longitude}`,
      ]
        .filter(Boolean)
        .join(" - ");
    }

    if (addressText) {
      formik.setFieldValue(`${name}Location`, addressText);
    }
  } catch (error) {
    console.log("Location error:", error);
  }
};

// DISTANCE FROM CURRENT LOCATION
export const getDistanceFromCurrent = async (pastLat, pastLng) => {
  try {
    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      console.log("Location permission denied");
      return null;
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude } = current.coords;

    const toRad = (value) => (value * Math.PI) / 180;

    const R = 6371;

    const dLat = toRad(pastLat - latitude);
    const dLon = toRad(pastLng - longitude);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(latitude)) *
        Math.cos(toRad(pastLat)) *
        Math.sin(dLon / 2) ** 2;

    const c =
      2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  } catch (error) {
    console.log("Distance error:", error);
    return null;
  }
};

// FILE UPLOAD
async function uploadFile(file, formik, path, name, size, dispatch) {
  if (!validateFileTypeAndSize(file, size)) return;

  dispatch(showLoader("Please Wait"));

  try {
    const formData = new FormData();

    formData.append("file", {
      uri: file.uri,
      name: file.fileName || file.name,
      type: file.mimeType || file.type || "application/octet-stream",
    });

    const response = await CommonAxiosPost(
      IMG_UPLOAD_URL + path,
      formData
    );

    console.log("reee",response);
    

    if (response?.status === 200) {

      const uploadedPath = IMG_DOWNLOAD_URL + response.data;

      formik.setFieldValue(name, uploadedPath);

      Alert.alert("Success", "File Uploaded Successfully");
    } else {
      formik.setFieldValue(name, null);
    }
  } catch (error) {
    console.log("File upload error:", error);

    formik.setFieldValue(name, null);

    Alert.alert(
      "Error",
      "Unfortunately, we encountered an error while uploading"
    );
  } finally {
    dispatch(hideLoader());
  }
}

// CAMERA
async function openCamera(formik, path, name, size, dispatch) {
  let loaderVisible = false;

  try {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Camera access is needed"
      );
      return;
    }

    const locPermission =
      await Location.requestForegroundPermissionsAsync();

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (result.canceled) return;

    const file = result.assets[0];

    dispatch(showLoader("Fetching location..."));
    loaderVisible = true;

    let locationData = null;

    try {
      if (locPermission.granted) {
        const loc = await Location.getCurrentPositionAsync({});

        const address = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (address.length > 0) {
          const place = address[0];

          locationData = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            locationName: [
              place.formattedAddress,
              `Lat:${loc.coords.latitude}`,
              `Lng:${loc.coords.longitude}`,
            ]
              .filter(Boolean)
              .join(" - "),
          };
        }
      }
    } catch (error) {
      console.log("Location error:", error);
    } finally {
      if (loaderVisible) {
        dispatch(hideLoader());
        loaderVisible = false;
      }
    }

    // SET LOCATION FIELDS
    if (locationData) {
      const baseName = name.substring(0, name.lastIndexOf("."));

      if (baseName) {
        formik.setFieldValue(
          `${baseName}.latitude`,
          locationData.latitude
        );

        formik.setFieldValue(
          `${baseName}.longitude`,
          locationData.longitude
        );

        formik.setFieldValue(
          `${baseName}.locationName`,
          locationData.locationName
        );
      }
    }

    await uploadFile(file, formik, path, name, size, dispatch);
  } catch (error) {
    console.log("Camera error:", error);

    Alert.alert("Error", "Something went wrong");
  } finally {
    if (loaderVisible) {
      dispatch(hideLoader());
    }
  }
}

// GALLERY
async function openGallery(formik, path, name, size, dispatch) {
  try {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Gallery access is needed"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.7,
    });

    if (result.canceled) return;

    const file = result.assets[0];

    await uploadFile(file, formik, path, name, size, dispatch);
  } catch (error) {
    console.log("Gallery error:", error);
    Alert.alert("Error", "Something went wrong");
  }
}

// DOCUMENT PICKER
async function pickDocument(formik, path, name, size, dispatch) {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/vnd.google-earth.kml+xml",
        "application/xml",
        "text/xml",
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];

    if (
      file?.name &&
      file.name.toLowerCase().endsWith(".kml")
    ) {
      await uploadFile(file, formik, path, name, size, dispatch);
    } else {
      Alert.alert(
        "Invalid File Type",
        "Please select only KML files (.kml)",
        [{ text: "OK" }]
      );
    }
  } catch (error) {
    console.error("Error picking document:", error);
    Alert.alert("Error", "Failed to pick file");
  }
}

// MAIN FUNCTION
export default async function ImageBucketRN(
  formik,
  path,
  name,
  size = MAX_FILE_SIZE,
  mode = "all",
  dispatch
) {
  try {
    if (mode === "document") {
      return pickDocument(formik, path, name, size, dispatch);
    }

    if (mode === "camera") {
      return openCamera(formik, path, name, size, dispatch);
    }

    if (mode === "gallery") {
      return openGallery(formik, path, name, size, dispatch);
    }

    Alert.alert("Upload", "Choose option", [
      {
        text: "Camera",
        onPress: () =>
          openCamera(formik, path, name, size, dispatch),
      },
      {
        text: "Gallery",
        onPress: () =>
          openGallery(formik, path, name, size, dispatch),
      },
      {
        text: "Files",
        onPress: () =>
          pickDocument(formik, path, name, size, dispatch),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  } catch (error) {
    console.log("ImageBucketRN error:", error);

    dispatch(hideLoader());

    Alert.alert("Error", "Something went wrong");
  }
}
