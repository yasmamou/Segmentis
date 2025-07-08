'use client';

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface Measurement {
  timestamp: number;
  heartRate: number;
  respiratoryRate: number;
}

interface StatsDashboardProps {
  measurements: Measurement[];
}

export default function StatsDashboard({ measurements }: StatsDashboardProps) {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    if (measurements.length === 0) {
      setChartData(null);
      return;
    }

    // Préparer les données pour Chart.js
    const heartRateData = measurements.map(m => ({
      x: new Date(m.timestamp),
      y: m.heartRate
    }));

    const respiratoryRateData = measurements.map(m => ({
      x: new Date(m.timestamp),
      y: m.respiratoryRate
    }));

    const data = {
      datasets: [
        {
          label: 'Fréquence Cardiaque (BPM)',
          data: heartRateData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: 'rgb(255, 99, 132)',
          tension: 0.1,
        },
        {
          label: 'Fréquence Respiratoire (BRPM)',
          data: respiratoryRateData,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: 'rgb(54, 162, 235)',
          tension: 0.1,
        },
      ],
    };

    setChartData(data);
  }, [measurements]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'white',
          font: {
            size: 14,
          },
        },
      },
              title: {
          display: true,
          text: 'Évolution des Signaux Physiologiques',
          color: 'white',
          font: {
            size: 18,
            weight: 'bold' as const,
          },
        },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        callbacks: {
          title: function(context: any) {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleString('fr-FR');
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'minute' as const,
          displayFormats: {
            minute: 'HH:mm:ss',
          },
        },
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        beginAtZero: false,
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  // Calculer les statistiques
  const calculateStats = () => {
    if (measurements.length === 0) return null;

    const heartRates = measurements.map(m => m.heartRate).filter(hr => hr !== null);
    const respiratoryRates = measurements.map(m => m.respiratoryRate).filter(rr => rr !== null);

    const avgHeartRate = heartRates.length > 0 
      ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length)
      : 0;
    
    const avgRespiratoryRate = respiratoryRates.length > 0
      ? Math.round(respiratoryRates.reduce((a, b) => a + b, 0) / respiratoryRates.length)
      : 0;

    const minHeartRate = heartRates.length > 0 ? Math.min(...heartRates) : 0;
    const maxHeartRate = heartRates.length > 0 ? Math.max(...heartRates) : 0;
    const minRespiratoryRate = respiratoryRates.length > 0 ? Math.min(...respiratoryRates) : 0;
    const maxRespiratoryRate = respiratoryRates.length > 0 ? Math.max(...respiratoryRates) : 0;

    return {
      avgHeartRate,
      avgRespiratoryRate,
      minHeartRate,
      maxHeartRate,
      minRespiratoryRate,
      maxRespiratoryRate,
      totalMeasurements: measurements.length,
      duration: measurements.length > 1 
        ? Math.round((measurements[measurements.length - 1].timestamp - measurements[0].timestamp) / 1000 / 60)
        : 0,
    };
  };

  const stats = calculateStats();

  return (
    <div className="flex flex-col space-y-6 p-6 bg-gray-900 rounded-lg">
      <h2 className="text-2xl font-bold text-white">Tableau de Bord - Statistiques</h2>
      
      {/* Statistiques résumées */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-red-600 p-4 rounded-lg text-white">
            <h3 className="text-sm font-semibold opacity-80">Fréquence Cardiaque Moyenne</h3>
            <p className="text-2xl font-bold">{stats.avgHeartRate} BPM</p>
            <p className="text-xs opacity-80">
              Min: {stats.minHeartRate} | Max: {stats.maxHeartRate}
            </p>
          </div>
          
          <div className="bg-blue-600 p-4 rounded-lg text-white">
            <h3 className="text-sm font-semibold opacity-80">Fréquence Respiratoire Moyenne</h3>
            <p className="text-2xl font-bold">{stats.avgRespiratoryRate} BRPM</p>
            <p className="text-xs opacity-80">
              Min: {stats.minRespiratoryRate} | Max: {stats.maxRespiratoryRate}
            </p>
          </div>
          
          <div className="bg-green-600 p-4 rounded-lg text-white">
            <h3 className="text-sm font-semibold opacity-80">Mesures Totales</h3>
            <p className="text-2xl font-bold">{stats.totalMeasurements}</p>
            <p className="text-xs opacity-80">Points de données</p>
          </div>
          
          <div className="bg-purple-600 p-4 rounded-lg text-white">
            <h3 className="text-sm font-semibold opacity-80">Durée de Session</h3>
            <p className="text-2xl font-bold">{stats.duration} min</p>
            <p className="text-xs opacity-80">Temps total</p>
          </div>
        </div>
      )}

      {/* Graphique */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="h-96">
          {chartData ? (
            <Line data={chartData} options={options} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Aucune donnée disponible. Commencez une session de surveillance pour voir les graphiques.</p>
            </div>
          )}
        </div>
      </div>

      {/* Liste des dernières mesures */}
      {measurements.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Dernières Mesures</h3>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-300 border-b border-gray-600">
                  <th className="text-left py-2">Heure</th>
                  <th className="text-left py-2">Fréquence Cardiaque</th>
                  <th className="text-left py-2">Fréquence Respiratoire</th>
                </tr>
              </thead>
              <tbody>
                {measurements.slice(-10).reverse().map((measurement, index) => (
                  <tr key={index} className="border-b border-gray-700 text-gray-300">
                    <td className="py-2">
                      {new Date(measurement.timestamp).toLocaleTimeString('fr-FR')}
                    </td>
                    <td className="py-2 text-red-400">
                      {measurement.heartRate} BPM
                    </td>
                    <td className="py-2 text-blue-400">
                      {measurement.respiratoryRate} BRPM
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 