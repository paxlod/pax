// src/services/detectionService.ts

interface DetectionResponse {
  status: string;
  message: string;
  result_id?: string;
  file?: string;
  error?: string;
}

interface DetectionStatusResponse {
  result_id: string;
  status: string;
  filename: string;
  result?: {
    message?: string;
    error?: string;
    output_path?: string;
  };
}

interface DetectionConfig {
  model_path?: string;
  output_path?: string;
  iou_threshold?: number;
  overlap_threshold?: number;
  box_fill_percent_threshold?: number;
  projection_percent_threshold?: number;
  time_window_size?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Check if the detection service is available and healthy
 */
export const checkDetectionHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Detection service health check failed:', error);
    return false;
  }
};

/**
 * Submit signal data file for detection
 * @param file - FITS or FIL file to process
 * @returns Detection response with result_id for tracking
 */
export const submitSignalData = async (file: File): Promise<DetectionResponse> => {
  if (!file) {
    throw new Error('No file provided');
  }

  const validExtensions = ['.fits', '.fil'];
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  
  if (!validExtensions.includes(fileExt)) {
    throw new Error(`Invalid file type. Expected .fits or .fil, got ${fileExt}`);
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/detect`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json() as DetectionResponse;

    if (!response.ok) {
      throw new Error(data.error || `Detection failed: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('Signal detection error:', error);
    throw error;
  }
};

/**
 * Get the status of a detection job
 * @param resultId - The result ID returned from submitSignalData
 * @returns Current status and results of the detection
 */
export const getDetectionStatus = async (resultId: string): Promise<DetectionStatusResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/detect/status/${resultId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to get detection status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching detection status:', error);
    throw error;
  }
};

/**
 * Update detection configuration parameters
 * @param config - Configuration parameters to update
 */
export const updateDetectionConfig = async (config: DetectionConfig): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/detect/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Failed to update config: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating detection config:', error);
    throw error;
  }
};

/**
 * Poll for detection completion
 * @param resultId - The result ID to poll
 * @param maxAttempts - Maximum number of attempts (default: 300 = 5 minutes at 1s intervals)
 * @param interval - Polling interval in milliseconds (default: 1000)
 */
export const pollDetectionCompletion = async (
  resultId: string,
  maxAttempts = 300,
  interval = 1000
): Promise<DetectionStatusResponse> => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const status = await getDetectionStatus(resultId);
      
      if (status.status === 'completed' || status.status === 'error') {
        return status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, interval));
      attempts++;
    } catch (error) {
      console.error('Error during polling:', error);
      throw error;
    }
  }

  throw new Error('Detection polling timeout');
};
