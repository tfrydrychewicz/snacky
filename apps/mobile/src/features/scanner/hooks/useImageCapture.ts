import { useCallback, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { Camera, type PhotoFile } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';

export type CapturedImage = {
  uri: string;
  width: number;
  height: number;
};

const MAX_PHOTOS = 5;

export const useImageCapture = () => {
  const cameraRef = useRef<Camera>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedImage[]>([]);
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
    if (capturedPhotos.length >= MAX_PHOTOS) return null;

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
      setCapturedPhotos((prev) => [...prev, result]);
      return result;
    } catch (err) {
      console.error('Failed to capture photo:', err);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [capturedPhotos.length]);

  const pickFromGallery = useCallback(async (): Promise<CapturedImage[]> => {
    try {
      const remaining = MAX_PHOTOS - capturedPhotos.length;
      if (remaining <= 0) return [];

      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: remaining,
        quality: 1,
        maxWidth: 2048,
        maxHeight: 2048,
      });

      const assets = result.assets;
      if (result.didCancel || !assets?.length) return [];

      const images: CapturedImage[] = assets
        .filter((a) => a.uri != null)
        .map((a) => ({
          uri: a.uri!,
          width: a.width ?? 1080,
          height: a.height ?? 1080,
        }));

      setCapturedPhotos((prev) => [...prev, ...images].slice(0, MAX_PHOTOS));
      return images;
    } catch (err) {
      console.error('Failed to pick images:', err);
      return [];
    }
  }, [capturedPhotos.length]);

  const removePhoto = useCallback((index: number) => {
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearPhotos = useCallback(() => {
    setCapturedPhotos([]);
  }, []);

  return {
    cameraRef,
    capturedPhotos,
    isCapturing,
    canAddMore: capturedPhotos.length < MAX_PHOTOS,
    maxPhotos: MAX_PHOTOS,
    capturePhoto,
    pickFromGallery,
    removePhoto,
    clearPhotos,
    requestCameraPermission,
    setCapturedPhotos,
  };
};
