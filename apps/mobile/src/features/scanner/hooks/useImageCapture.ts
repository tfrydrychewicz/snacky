import { useCallback, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { Camera, type PhotoFile } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';

export type CapturedImage = {
  uri: string;
  width: number;
  height: number;
};

export const useImageCapture = () => {
  const cameraRef = useRef<Camera>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    const status = await Camera.requestCameraPermission();
    if (status === 'granted') return true;

    Alert.alert(
      'Camera Permission Required',
      'Snacky needs camera access to scan your meals. Please enable it in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ],
    );
    return false;
  }, []);

  const capturePhoto = useCallback(async (): Promise<CapturedImage | null> => {
    if (!cameraRef.current) return null;

    setIsCapturing(true);
    try {
      const photo: PhotoFile = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: true,
      });

      const uri = Platform.OS === 'android' ? `file://${photo.path}` : photo.path;
      const result: CapturedImage = {
        uri,
        width: photo.width,
        height: photo.height,
      };
      setPhotoUri(uri);
      return result;
    } catch (err) {
      console.error('Failed to capture photo:', err);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const pickFromGallery = useCallback(async (): Promise<CapturedImage | null> => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 1,
        maxWidth: 2048,
        maxHeight: 2048,
      });

      const assets = result.assets;
      if (result.didCancel || !assets?.length) return null;

      const asset = assets[0];
      if (!asset?.uri) return null;

      const image: CapturedImage = {
        uri: asset.uri,
        width: asset.width ?? 1080,
        height: asset.height ?? 1080,
      };
      setPhotoUri(asset.uri);
      return image;
    } catch (err) {
      console.error('Failed to pick image:', err);
      return null;
    }
  }, []);

  return {
    cameraRef,
    photoUri,
    isCapturing,
    capturePhoto,
    pickFromGallery,
    requestCameraPermission,
    setPhotoUri,
  };
};
