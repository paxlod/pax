export interface SignalMetadata {
  id: string;
  name: string;
  category: 'Golden Record' | 'Pulsar' | 'SETI' | 'Breakthrough Listen' | 'Test' | 'FRB' | 'Solar System' | 'Cosmology' | 'Message' | 'Custom' | 'Unknown' | 'SETI Database' | 'Radio Archives' | 'Hydrogen Radio' | 'MeerKAT Deep Field' | 'Arecibo Legacy' | 'Voyager Interstellar' | 'Cosmic Anomalies' | 'Astro-Linguistics';
  description: string;
  telescope: string;
  frequency: string;
  date: string;
  coordinates: string;
  aiReasoning?: string;
}

export interface Signal {
  metadata: SignalMetadata;
  data: number[];
}

export function generateHydrogenSignal(name: string, frequency: string = '1420.41 MHz'): Signal {
  const data: number[] = [];
  const length = 4096;
  // Gaussian peak for HI line
  for (let i = 0; i < length; i++) {
    const x = (i - length / 2) / (length / 10);
    let val = 0.5 * Math.exp(-x * x); // HI peak
    
    // Add some digital signal spikes (the "stations")
    if (i % 500 < 5) val += 0.8;
    
    val += Math.random() * 0.1; // Noise
    data.push(Math.min(val, 1.0));
  }
  
  return {
    metadata: {
      id: `hi-${name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 5)}`,
      name: `${name} (HI)`,
      category: 'Hydrogen Radio',
      description: 'Neutral hydrogen (HI) 21cm spectral line signal with embedded narrow-band digital carriers.',
      telescope: 'Hydrogen Digital Network',
      frequency: frequency,
      date: new Date().toISOString().split('T')[0],
      coordinates: 'Galactic Plane'
    },
    data
  };
}

// Generate a simple circle image encoded as a 1D signal
function generateCircleImageSignal(width: number, height: number): number[] {
  const data: number[] = [];
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 3;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
      // Add sync pulse at the start of each line
      if (x < 5) {
        data.push(1.0);
      } else if (x < 10) {
        data.push(0.0);
      } else {
        // Image data
        if (Math.abs(dist - r) < 2) {
          data.push(1.0); // Circle outline
        } else if (dist < r) {
          data.push(0.5 + Math.random() * 0.2); // Filled with noise
        } else {
          data.push(0.1 + Math.random() * 0.1); // Background noise
        }
      }
    }
  }
  return data;
}

export function generateGoldenRecordSignal(): Signal {
  return {
    metadata: {
      id: 'gr-01',
      name: 'Voyager Calibration Circle',
      category: 'Golden Record',
      description: 'The first image on the Voyager Golden Record, a simple circle used for calibration to ensure the aspect ratio is correct.',
      telescope: 'Simulated',
      frequency: 'N/A',
      date: '1977',
      coordinates: 'N/A'
    },
    data: generateCircleImageSignal(100, 100)
  };
}

export function generatePulsarSignal(): Signal {
  const data: number[] = [];
  const length = 10000;
  const period = 330; // ~33ms pulsar (Crab)
  
  for (let i = 0; i < length; i++) {
    let val = Math.random() * 0.2; // Noise
    if (i % period < 10) {
      val += 0.8 * Math.exp(-Math.pow((i % period) - 5, 2) / 10); // Pulse
    }
    data.push(val);
  }
  
  return {
    metadata: {
      id: 'psr-crab',
      name: 'Crab Pulsar (PSR B0531+21)',
      category: 'Pulsar',
      description: 'A relatively young neutron star. The star is the central star in the Crab Nebula, a remnant of the supernova SN 1054.',
      telescope: 'Arecibo Observatory',
      frequency: '430 MHz',
      date: '1968',
      coordinates: 'RA 05h 34m 31.94s | Dec +22° 00′ 52.2″'
    },
    data
  };
}

