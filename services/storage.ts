
import { ref, uploadBytes, getDownloadURL, UploadMetadata } from "firebase/storage";
import { getStorageInstance } from "./firebase";

/**
 * Generates a unique filename to prevent overwrites.
 * Format: timestamp_sanitized-original-name
 */
const generateUniqueName = (originalName: string): string => {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  const sanitized = originalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${timestamp}_${sanitized}.${extension}`;
};

/**
 * Standardized File Upload Service
 * @param file The file object to upload
 * @param path The folder path (e.g., 'obras/123/capa') - DO NOT include the filename here
 * @param metadata Optional metadata (uploader info, etc.)
 * @returns Promise<string> The download URL
 */
export const uploadFile = async (
  file: File, 
  folderPath: string, 
  customMetadata?: Record<string, string>
): Promise<string> => {
  const storage = getStorageInstance();
  if (!storage) throw new Error("Serviço de armazenamento indisponível (Modo Offline).");

  // Generate strict unique path
  const fileName = generateUniqueName(file.name);
  const fullPath = `${folderPath.replace(/\/$/, '')}/${fileName}`; // Ensure no double slashes
  
  const storageRef = ref(storage, fullPath);

  // Standard Metadata
  const metadata: UploadMetadata = {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      ...customMetadata
    }
  };

  try {
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error: any) {
    console.error(`Upload failed for path: ${fullPath}`, error);
    throw new Error(`Falha no upload: ${error.message}`);
  }
};
