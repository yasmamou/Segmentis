'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StatsDashboard from '@/components/StatsDashboard';

interface Measurement {
  timestamp: number;
  heartRate: number;
  respiratoryRate: number;
}

export default function StatsPage() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour récupérer les mesures depuis l'API
  const fetchMeasurements = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/log');
      if (response.ok) {
        const data = await response.json();
        setMeasurements(data.measurements || []);
      } else {
        setError('Erreur lors de la récupération des données');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des mesures:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
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
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Surveillance
              </Link>
              <Link 
                href="/stats"
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Statistiques
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* En-tête de la page */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold">Tableau de Bord</h2>
              <p className="text-gray-400 mt-2">
                Analyse détaillée de vos signaux physiologiques
              </p>
            </div>
            <button
              onClick={fetchMeasurements}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <svg 
                className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              <span>{isLoading ? 'Actualisation...' : 'Actualiser'}</span>
            </button>
          </div>

          {/* Messages d'état */}
          {error && (
            <div className="bg-red-500 text-white p-4 rounded-lg">
              <p className="font-semibold">Erreur:</p>
              <p>{error}</p>
            </div>
          )}

          {isLoading && measurements.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Chargement des données...</p>
              </div>
            </div>
          ) : measurements.length === 0 ? (
            <div className="bg-gray-900 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Aucune donnée disponible</h3>
              <p className="text-gray-400 mb-6">
                Commencez une session de surveillance pour voir vos statistiques.
              </p>
              <Link 
                href="/"
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors duration-200 inline-block"
              >
                Commencer la surveillance
              </Link>
            </div>
          ) : (
            <StatsDashboard measurements={measurements} />
          )}

          {/* Section d'export */}
          {measurements.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Export des Données</h3>
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    const csvContent = [
                      'Timestamp,Heart Rate (BPM),Respiratory Rate (BRPM)',
                      ...measurements.map(m => 
                        `${new Date(m.timestamp).toISOString()},${m.heartRate},${m.respiratoryRate}`
                      )
                    ].join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `pulseresp-data-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Exporter CSV</span>
                </button>
                
                <button
                  onClick={() => {
                    const jsonContent = JSON.stringify(measurements, null, 2);
                    const blob = new Blob([jsonContent], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `pulseresp-data-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Exporter JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 