export function generateVelaPulsarSignal(): Signal {
  const data: number[] = [];
  const length = 10000;
  const period = 89; // ~89.3ms pulsar (Vela)
  
  for (let i = 0; i < length; i++) {
    let val = Math.random() * 0.2; // Noise
    if (i % period < 8) {
      val += 0.9 * Math.exp(-Math.pow((i % period) - 4, 2) / 8); // Pulse
    }
    // Minor secondary pulse
    if ((i + 30) % period < 5) {
      val += 0.3 * Math.exp(-Math.pow(((i + 30) % period) - 2, 2) / 10);
    }
    data.push(val);
  }
  
  return {
    metadata: {
      id: 'psr-vela',
      name: 'Vela Pulsar (PSR J0835-4510)',
      category: 'Pulsar',
      description: 'A radio, optical, X-ray, and gamma-emitting pulsar associated with the Vela Supernova Remnant.',
      telescope: 'Parkes Observatory',
      frequency: '1.4 GHz',
      date: '1968',
      coordinates: 'RA 08h 35m 20.61s | Dec -45° 10′ 34.8″'
    },
    data
  };
}

export function generateAstroLinguisticsSignal(): Signal {
  const telemetry = `11FS1I 1E 1H 211F32 1GX 3HG12HHH1GH1G 11G1IHGH3 
11PI1H12G 1IZH G1 H HHGG EQS211 1 11 1QQF1F12FF 
G 2RH1SGS112GQ F11 1H11RPR 1132 1 F111 I21H 1 1 
F1 2 1FF2PHG F2G1 1 Q Q1FGF2G2IGG I2HI121SG1HH R`;

  const mapping: Record<string, number> = {};
  for (let i = 0; i < 10; i++) mapping[i.toString()] = i;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < alphabet.length; i++) mapping[alphabet[i]] = i + 10;

  const data: number[] = [];
  // Calculate raw values matching python script
  for (const char of telemetry) {
    if (mapping[char] !== undefined) {
      data.push(mapping[char] / 35.0); // Normalize to 0-1
    } else if (char === " ") {
      data.push(0);
    }
  }

  return {
    metadata: {
      id: 'astro-ling-11726',
      name: 'Astro-Linguistics Event #11726',
      category: 'Astro-Linguistics',
      description: 'Alphanumeric telemetry string ("11FS1I...") decoded on a 0-35 intensity scale. Reshaping suggests a 4-line raster image with roughly 45 columns.',
      telescope: 'Unknown Transient Detector',
      frequency: 'VLF',
      date: '2026-04-23',
      coordinates: 'N/A'
    },
    data
  };
}

export function generateLGM1PulsarSignal(): Signal {
  const data: number[] = [];
  const length = 10000;
  const period = 1337; // ~1.337s pulsar (LGM-1)
  
  for (let i = 0; i < length; i++) {
    let val = Math.random() * 0.15; // Noise
    if (i % period < 15) {
      val += 0.85 * Math.exp(-Math.pow((i % period) - 7, 2) / 15); // Pulse
    }
    data.push(val);
  }
  
  return {
    metadata: {
      id: 'psr-lgm1',
      name: 'LGM-1 (PSR B1919+21)',
      category: 'Pulsar',
      description: 'The first radio pulsar ever discovered. Initially nicknamed "Little Green Men 1" due to its highly regular 1.337 second period.',
      telescope: 'Mullard Radio Astronomy Observatory',
      frequency: '81.5 MHz',
      date: '1967-11-28',
      coordinates: 'RA 19h 21m 44.81s | Dec +21° 53′ 02.3″'
    },
    data
  };
}

export function generateSHGb0214aSignal(): Signal {
  const data: number[] = [];
  const length = 8000;
  
  for (let i = 0; i < length; i++) {
    const drift = i * 0.00002;
    const isIntermittent = (i % 2000) < 1000; // Signal appears and disappears
    const val = isIntermittent ? 
      0.6 * Math.sin(2 * Math.PI * (0.05 + drift) * i) + Math.random() * 0.4 : 
      Math.random() * 0.3;
    data.push(val);
  }
  
  return {
    metadata: {
      id: 'seti-shgb0214a',
      name: 'SHGb02+14a',
      category: 'SETI',
      description: 'A well-known radio source candidate observed multiple times by the SETI@home project with a rapidly drifting frequency.',
      telescope: 'Arecibo Observatory',
      frequency: '1420 MHz',
      date: '2003-03-01',
      coordinates: 'RA 02h 14m 12s | Dec +14° 03′ 00″'
    },
    data
  };
}

