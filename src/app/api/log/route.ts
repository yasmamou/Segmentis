import { NextRequest, NextResponse } from 'next/server';

// Stockage en mémoire pour les mesures
let measurements: Array<{
  timestamp: number;
  heartRate: number;
  respiratoryRate: number;
}> = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { heartRate, respiratoryRate } = body;

    if (typeof heartRate !== 'number' || typeof respiratoryRate !== 'number') {
      return NextResponse.json(
        { error: 'Les valeurs de fréquence cardiaque et respiratoire doivent être des nombres' },
        { status: 400 }
      );
    }

    const measurement = {
      timestamp: Date.now(),
      heartRate,
      respiratoryRate,
    };

    measurements.push(measurement);

    // Garder seulement les 1000 dernières mesures pour éviter la surcharge mémoire
    if (measurements.length > 1000) {
      measurements = measurements.slice(-1000);
    }

    return NextResponse.json({ success: true, measurement });
  } catch (error) {
    console.error('Erreur lors du logging des mesures:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({ measurements });
  } catch (error) {
    console.error('Erreur lors de la récupération des mesures:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 