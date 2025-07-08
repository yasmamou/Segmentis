export interface VideoFrame {
  data: ImageData;
  timestamp: number;
}

export interface PhysiologicalSignals {
  heartRate: number | null;
  respiratoryRate: number | null;
}

export class VideoProcessor {
  private heartRateBuffer: number[] = [];
  private respiratoryRateBuffer: number[] = [];
  private frameCount = 0;
  private lastHeartRateUpdate = 0;
  private lastRespiratoryRateUpdate = 0;
  private readonly BUFFER_SIZE = 150; // 5 secondes à 30 FPS
  private readonly UPDATE_INTERVAL = 5000; // 5 secondes

  constructor() {
    this.heartRateBuffer = [];
    this.respiratoryRateBuffer = [];
  }

  // Traitement d'une frame vidéo
  processFrame(frame: VideoFrame): PhysiologicalSignals | null {
    this.frameCount++;
    
    // Extraire les données de l'image
    const { data } = frame.data;
    const width = frame.data.width;
    const height = frame.data.height;

    // Calculer la moyenne du canal vert pour rPPG
    const greenChannelAverage = this.calculateGreenChannelAverage(data, width, height);
    this.heartRateBuffer.push(greenChannelAverage);

    // Calculer la variance du mouvement pour la fréquence respiratoire
    const motionVariance = this.calculateMotionVariance(data, width, height);
    this.respiratoryRateBuffer.push(motionVariance);

    // Maintenir la taille du buffer
    if (this.heartRateBuffer.length > this.BUFFER_SIZE) {
      this.heartRateBuffer.shift();
    }
    if (this.respiratoryRateBuffer.length > this.BUFFER_SIZE) {
      this.respiratoryRateBuffer.shift();
    }

    // Mettre à jour les mesures toutes les 5 secondes
    const now = Date.now();
    if (now - this.lastHeartRateUpdate >= this.UPDATE_INTERVAL) {
      this.lastHeartRateUpdate = now;
      return this.calculatePhysiologicalSignals();
    }

    return null;
  }

  // Calculer la moyenne du canal vert pour rPPG
  private calculateGreenChannelAverage(data: Uint8ClampedArray, width: number, height: number): number {
    let greenSum = 0;
    let pixelCount = 0;

    // Échantillonner seulement une région centrale pour améliorer les performances
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const sampleSize = Math.min(width, height) / 4;

    for (let y = centerY - sampleSize; y < centerY + sampleSize; y++) {
      for (let x = centerX - sampleSize; x < centerX + sampleSize; x++) {
        if (y >= 0 && y < height && x >= 0 && x < width) {
          const index = (y * width + x) * 4;
          greenSum += data[index + 1]; // Canal vert
          pixelCount++;
        }
      }
    }

    return pixelCount > 0 ? greenSum / pixelCount : 0;
  }

  // Calculer la variance du mouvement pour la fréquence respiratoire
  private calculateMotionVariance(data: Uint8ClampedArray, width: number, height: number): number {
    let variance = 0;
    let mean = 0;
    let pixelCount = 0;

    // Échantillonner la région de la poitrine (partie inférieure de l'image)
    const chestRegionY = Math.floor(height * 0.6);
    const chestRegionHeight = Math.floor(height * 0.3);

    for (let y = chestRegionY; y < chestRegionY + chestRegionHeight; y++) {
      for (let x = 0; x < width; x += 4) { // Échantillonner tous les 4 pixels pour les performances
        if (y < height && x < width) {
          const index = (y * width + x) * 4;
          const intensity = (data[index] + data[index + 1] + data[index + 2]) / 3;
          mean += intensity;
          pixelCount++;
        }
      }
    }

    if (pixelCount === 0) return 0;
    mean /= pixelCount;

    // Calculer la variance
    for (let y = chestRegionY; y < chestRegionY + chestRegionHeight; y++) {
      for (let x = 0; x < width; x += 4) {
        if (y < height && x < width) {
          const index = (y * width + x) * 4;
          const intensity = (data[index] + data[index + 1] + data[index + 2]) / 3;
          variance += Math.pow(intensity - mean, 2);
        }
      }
    }

    return pixelCount > 0 ? variance / pixelCount : 0;
  }

