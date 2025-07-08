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
  return <div>Bienvenue chez Segmentis</div>;
}