export function generateWhiteNoiseSignal(): Signal {
  const data: number[] = Array.from({ length: 5000 }, () => Math.random());
  
  return {
    metadata: {
      id: 'test-white-noise',
      name: 'Gaussian White Noise Base',
      category: 'Test',
      description: 'A pure white noise signal containing equal intensity at all frequencies, often used to calibrate interference thresholds.',
      telescope: 'Simulated',
      frequency: 'All Bands',
      date: new Date().toISOString().split('T')[0],
      coordinates: 'N/A'
    },
    data
  };
}

export function generateWowSignal(): Signal {
  const data: number[] = [];
  const length = 5000;
  // Wow! signal intensity sequence: 6, E, Q, U, J, 5
  // Mapped to relative intensities: 6, 14, 26, 30, 19, 5
  const intensities = [0.1, 0.2, 0.46, 0.86, 1.0, 0.63, 0.16, 0.1];
  const step = Math.floor(length / intensities.length);
  
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(i / step);
    const intensity = idx < intensities.length ? intensities[idx] : 0.1;
    // Add noise and a slight carrier wave
    const val = intensity * (0.8 + 0.2 * Math.sin(i * 0.5)) + Math.random() * 0.1;
    data.push(val);
  }
  
  return {
    metadata: {
      id: 'seti-wow',
      name: 'Wow! Signal',
      category: 'SETI',
      description: 'A strong narrowband radio signal detected on August 15, 1977, by Ohio State University\'s Big Ear radio telescope.',
      telescope: 'Big Ear',
      frequency: '1420.4556 MHz',
      date: '1977-08-15',
      coordinates: 'RA 19h 22m 24.64s | Dec -27° 03′ 20.4″'
    },
    data
  };
}

export function generateTestChirp(): Signal {
  const data: number[] = [];
  const length = 8000;
  
  for (let i = 0; i < length; i++) {
    // Frequency increases over time
    const freq = 0.01 + (i / length) * 0.1;
    const val = 0.5 * Math.sin(2 * Math.PI * freq * i) + 0.5 + (Math.random() * 0.1 - 0.05);
    data.push(val);
  }
  
  return {
    metadata: {
      id: 'test-chirp',
      name: 'Linear Chirp',
      category: 'Test',
      description: 'A test signal where the frequency increases linearly with time.',
      telescope: 'Simulated',
      frequency: 'Variable',
      date: new Date().toISOString().split('T')[0],
      coordinates: 'N/A'
    },
    data
  };
}

export function generateFRBSignal(): Signal {
  const data: number[] = [];
  const length = 5000;
  
  for (let i = 0; i < length; i++) {
    let val = Math.random() * 0.1; // Background noise
    // Fast radio burst is very short and intense
    if (i > 2000 && i < 2050) {
      val += Math.exp(-Math.pow(i - 2025, 2) / 100) * 1.5;
    }
    // Dispersion measure effect (lower frequencies arrive later)
    // Simulated by a sweeping tail
    if (i >= 2050 && i < 2500) {
      val += Math.exp(-Math.pow(i - 2050, 2) / 10000) * 0.3 * Math.sin(i * 0.1);
    }
    data.push(val);
  }
  
  return {
    metadata: {
      id: 'frb-121102',
      name: 'FRB 121102',
      category: 'FRB',
      description: 'The first repeating Fast Radio Burst discovered. It originates from a dwarf galaxy about 3 billion light-years away.',
      telescope: 'Arecibo Observatory',
      frequency: '1.4 GHz',
      date: '2012-11-02',
      coordinates: 'RA 05h 31m 58.7s | Dec +33° 08′ 52.5″'
    },
    data
  };
}

