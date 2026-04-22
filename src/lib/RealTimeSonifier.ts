export class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private analyzerNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;

  public initialize() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyzerNode = this.audioCtx.createAnalyser();
      this.analyzerNode.fftSize = 2048;
      
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 1.0;

      this.analyzerNode.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);
    }
  }

  public playSignal(signalData: number[], sampleRate: number = 44100, playbackRate: number = 1.0) {
    this.initialize();
    if (!this.audioCtx || !this.analyzerNode) return;

    this.stop(); // Stop any currently playing signal

    // Create an AudioBuffer matching the signal length
    const buffer = this.audioCtx.createBuffer(1, signalData.length, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Normalize and map signal data into the audio buffer (-1.0 to 1.0)
    let maxVal = 0;
    for (let i = 0; i < signalData.length; i++) {
      if (Math.abs(signalData[i]) > maxVal) maxVal = Math.abs(signalData[i]);
    }
    
    for (let i = 0; i < signalData.length; i++) {
      channelData[i] = maxVal > 0 ? signalData[i] / maxVal : 0; 
    }
    
    this.sourceNode = this.audioCtx.createBufferSource();
    this.sourceNode.buffer = buffer;
    this.sourceNode.playbackRate.value = playbackRate;
    
    this.sourceNode.connect(this.analyzerNode);
    this.sourceNode.start();
  }

  public setVolume(volume: number) {
    if (this.gainNode && this.audioCtx) {
      // Smoothly transition volume to avoid popping
      this.gainNode.gain.setTargetAtTime(volume, this.audioCtx.currentTime, 0.05);
    }
  }

  public setPlaybackRate(rate: number) {
    if (this.sourceNode && this.audioCtx) {
      this.sourceNode.playbackRate.setValueAtTime(rate, this.audioCtx.currentTime);
    }
  }

  public stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {
        // Ignore errors if node is already stopped
      }
      this.sourceNode = null;
    }
  }

  public getRealTimeFrequencyData(): Uint8Array | null {
    if (!this.analyzerNode) return null;
    const dataArray = new Uint8Array(this.analyzerNode.frequencyBinCount);
    this.analyzerNode.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

// Export a singleton instance for global app use
export const sonifier = new AudioEngine();
