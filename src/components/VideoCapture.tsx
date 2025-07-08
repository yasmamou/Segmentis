'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VideoProcessor, VideoFrame, PhysiologicalSignals } from '@/utils/videoProcessor';

interface VideoCaptureProps {
  onMeasurementsUpdate: (measurements: PhysiologicalSignals) => void;
}

export default function VideoCapture({ onMeasurementsUpdate }: VideoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
  const [currentRespiratoryRate, setCurrentRespiratoryRate] = useState<number | null>(null);

  const videoProcessor = useRef(new VideoProcessor());

  // Demander l'accès à la caméra
  const requestCameraPermission = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Caméra frontale
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setHasPermission(true);
    } catch (err) {
      console.error('Erreur d\'accès à la caméra:', err);
      setError('Impossible d\'accéder à la caméra. Veuillez autoriser l\'accès.');
      setHasPermission(false);
    }
  }, []);

  // Traitement des frames vidéo
  const processVideoFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isRecording) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    // Ajuster la taille du canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dessiner la frame vidéo sur le canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Extraire les données de l'image
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const frame: VideoFrame = {
      data: imageData,
      timestamp: Date.now()
    };

    // Traiter la frame
    const signals = videoProcessor.current.processFrame(frame);
    
    if (signals) {
      setCurrentHeartRate(signals.heartRate);
      setCurrentRespiratoryRate(signals.respiratoryRate);
      onMeasurementsUpdate(signals);
    }

    // Continuer le traitement
    animationFrameRef.current = requestAnimationFrame(processVideoFrame);
  }, [isRecording, onMeasurementsUpdate]);

  // Démarrer l'enregistrement
  const startRecording = useCallback(() => {
    if (!hasPermission) {
      requestCameraPermission();
      return;
    }

    setIsRecording(true);
    videoProcessor.current.reset();
    setCurrentHeartRate(null);
    setCurrentRespiratoryRate(null);
    
    // Démarrer le traitement des frames
    animationFrameRef.current = requestAnimationFrame(processVideoFrame);
  }, [hasPermission, requestCameraPermission, processVideoFrame]);

  // Arrêter l'enregistrement
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Nettoyer les ressources
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-6 p-6 bg-gray-900 rounded-lg">
      <h2 className="text-2xl font-bold text-white">PulseResp - Surveillance Physiologique</h2>
      
      {/* Zone de vidéo */}
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full max-w-2xl h-auto rounded-lg border-4 border-gray-700"
          autoPlay
          playsInline
          muted
        />
        
        {/* Canvas overlay pour le traitement */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ opacity: 0 }}
        />
        
        {/* Indicateurs de mesure */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
          <div className="text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span>HR: {currentHeartRate ? `${currentHeartRate} bpm` : '--'}</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span>RR: {currentRespiratoryRate ? `${currentRespiratoryRate} brpm` : '--'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages d'état */}
      {error && (
        <div className="bg-red-500 text-white p-4 rounded-lg max-w-2xl">
          <p className="font-semibold">Erreur:</p>
          <p>{error}</p>
        </div>
      )}

      {hasPermission === false && !error && (
        <div className="bg-yellow-500 text-black p-4 rounded-lg max-w-2xl">
          <p className="font-semibold">Accès à la caméra requis</p>
          <p>Veuillez autoriser l'accès à votre caméra pour commencer la surveillance.</p>
        </div>
      )}

      {/* Contrôles */}
      <div className="flex space-x-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <div className="w-4 h-4 bg-white rounded-full"></div>
            <span>Démarrer la surveillance</span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <div className="w-4 h-4 bg-white rounded"></div>
            <span>Arrêter la surveillance</span>
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 text-gray-300 p-4 rounded-lg max-w-2xl text-sm">
        <h3 className="font-semibold text-white mb-2">Instructions:</h3>
        <ul className="space-y-1">
          <li>• Placez-vous face à la caméra à environ 30-50 cm de distance</li>
          <li>• Assurez-vous que votre visage et votre poitrine sont visibles</li>
          <li>• Restez immobile pendant la mesure pour de meilleurs résultats</li>
          <li>• Les mesures sont mises à jour toutes les 5 secondes</li>
        </ul>
      </div>
    </div>
  );
} 