export function generateAreciboMessage(): Signal {
  const data: number[] = [];
  // The Arecibo message is 1679 bits (73 rows by 23 columns)
  // We'll simulate a simplified version
  const width = 23;
  const height = 73;
  const length = width * height;
  
  for (let i = 0; i < length; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    let bit = 0;
    
    // Numbers 1-10
    if (y < 4) {
      bit = (x % 2 === 0 && x < 20) ? 1 : 0;
    }
    // DNA elements
    else if (y > 10 && y < 15) {
      bit = (x > 5 && x < 18 && (x+y)%3 === 0) ? 1 : 0;
    }
    // Human figure
    else if (y > 30 && y < 45) {
      const hx = x - 11;
      const hy = y - 30;
      if (hy === 0 && Math.abs(hx) < 2) bit = 1; // head
      else if (hy > 0 && hy < 6 && Math.abs(hx) < 3) bit = 1; // torso
      else if (hy >= 6 && hy < 10 && Math.abs(hx) === 2) bit = 1; // legs
      else if (hy > 2 && hy < 8 && Math.abs(hx) === 4) bit = 1; // arms
    }
    // Solar system
    else if (y > 50 && y < 60) {
      if (x === 2 && y === 55) bit = 1; // Sun (big)
      if (x === 2 && y === 54) bit = 1;
      if (x === 3 && y === 54) bit = 1;
      if (x === 3 && y === 55) bit = 1;
      if (x > 5 && x < 15 && y === 55 && x % 2 === 0) bit = 1; // Planets
      if (x === 11 && y === 54) bit = 1; // Earth displaced
    }
    // Arecibo telescope
    else if (y > 62 && y < 70) {
      if (y === 69 && Math.abs(x - 11) < 8) bit = 1; // dish
      if (y < 69 && Math.abs(x - 11) < (69 - y)) bit = 1; // beam
    }
    
    // Add noise and carrier
    const val = bit * 0.8 + Math.random() * 0.2;
    data.push(val);
  }
  
  return {
    metadata: {
      id: 'arecibo-msg',
      name: 'Arecibo Message',
      category: 'Message',
      description: 'A 1974 interstellar radio message carrying basic information about humanity and Earth sent to globular star cluster M13.',
      telescope: 'Arecibo Observatory',
      frequency: '2380 MHz',
      date: '1974-11-16',
      coordinates: 'RA 16h 41m 41.24s | Dec +36° 27′ 35.5″'
    },
    data
  };
}

export function generateBLC1(): Signal {
  const data: number[] = [];
  const length = 6000;
  
  for (let i = 0; i < length; i++) {
    // Narrowband signal with slight drift
    const drift = i * 0.00001;
    const val = 0.6 * Math.sin(2 * Math.PI * (0.1 + drift) * i) + Math.random() * 0.3;
    data.push(val);
  }
  
  return {
    metadata: {
      id: 'blc-1',
      name: 'BLC1 (Proxima Centauri)',
      category: 'Breakthrough Listen',
      description: 'A candidate SETI radio signal detected by the Parkes Observatory, apparently originating from the direction of Proxima Centauri.',
      telescope: 'Parkes Observatory',
      frequency: '982.002 MHz',
      date: '2019-04-29',
      coordinates: 'RA 14h 29m 42.95s | Dec -62° 40′ 46.1″'
    },
    data
  };
}

export function generateSETICandidate(): Signal {
  const data: number[] = [];
  const length = 4000;
  
  for (let i = 0; i < length; i++) {
    // Simulated narrowband signal with frequency modulation
    const baseFreq = 0.05;
    const mod = 0.01 * Math.sin(i * 0.005);
    const val = 0.7 * Math.sin(2 * Math.PI * (baseFreq + mod) * i) + Math.random() * 0.2;
    data.push(val);
  }
  
  return {
    metadata: {
      id: 'seti-cand-01',
      name: 'Candidate Signal S1-402',
      category: 'SETI',
      description: 'A simulated narrowband signal exhibiting frequency modulation, characteristic of a moving source or intentional encoding.',
      telescope: 'Green Bank Telescope',
      frequency: '8.4 GHz',
      date: '2024-11-12',
      coordinates: 'RA 18h 50m | Dec +33° 00′'
    },
    data
  };
}

export function generateJupiterRadio(): Signal {
  const data: number[] = [];
  const length = 8000;
  
  for (let i = 0; i < length; i++) {
    // Jupiter's decametric emissions sound like "L-bursts" (swishing) or "S-bursts" (crackling)
    // We'll simulate S-bursts (short, rapid bursts)
    let val = Math.random() * 0.2;
    if (Math.random() > 0.98) {
      val += Math.random() * 0.8;
    }
    // Add a low frequency modulation for Io's interaction
    val *= 0.5 + 0.5 * Math.sin(i * 0.001);
    data.push(val);
  }
  
  return {
    metadata: {
      id: 'jupiter-dam',
      name: 'Jupiter Decametric Emission',
      category: 'Solar System',
      description: 'Intense radio emissions from Jupiter, strongly influenced by its moon Io moving through its magnetic field.',
      telescope: 'Long Wavelength Array',
      frequency: '20.1 MHz',
      date: 'Variable',
      coordinates: 'Jupiter'
    },
    data
  };
}

