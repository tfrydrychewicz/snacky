import { useCallback, useState } from 'react';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import RNFS from 'react-native-fs';

const MAX_DIMENSION = 1080;
const JPEG_QUALITY = 85;
const MAX_SIZE_BYTES = 500 * 1024; // 500 KB

export type CompressionResult = {
  base64: string;
  uri: string;
  width: number;
  height: number;
  sizeBytes: number;
};

export const useImageCompression = () => {
  const [isCompressing, setIsCompressing] = useState(false);

  const compress = useCallback(async (sourceUri: string): Promise<CompressionResult | null> => {
    setIsCompressing(true);
    try {
      let quality = JPEG_QUALITY;
      let result = await ImageResizer.createResizedImage(
        sourceUri,
        MAX_DIMENSION,
        MAX_DIMENSION,
        'JPEG',
        quality,
        0,
        undefined,
        false,
        { mode: 'contain', onlyScaleDown: true },
      );

      // Re-compress at lower quality if still over 500KB
      let fileInfo = await RNFS.stat(result.uri);
      while (Number(fileInfo.size) > MAX_SIZE_BYTES && quality > 30) {
        quality -= 10;
        result = await ImageResizer.createResizedImage(
          sourceUri,
          MAX_DIMENSION,
          MAX_DIMENSION,
          'JPEG',
          quality,
          0,
          undefined,
          false,
          { mode: 'contain', onlyScaleDown: true },
        );
        fileInfo = await RNFS.stat(result.uri);
      }

      const base64 = await RNFS.readFile(result.uri, 'base64');

      return {
        base64,
        uri: result.uri,
        width: result.width,
        height: result.height,
        sizeBytes: Number(fileInfo.size),
      };
    } catch (err) {
      console.error('Image compression failed:', err);
      return null;
    } finally {
      setIsCompressing(false);
    }
  }, []);

  return { compress, isCompressing };
};
