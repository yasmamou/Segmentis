"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { VideoProcessor, VideoFrame, PhysiologicalSignals } from "@/utils/videoProcessor";
import * as faceapi from "face-api.js";

interface VideoCaptureProps {
  onMeasurementsUpdate: (measurements: PhysiologicalSignals) => void;
}

const FACE_MODEL_URL = "/models";
const INITIAL_COLLECTION_SECONDS = 5;
const SESSION_SECONDS = 30;

function VideoCapture({ onMeasurementsUpdate }: VideoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const faceDetectionInterval = useRef<NodeJS.Timeout | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
  const [currentRespiratoryRate, setCurrentRespiratoryRate] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [firstValueReceived, setFirstValueReceived] = useState(false);
  const [countdown, setCountdown] = useState(INITIAL_COLLECTION_SECONDS);
  const [sessionTime, setSessionTime] = useState(0);
  const [faceBox, setFaceBox] = useState<faceapi.Box | null>(null);
  const [faceOk, setFaceOk] = useState(false);
  const [trunkBox, setTrunkBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [instruction, setInstruction] = useState<string>("");

  const videoProcessor = useRef(new VideoProcessor());

  // Charger les modèles face-api.js au montage
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL);
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_MODEL_URL);
    };
    loadModels();
  }, []);

  // Demander l'accès à la caméra
  const requestCameraPermission = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setHasPermission(true);
    } catch (err) {
      setError("Impossible d'accéder à la caméra. Veuillez autoriser l'accès.");
      setHasPermission(false);
    }
  }, []);

  // Détection du visage et dessin de la bounding box
  const detectFaceAndDraw = useCallback(async () => {
    if (!videoRef.current || !overlayRef.current) return;
    const video = videoRef.current;
    const overlay = overlayRef.current;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Détection du visage
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }));
    if (detection) {
      const box = detection.box;
      setFaceBox(box);
      // Critère de "bonne position" : visage centré et assez grand
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const isCentered =
        centerX > overlay.width * 0.3 &&
        centerX < overlay.width * 0.7 &&
        centerY > overlay.height * 0.2 &&
        centerY < overlay.height * 0.6;
      const isBigEnough = box.width > overlay.width * 0.2 && box.height > overlay.height * 0.2;
      setFaceOk(isCentered && isBigEnough);
      setInstruction(isCentered && isBigEnough ? "Visage bien positionné !" : "Placez votre visage dans le carré");
      // Dessiner la bounding box visage
      ctx.strokeStyle = isCentered && isBigEnough ? "#22c55e" : "#ef4444";
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      // Dessiner la zone du tronc (sous le visage)
      const trunkY = box.y + box.height + 10;
      const trunkHeight = Math.min(overlay.height - trunkY - 10, box.height * 1.2);
      const trunk = {
        x: Math.max(box.x - box.width * 0.2, 0),
        y: trunkY,
        width: Math.min(box.width * 1.4, overlay.width - box.x),
        height: trunkHeight,
      };
      setTrunkBox(trunk);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.strokeRect(trunk.x, trunk.y, trunk.width, trunk.height);
    } else {
      setFaceBox(null);
      setFaceOk(false);
      setInstruction("Aucun visage détecté. Placez-vous face à la caméra.");
    }
  }, []);

  // Boucle de détection du visage (toutes les 300ms)
  useEffect(() => {
    if (isRecording) {
      faceDetectionInterval.current = setInterval(detectFaceAndDraw, 300);
    } else {
      if (faceDetectionInterval.current) clearInterval(faceDetectionInterval.current);
    }
    return () => {
      if (faceDetectionInterval.current) clearInterval(faceDetectionInterval.current);
    };
  }, [isRecording, detectFaceAndDraw]);

  // Traitement des frames vidéo pour rPPG/respiration
  const processVideoFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isRecording || !faceOk || !faceBox) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // On ne traite que la région du visage pour le rPPG
    ctx.drawImage(video, faceBox.x, faceBox.y, faceBox.width, faceBox.height, 0, 0, faceBox.width, faceBox.height);
    const imageData = ctx.getImageData(0, 0, faceBox.width, faceBox.height);
    const frame: VideoFrame = {
      data: imageData,
      timestamp: Date.now(),
    };
    const signals = videoProcessor.current.processFrame(frame);
    if (signals) {
      setCurrentHeartRate(signals.heartRate);
      setCurrentRespiratoryRate(signals.respiratoryRate);
      onMeasurementsUpdate(signals);
      if (!firstValueReceived && (signals.heartRate || signals.respiratoryRate)) {
        setFirstValueReceived(true);
      }
    }
    animationFrameRef.current = requestAnimationFrame(processVideoFrame);
  }, [isRecording, onMeasurementsUpdate, firstValueReceived, faceOk, faceBox]);

  // Compte à rebours et timer de session
  useEffect(() => {
    let countdownTimer: NodeJS.Timeout;
    let sessionTimer: NodeJS.Timeout;
    if (isRecording) {
      setCountdown(INITIAL_COLLECTION_SECONDS);
      setSessionTime(0);
      countdownTimer = setInterval(() => {
        setCountdown((prev) => {
          if (prev > 1) return prev - 1;
          clearInterval(countdownTimer);
          return 0;
        });
      }, 1000);
      sessionTimer = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      clearInterval(countdownTimer);
      clearInterval(sessionTimer);
    };
  }, [isRecording]);

  // Démarrer l'enregistrement
  const startRecording = useCallback(() => {
    if (!hasPermission) {
      requestCameraPermission();
      return;
    }
    setIsRecording(true);
    setIsAnalyzing(true);
    setFirstValueReceived(false);
    videoProcessor.current.reset();
    setCurrentHeartRate(null);
    setCurrentRespiratoryRate(null);
    setCountdown(INITIAL_COLLECTION_SECONDS);
    setSessionTime(0);
    animationFrameRef.current = requestAnimationFrame(processVideoFrame);
  }, [hasPermission, requestCameraPermission, processVideoFrame]);

  // Arrêter l'enregistrement
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setIsAnalyzing(false);
    setFirstValueReceived(false);
    setCountdown(INITIAL_COLLECTION_SECONDS);
    setSessionTime(0);
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
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (faceDetectionInterval.current) clearInterval(faceDetectionInterval.current);
    };
  }, []);

  // Affichage dynamique des valeurs ou du loader
  const renderValue = (value: number | null, label: string) => {
    if (!isRecording) return "--";
    if (!firstValueReceived) return (
      <span className="flex items-center space-x-2">
        <span className="animate-spin inline-block w-3 h-3 border-2 border-t-2 border-t-transparent border-white rounded-full mr-1"></span>
        <span>Calcul...</span>
      </span>
    );
    if (value === null) return "--";
    return `${value} ${label}`;
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-6 bg-gray-900 rounded-lg">
      <h2 className="text-2xl font-bold text-white">PulseResp - Surveillance Physiologique</h2>
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full max-w-2xl h-auto rounded-lg border-4 border-gray-700"
          autoPlay
          playsInline
          muted
        />
        {/* Canvas pour le traitement rPPG (invisible) */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ opacity: 0 }}
        />
        {/* Overlay pour bounding box visage/tronc */}
        <canvas
          ref={overlayRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
        {/* Indicateurs de mesure */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-3 rounded-lg min-w-[120px]">
          <div className="text-sm">
            <div className="flex items-center space-x-2">
              {isRecording && !firstValueReceived ? (
                <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
              ) : (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
              <span>HR: {renderValue(currentHeartRate, "bpm")}</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              {isRecording && !firstValueReceived ? (
                <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
              ) : (
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              )}
              <span>RR: {renderValue(currentRespiratoryRate, "brpm")}</span>
            </div>
          </div>
        </div>
        {/* Compte à rebours et instructions */}
        {isRecording && countdown > 0 && (
          <div className="absolute top-4 right-4 bg-gray-800 text-yellow-300 p-3 rounded-lg flex flex-col items-end">
            <span className="font-bold text-lg">Collecte initiale : {countdown}s</span>
            <span className="text-xs mt-1">{instruction}</span>
          </div>
        )}
        {isRecording && countdown === 0 && (
          <div className="absolute top-4 right-4 bg-gray-800 text-green-300 p-3 rounded-lg flex flex-col items-end">
            <span className="font-bold text-lg">Session : {sessionTime}s / {SESSION_SECONDS}s</span>
            <span className="text-xs mt-1">{instruction}</span>
          </div>
        )}
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
      {/* Feedback d'analyse en cours */}
      {isRecording && !firstValueReceived && (
        <div className="flex items-center space-x-2 bg-gray-800 text-orange-300 p-3 rounded-lg mt-2">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-t-2 border-t-transparent border-orange-400 rounded-full"></span>
          <span>Analyse en cours... (collecte des données initiales)</span>
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
          <li>• Alignez votre visage dans le carré vert</li>
          <li>• Assurez-vous que votre poitrine est visible dans la zone bleue</li>
          <li>• Restez immobile pendant la mesure pour de meilleurs résultats</li>
          <li>• Les mesures sont mises à jour toutes les 5 secondes</li>
        </ul>
      </div>
    </div>
  );
}

export default VideoCapture; 