export function generateCMB(): Signal {
  const data: number[] = [];
  const length = 10000;
  
  for (let i = 0; i < length; i++) {
    // CMB is essentially uniform thermal noise (black-body radiation at 2.7K)
    // We'll use Gaussian-like noise
    let val = 0;
    for (let j = 0; j < 6; j++) {
      val += Math.random();
    }
    val = (val / 6) * 0.5 + 0.2;
    data.push(val);
  }
  
  return {
    metadata: {
      id: 'cmb-noise',
      name: 'Cosmic Microwave Background',
      category: 'Cosmology',
      description: 'The remnant radiation from the Big Bang, filling the universe. It appears as a uniform background noise in radio telescopes.',
      telescope: 'Penzias & Wilson Horn Antenna',
      frequency: '4080 MHz',
      date: '1964',
      coordinates: 'Omnidirectional'
    },
    data
  };
}

export function generateUnknownAnomalousSignal(): Signal {
  const data: number[] = [];
  const length = 5000;
  
  for (let i = 0; i < length; i++) {
    // A signal that defies standard classification
    // Combines prime-number based pulses with chaotic frequency shifting
    const isPrime = (n: number) => {
      for (let j = 2, s = Math.sqrt(n); j <= s; j++) if (n % j === 0) return false;
      return n > 1;
    };
    
    let val = Math.random() * 0.1;
    
    // Prime-based pulses
    if (isPrime(Math.floor(i / 100) + 2) && i % 100 < 10) {
      val += 0.6;
    }
    
    // Chaotic frequency component
    const chaos = Math.sin(i * 0.01 * Math.sin(i * 0.0001));
    val += 0.3 * chaos;
    
    data.push(Math.max(0, Math.min(1, val)));
  }
  
  return {
    metadata: {
      id: `unk-01-${Math.random().toString(36).substr(2, 5)}`,
      name: 'Anomalous Transient X-7',
      category: 'Unknown',
      description: 'A highly irregular signal that exhibits both structured pulsing and chaotic frequency modulation. It does not match any known natural or human-made source.',
      telescope: 'Deep Space Network',
      frequency: '12.4 GHz',
      date: '2026-03-15',
      coordinates: 'RA 12h 45m | Dec -45° 12′'
    },
    data
  };
}

export function generateUnknownRecursiveSignal(): Signal {
  const data: number[] = [];
  const length = 8000;
  
  for (let i = 0; i < length; i++) {
    // Recursive-like structure (fractal noise)
    let val = 0;
    for (let j = 1; j < 8; j++) {
      val += (1 / j) * Math.sin(i * 0.01 * Math.pow(2, j));
    }
    val = (val / 2) + 0.5 + Math.random() * 0.1;
    data.push(Math.max(0, Math.min(1, val)));
  }
  
  return {
    metadata: {
      id: `unk-02-${Math.random().toString(36).substr(2, 5)}`,
      name: 'Recursive Echo Pattern',
      category: 'Unknown',
      description: 'A signal characterized by self-similar patterns across multiple time scales. Its mathematical structure suggests a non-random origin, yet it lacks a clear carrier wave.',
      telescope: 'FAST Telescope',
      frequency: '1.42 GHz',
      date: '2026-04-01',
      coordinates: 'RA 19h 11m | Dec +15° 08′'
    },
    data
  };
}

