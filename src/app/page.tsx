'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import VideoCapture from '@/components/VideoCapture';
import { PhysiologicalSignals } from '@/utils/videoProcessor';

interface Measurement {
  timestamp: number;
  heartRate: number | null;
  respiratoryRate: number | null;
}

export default function Home() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fonction pour logger les mesures vers l'API
  const logMeasurement = async (signals: PhysiologicalSignals) => {
    if (signals.heartRate === null && signals.respiratoryRate === null) return;

    try {
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          heartRate: signals.heartRate || 0,
          respiratoryRate: signals.respiratoryRate || 0,
        }),
      });

      if (!response.ok) {
        console.error('Erreur lors du logging des mesures');
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
    }
  };

  // Fonction pour récupérer les mesures depuis l'API
  const fetchMeasurements = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/log');
      if (response.ok) {
        const data = await response.json();
        setMeasurements(data.measurements || []);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des mesures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mettre à jour les mesures locales et les logger
  const handleMeasurementsUpdate = (signals: PhysiologicalSignals) => {
    const newMeasurement: Measurement = {
      timestamp: Date.now(),
      heartRate: signals.heartRate,
      respiratoryRate: signals.respiratoryRate,
    };

    setMeasurements(prev => [...prev, newMeasurement]);
    logMeasurement(signals);
  };

  // Charger les mesures au montage du composant
  useEffect(() => {
    fetchMeasurements();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">PR</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">PulseResp</h1>
                <p className="text-gray-400 text-sm">Surveillance Physiologique en Temps Réel</p>
              </div>
            </div>
            
            <nav className="flex space-x-4">
              <Link 
                href="/"
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Surveillance
              </Link>
              <Link 
                href="/stats"
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Statistiques
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Section de surveillance */}
          <VideoCapture onMeasurementsUpdate={handleMeasurementsUpdate} />
          
          {/* Section des dernières mesures */}
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Dernières Mesures</h2>
              <button
                onClick={fetchMeasurements}
                disabled={isLoading}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors duration-200"
              >
                {isLoading ? 'Chargement...' : 'Actualiser'}
              </button>
            </div>
            
            {measurements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {measurements.slice(-6).reverse().map((measurement, index) => (
                  <div key={index} className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">
                      {new Date(measurement.timestamp).toLocaleString('fr-FR')}
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>HR: {measurement.heartRate || '--'} BPM</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>RR: {measurement.respiratoryRate || '--'} BRPM</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>Aucune mesure disponible. Commencez une session de surveillance.</p>
              </div>
            )}
          </div>

          {/* Section d'informations */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">À propos de PulseResp</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-blue-400 mb-2">Technologie rPPG</h3>
                <p className="text-gray-300 text-sm">
                  PulseResp utilise la technologie rPPG (Remote Photoplethysmography) pour mesurer 
                  la fréquence cardiaque à distance via la caméra. Cette méthode analyse les 
                  variations subtiles de la couleur de la peau causées par le flux sanguin.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-green-400 mb-2">Surveillance Respiratoire</h3>
                <p className="text-gray-300 text-sm">
                  La fréquence respiratoire est détectée en analysant les mouvements subtils 
                  de la poitrine. L&apos;algorithme utilise des techniques de traitement d&apos;image 
                  avancées pour isoler ces mouvements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
