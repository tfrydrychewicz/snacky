const JPEG_MAGIC = '/9j/';
const PNG_MAGIC = 'iVBORw0KGgo';
const MAX_BASE64_LENGTH = 4 * 1024 * 1024; // ~3 MB decoded
const MIN_BASE64_LENGTH = 1_000; // reject trivially small payloads
const MAX_IMAGE_COUNT = 5;

export interface ImageValidationResult {
  valid: boolean;
  format: 'jpeg' | 'png' | 'unknown';
  estimatedSizeBytes: number;
  error?: string;
}

export function validateImage(base64: string): ImageValidationResult {
  const raw = stripDataUri(base64);
  const estimatedSizeBytes = Math.floor(raw.length * 0.75);

  let format: 'jpeg' | 'png' | 'unknown' = 'unknown';
  if (raw.startsWith(JPEG_MAGIC)) format = 'jpeg';
  else if (raw.startsWith(PNG_MAGIC)) format = 'png';

  if (format === 'unknown') {
    return {
      valid: false,
      format,
      estimatedSizeBytes,
      error: 'Unsupported image format. Only JPEG and PNG are accepted.',
    };
  }

  if (raw.length > MAX_BASE64_LENGTH) {
    return {
      valid: false,
      format,
      estimatedSizeBytes,
      error: `Image too large (${(estimatedSizeBytes / 1024 / 1024).toFixed(1)} MB). Maximum is 3 MB.`,
    };
  }

  if (raw.length < MIN_BASE64_LENGTH) {
    return {
      valid: false,
      format,
      estimatedSizeBytes,
      error: 'Image too small or corrupt.',
    };
  }

  if (!/^[A-Za-z0-9+/]+=*$/.test(raw)) {
    return {
      valid: false,
      format,
      estimatedSizeBytes,
      error: 'Invalid base64 encoding. Image data appears corrupted.',
    };
  }

  return { valid: true, format, estimatedSizeBytes };
}

export interface MultiImageValidationResult {
  valid: boolean;
  results: ImageValidationResult[];
  error?: string;
}

export function validateImages(base64Images: string[]): MultiImageValidationResult {
  if (base64Images.length === 0) {
    return { valid: false, results: [], error: 'At least one image is required.' };
  }

  if (base64Images.length > MAX_IMAGE_COUNT) {
    return {
      valid: false,
      results: [],
      error: `Too many images (${base64Images.length}). Maximum is ${MAX_IMAGE_COUNT}.`,
    };
  }

  const results: ImageValidationResult[] = [];
  for (let i = 0; i < base64Images.length; i++) {
    const result = validateImage(base64Images[i]);
    if (!result.valid) {
      return {
        valid: false,
        results,
        error: `Image ${i + 1}: ${result.error}`,
      };
    }
    results.push(result);
  }

  return { valid: true, results };
}

export function stripDataUri(base64: string): string {
  return base64.replace(/^data:image\/\w+;base64,/, '');
}

export function detectMimeType(base64: string): string {
  const raw = stripDataUri(base64);
  if (raw.startsWith(JPEG_MAGIC)) return 'image/jpeg';
  if (raw.startsWith(PNG_MAGIC)) return 'image/png';
  return 'image/jpeg';
}