  // Calculer les signaux physiologiques à partir des buffers
  private calculatePhysiologicalSignals(): PhysiologicalSignals {
    const heartRate = this.extractHeartRate();
    const respiratoryRate = this.extractRespiratoryRate();

    return {
      heartRate,
      respiratoryRate,
    };
  }

  // Extraire la fréquence cardiaque via FFT sur le signal rPPG
  private extractHeartRate(): number | null {
    if (this.heartRateBuffer.length < 30) return null;

    // Appliquer un filtre passe-bande pour les fréquences cardiaques (0.8-3 Hz)
    const filteredSignal = this.bandpassFilter(this.heartRateBuffer, 0.8, 3, 30);
    
    // Calculer la FFT et trouver la fréquence dominante
    const dominantFreq = this.findDominantFrequency(filteredSignal, 30);
    
    if (dominantFreq && dominantFreq > 0.8 && dominantFreq < 3) {
      return Math.round(dominantFreq * 60); // Convertir en BPM
    }

    return null;
  }

  // Extraire la fréquence respiratoire via FFT sur le signal de mouvement
  private extractRespiratoryRate(): number | null {
    if (this.respiratoryRateBuffer.length < 30) return null;

    // Appliquer un filtre passe-bande pour les fréquences respiratoires (0.1-0.5 Hz)
    const filteredSignal = this.bandpassFilter(this.respiratoryRateBuffer, 0.1, 0.5, 30);
    
    // Calculer la FFT et trouver la fréquence dominante
    const dominantFreq = this.findDominantFrequency(filteredSignal, 30);
    
    if (dominantFreq && dominantFreq > 0.1 && dominantFreq < 0.5) {
      return Math.round(dominantFreq * 60); // Convertir en BRPM
    }

    return null;
  }

  // Filtre passe-bande simple
  private bandpassFilter(signal: number[], lowFreq: number, highFreq: number, sampleRate: number): number[] {
    const filtered = [];
    const lowCutoff = lowFreq / (sampleRate / 2);
    const highCutoff = highFreq / (sampleRate / 2);

    for (let i = 0; i < signal.length; i++) {
      let sum = 0;
      for (let j = 0; j < signal.length; j++) {
        const freq = j / signal.length;
        if (freq >= lowCutoff && freq <= highCutoff) {
          sum += signal[j] * Math.cos(2 * Math.PI * freq * (i - j));
        }
      }
      filtered.push(sum);
    }

    return filtered;
  }

  // Trouver la fréquence dominante via FFT simple
  private findDominantFrequency(signal: number[], sampleRate: number): number | null {
    if (signal.length === 0) return null;

    // FFT simple pour trouver la fréquence dominante
    const fft = this.simpleFFT(signal);
    const frequencies = [];
    
    for (let i = 0; i < fft.length / 2; i++) {
      frequencies.push(i * sampleRate / fft.length);
    }

    // Trouver l'index de la magnitude maximale
    let maxIndex = 0;
    let maxMagnitude = 0;

    for (let i = 1; i < fft.length / 2; i++) {
      const magnitude = Math.sqrt(fft[i].real * fft[i].real + fft[i].imag * fft[i].imag);
      if (magnitude > maxMagnitude) {
        maxMagnitude = magnitude;
        maxIndex = i;
      }
    }

    return frequencies[maxIndex];
  }

  // FFT simple
  private simpleFFT(signal: number[]): Array<{ real: number; imag: number }> {
    const N = signal.length;
    const fft: Array<{ real: number; imag: number }> = [];

    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;

      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N;
        real += signal[n] * Math.cos(angle);
        imag += signal[n] * Math.sin(angle);
      }

      fft.push({ real, imag });
    }

    return fft;
  }

  // Réinitialiser les buffers
  reset(): void {
    this.heartRateBuffer = [];
    this.respiratoryRateBuffer = [];
    this.frameCount = 0;
    this.lastHeartRateUpdate = 0;
    this.lastRespiratoryRateUpdate = 0;
  }
} 