/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider } from './lib/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AIAssistantWidget } from './components/AIAssistant';

// Lazy load pages
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Explore = lazy(() => import('./pages/Explore').then(m => ({ default: m.Explore })));
const Library = lazy(() => import('./pages/Library').then(m => ({ default: m.Library })));
const Analyzer = lazy(() => import('./pages/Analyzer').then(m => ({ default: m.Analyzer })));
const ImageDecoder = lazy(() => import('./pages/ImageDecoder').then(m => ({ default: m.ImageDecoder })));
const PatternDetector = lazy(() => import('./pages/PatternDetector').then(m => ({ default: m.PatternDetector })));
const Gallery = lazy(() => import('./pages/Gallery').then(m => ({ default: m.Gallery })));
const ResultDetail = lazy(() => import('./pages/ResultDetail').then(m => ({ default: m.ResultDetail })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const AtlasDecoder = lazy(() => import('./pages/AtlasDecoder').then(m => ({ default: m.AtlasDecoder })));
const GoldenDecoder = lazy(() => import('./pages/GoldenDecoder').then(m => ({ default: m.GoldenDecoder })));
const HydrogenRadio = lazy(() => import('./pages/HydrogenRadio').then(m => ({ default: m.HydrogenRadio })));
const AnomalyDetector = lazy(() => import('./pages/AnomalyDetector').then(m => ({ default: m.AnomalyDetector })));
const AiDiscoveries = lazy(() => import('./pages/AiDiscoveries').then(m => ({ default: m.AiDiscoveries })));

const TelemetryDecoder = lazy(() => import('./pages/TelemetryDecoder').then(m => ({ default: m.TelemetryDecoder })));
const SetiTerminal = lazy(() => import('./pages/SetiTerminal').then(m => ({ default: m.SetiTerminal })));
const MultivariatePCA = lazy(() => import('./pages/MultivariatePCA').then(m => ({ default: m.MultivariatePCA })));
const AnomalousTransientDecoder = lazy(() => import('./pages/AnomalousTransientDecoder').then(m => ({ default: m.AnomalousTransientDecoder })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-950 text-emerald-500 font-mono">
    <div className="animate-pulse tracking-widest text-xs uppercase">Initialising Neural Link...</div>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="explore" element={<Explore />} />
                <Route path="ai-discoveries" element={<AiDiscoveries />} />
                <Route path="library" element={<Library />} />
                <Route path="gallery" element={<Gallery />} />
                <Route path="settings" element={<Settings />} />
                <Route path="atlas-decoder" element={<AtlasDecoder />} />
                <Route path="atlas-decoder/:id" element={<AtlasDecoder />} />
                <Route path="hydrogen" element={<HydrogenRadio />} />
                <Route path="anomaly-detector" element={<AnomalyDetector />} />
                <Route path="anomaly-detector/:id" element={<AnomalyDetector />} />
                <Route path="seti-terminal" element={<SetiTerminal />} />
              </Route>
              <Route path="/analyzer/:id" element={<Analyzer />} />
              <Route path="/decoder" element={<ImageDecoder />} />
              <Route path="/decoder/:id" element={<ImageDecoder />} />
              <Route path="/telemetry/:id" element={<TelemetryDecoder />} />
              <Route path="/golden/:id" element={<GoldenDecoder />} />
              <Route path="/interferometry/:id" element={<MultivariatePCA />} />
              <Route path="/anomalous-transient" element={<AnomalousTransientDecoder />} />
              <Route path="/detector/:id" element={<PatternDetector />} />
              <Route path="/result/:id" element={<ResultDetail />} />
            </Routes>
            <AIAssistantWidget />
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