function generateRandomSignalForCategory(category: SignalMetadata['category'], index: number): Signal {
  const telescopes = [
    // Major Observatories
    'Green Bank Telescope (GBT)', 'Parkes Observatory', 'Arecibo Observatory', 
    'FAST (Five-hundred-meter Aperture Spherical radio Telescope)', 'Very Large Array (VLA)', 
    'Atacama Large Millimeter Array (ALMA)', 'MeerKAT (South Africa)', 'MeerKAT+ SKA-Mid', 'CHIME', 'Allen Telescope Array (ATA)',
    'LOFAR (Low-Frequency Array)', 'Square Kilometre Array (SKA)', 'Effelsberg 100-m Radio Telescope',
    'Jodrell Bank (Lovell Telescope)', 'Giant Metrewave Radio Telescope (GMRT)',
    
    // Minor / University / Historical Observatories
    'Hat Creek Radio Observatory', 'Owens Valley Radio Observatory (OVRO)', 
    'Murchison Widefield Array (MWA)', 'Australian Square Kilometre Array Pathfinder (ASKAP)',
    'Westerbork Synthesis Radio Telescope (WSRT)', 'Sardinia Radio Telescope (SRT)',
    'Yebes Observatory', 'Onsala Space Observatory', 'Nançay Radio Telescope',
    'Medicina Radio Observatory', 'Noto Radio Observatory', 'Ooty Radio Telescope',
    'Kashima Space Technology Center', 'Usuda Deep Space Center', 'Goldstone Deep Space Communications Complex',
    'Canberra Deep Space Communication Complex', 'Madrid Deep Space Communication Complex',
    'Very Long Baseline Array (VLBA)', 'Event Horizon Telescope (EHT) Network',
    
    // Specialized / New
    '3i ATLAS', 'NexRad Orbital Array', 'Deep Space Gateway LOP-G'
  ];
  const telescope = telescopes[Math.floor(Math.random() * telescopes.length)];
  
  const date = new Date();
  date.setDate(date.getDate() - (index % 5000));
  const dateStr = date.toISOString().split('T')[0];
  
  const data: number[] = [];
  const length = 2000;
  
  const patternType = index % 10; 
  let freqBase = 100 + Math.random() * 10000;
  
  if (patternType === 0) {
    const drift = (Math.random() - 0.5) * 0.0001;
    const baseFreq = 0.02 + Math.random() * 0.1;
    for (let i = 0; i < length; i++) {
      data.push(0.5 * Math.sin(2 * Math.PI * (baseFreq + i * drift) * i) + 0.5 + Math.random() * 0.1);
    }
  } else if (patternType === 1) {
    const period = 100 + Math.floor(Math.random() * 400);
    for (let i = 0; i < length; i++) {
      let val = Math.random() * 0.1;
      if (i % period < 15) val += 0.8 * Math.exp(-Math.pow((i % period) - 7, 2) / 20);
      data.push(val);
    }
  } else if (patternType === 2) {
    const startFreq = 0.01 + Math.random() * 0.05;
    const endFreq = startFreq + 0.05 + Math.random() * 0.1;
    for (let i = 0; i < length; i++) {
      const freq = startFreq + (i / length) * (endFreq - startFreq);
      data.push(0.5 * Math.sin(2 * Math.PI * freq * i) + 0.5 + Math.random() * 0.05);
    }
  } else if (patternType === 3) {
    const f1 = 0.03 + Math.random() * 0.02;
    const f2 = 0.07 + Math.random() * 0.03;
    for (let i = 0; i < length; i++) {
      data.push(0.3 * Math.sin(2 * Math.PI * f1 * i) + 0.3 * Math.sin(2 * Math.PI * f2 * i) + 0.4 + Math.random() * 0.1);
    }
  } else if (patternType === 4) {
    const f1 = 0.04;
    const f2 = 0.08;
    const bitPeriod = 50 + Math.floor(Math.random() * 50);
    for (let i = 0; i < length; i++) {
      const bit = Math.floor(i / bitPeriod) % 2;
      const freq = bit === 0 ? f1 : f2;
      data.push(0.5 * Math.sin(2 * Math.PI * freq * i) + 0.5 + Math.random() * 0.1);
    }
  } else if (patternType === 5) {
    const carrierFreq = 0.1;
    const modFreq = 0.005 + Math.random() * 0.01;
    for (let i = 0; i < length; i++) {
      const modulator = 0.5 + 0.5 * Math.sin(2 * Math.PI * modFreq * i);
      data.push(modulator * Math.sin(2 * Math.PI * carrierFreq * i) * 0.8 + 0.1 + Math.random() * 0.1);
    }
  } else if (patternType === 6) {
    // Multi-phase pulse
    for (let i = 0; i < length; i++) {
       const val = Math.random() > 0.95 ? 0.8 : 0.1;
       data.push(val + Math.random() * 0.1);
    }
  } else if (patternType === 7) {
    // Lorentzian peak
    const peak = 1000 + Math.random() * 500;
    const width = 50 + Math.random() * 100;
    for (let i = 0; i < length; i++) {
       const val = 1 / (1 + Math.pow((i - peak)/width, 2));
       data.push(val + Math.random() * 0.2);
    }
  } else if (patternType === 8) {
    // Frequency comb
    for (let i = 0; i < length; i++) {
       let val = 0;
       for(let j=1; j<5; j++) val += Math.sin(i * 0.05 * j);
       data.push((val / 8) + 0.5 + Math.random() * 0.1);
    }
  } else {
    // Chaotic/Fractal
    let x = 0.1;
    for (let i = 0; i < length; i++) {
       x = 3.9 * x * (1 - x); // Logistic map
       data.push(x + Math.random() * 0.05);
    }
  }

  let descriptionType = '';
  switch (patternType) {
    case 0: descriptionType = 'narrowband drift'; break;
    case 1: descriptionType = 'periodic pulsing'; break;
    case 2: descriptionType = 'frequency chirping'; break;
    case 3: descriptionType = 'multi-tone harmonics'; break;
    case 4: descriptionType = 'frequency shift keying (FSK)'; break;
    case 5: descriptionType = 'amplitude modulation (AM)'; break;
    case 6: descriptionType = 'stochastic bursting'; break;
    case 7: descriptionType = 'Lorentzian emission'; break;
    case 8: descriptionType = 'spectral comb harmonics'; break;
    case 9: descriptionType = 'chaotic non-linear system'; break;
  }

  return {
    metadata: {
      id: `${category.toLowerCase().replace(/\s+/g, '-')}-gen-${index}`,
      name: `${category} Event #${7000 + index}`,
      category,
      description: `A unique ${category.toLowerCase()} event exhibiting ${descriptionType}. Recorded by ${telescope}.`,
      telescope,
      frequency: `${freqBase.toFixed(2)} MHz`,
      date: dateStr,
      coordinates: `RA ${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m | Dec ${Math.floor(Math.random() * 180) - 90}°`
    },
    data
  };
}

