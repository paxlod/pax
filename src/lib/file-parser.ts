import { Signal } from './signal-data';

export async function parseSignalFile(file: File): Promise<Signal> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let data: number[] = [];
  const MAX_SAMPLES = 100000;

  if (extension === 'csv' || extension === 'dat' || extension === 'txt') {
    const text = await file.text();
    
    // Check if it's a SETI-style CSV with headers
    // Optimize: Don't split the whole file if it's huge. Just match numbers.
    const isCSV = text.includes(',');
    
    if (isCSV) {
      // Fast path for CSV: find the last number in each line
      let startIndex = 0;
      let lineCount = 0;
      let isFirstLine = true;
      
      while (startIndex < text.length && data.length < MAX_SAMPLES) {
        let endIndex = text.indexOf('\n', startIndex);
        if (endIndex === -1) endIndex = text.length;
        
        const line = text.slice(startIndex, endIndex).trim();
        startIndex = endIndex + 1;
        
        if (!line) continue;
        
        if (isFirstLine) {
          isFirstLine = false;
          // Skip header
          if (/[a-zA-Z]/.test(line) && !/[0-9]/.test(line.split(',')[0])) {
            continue;
          }
        }
        
        const parts = line.split(/[,\t\s]+/);
        const val = Number(parts[parts.length - 1]);
        if (!isNaN(val)) {
          data.push(val);
        }
        
        lineCount++;
      }
    } else {
      // Fast path for space-separated or single column
      const regex = /-?\d+(\.\d+)?([eE][+-]?\d+)?/g;
      let match;
      while ((match = regex.exec(text)) !== null && data.length < MAX_SAMPLES) {
        const val = Number(match[0]);
        if (!isNaN(val)) {
          data.push(val);
        }
      }
    }
  } else if (extension === 'wav' || extension === 'mp3' || extension === 'ogg') {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    
    // Downsample if too large (e.g., max 100,000 samples)
    if (channelData.length > MAX_SAMPLES) {
      const step = Math.ceil(channelData.length / MAX_SAMPLES);
      for (let i = 0; i < channelData.length; i += step) {
        data.push(channelData[i]);
      }
    } else {
      data = Array.from(channelData);
    }
  } else {
    throw new Error('Unsupported file format. Please upload a .csv, .dat, .txt, or audio file (.wav, .mp3).');
  }

  if (data.length === 0) {
    throw new Error('No valid signal data found in the file.');
  }

  // Normalize data to 0-1 range for consistency with our other signals
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  
  if (max === min) {
    max = min + 1;
  }
  const normalizedData = data.map(v => (v - min) / (max - min));

  return {
    metadata: {
      id: `custom-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      category: 'Custom',
      description: `Imported from ${file.name}`,
      telescope: 'Local Import',
      frequency: 'Unknown',
      date: new Date().toISOString().split('T')[0],
      coordinates: 'N/A'
    },
    data: normalizedData
  };
}