let cachedLibrary: Signal[] | null = null;

export function getSignalLibrary(): Signal[] {
  if (!cachedLibrary) {
    const staticSignals = [
      generateAstroLinguisticsSignal(),
      generateGoldenRecordSignal(),
      generateAreciboMessage(),
      generateLGM1PulsarSignal(),
      generatePulsarSignal(),
      generateVelaPulsarSignal(),
      generateWowSignal(),
      generateBLC1(),
      generateSHGb0214aSignal(),
      generateSETICandidate(),
      generateFRBSignal(),
      generateJupiterRadio(),
      generateCMB(),
      generateUnknownAnomalousSignal(),
      generateUnknownRecursiveSignal(),
      generateTestChirp(),
      generateWhiteNoiseSignal(),
      generateHydrogenSignal('Station Omega-7'),
      generateHydrogenSignal('Station Alpha-9'),
      generateHydrogenSignal('Deep Field HI')
    ];
    
    const categories: SignalMetadata['category'][] = [
      'Golden Record', 'Pulsar', 'SETI', 'Breakthrough Listen', 
      'Test', 'FRB', 'Solar System', 'Cosmology', 'Message', 'Unknown', 'SETI Database', 'Radio Archives', 'Hydrogen Radio',
      'MeerKAT Deep Field', 'Arecibo Legacy', 'Voyager Interstellar', 'Cosmic Anomalies', 'Astro-Linguistics'
    ];

    const generatedSignals: Signal[] = [];
    let globalIndex = 0;
    
    // Targeted total count 5000 signals
    // 5000 / 18 categories ~= 277 per category
    const signalsPerCategory = 278;

    for (const category of categories) {
      for (let i = 0; i < signalsPerCategory; i++) {
        generatedSignals.push(generateRandomSignalForCategory(category, globalIndex++));
      }
    }
    
    // Ensure no duplicates by using a Map based on ID
    const uniqueSignalsMap = new Map<string, Signal>();
    [...staticSignals, ...generatedSignals].forEach(sig => {
      uniqueSignalsMap.set(sig.metadata.id, sig);
    });
    
    cachedLibrary = Array.from(uniqueSignalsMap.values()).slice(0, 5000);
  }
  return cachedLibrary;
}

import { useAppStore } from './store';

export function getSignalById(id: string): Signal | undefined {
  const staticSignal = getSignalLibrary().find(s => s.metadata.id === id);
  if (staticSignal) return staticSignal;
  
  const customSignals = useAppStore.getState().customSignals || [];
  return customSignals.find(s => s.metadata.id === id);
}
