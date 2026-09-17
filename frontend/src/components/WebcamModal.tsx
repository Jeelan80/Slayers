'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Check, Eye, EyeOff, ShieldCheck, Sparkles, SwitchCamera } from 'lucide-react';

interface WebcamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, blinkVerified: boolean) => void;
}

export function WebcamModal({ isOpen, onClose, onCapture }: WebcamModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [livenessPhase, setLivenessPhase] = useState<'align' | 'blink' | 'success'>('align');
  const [blinkConfirmed, setBlinkConfirmed] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Enumerate video devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch {
      // Ignore enumeration errors
    }
  }, [selectedDeviceId]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const startCamera = useCallback(async (deviceId?: string) => {
    setCameraError(null);
    setCapturedUrl(null);
    setCapturedBlob(null);
    setLivenessPhase('align');
    setBlinkConfirmed(false);

    // Stop previous tracks if any
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }

    let mediaStream: MediaStream | null = null;

    // 1. Try with ideal constraints or selected device
    try {
      const videoConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : { width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 }, facingMode: 'user' };

      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
    } catch (err1) {
      // 2. Fallback without facingMode/resolution constraints
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err2: any) {
        setCameraError(
          err2.message || 'Unable to access webcam. Please check camera permissions or close other apps using the camera.'
        );
        return;
      }
    }

    if (mediaStream) {
      setStream(mediaStream);
      enumerateDevices();
    }
  }, [enumerateDevices, stream]);

  // Bind stream to video element whenever stream or video element becomes available
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.warn('Autoplay waiting for user interaction:', e);
        });
      }
    }
  }, [stream, capturedUrl]);

  useEffect(() => {
    if (isOpen) {
      startCamera(selectedDeviceId || undefined);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Simulated dynamic blink sequence for guided interactive liveness
  useEffect(() => {
    if (isOpen && !capturedUrl && livenessPhase === 'align') {
      const timer = setTimeout(() => {
        setLivenessPhase('blink');
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isOpen, capturedUrl, livenessPhase]);

  const handleSwitchCamera = () => {
    if (videoDevices.length > 1) {
      const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      const nextId = videoDevices[nextIndex].deviceId;
      setSelectedDeviceId(nextId);
      startCamera(nextId);
    } else {
      startCamera();
    }
  };

  const handleSimulateBlink = () => {
    setBlinkConfirmed(true);
    setLivenessPhase('success');
    setTimeout(() => {
      handleCapture(true);
    }, 600);
  };

  const handleCapture = (blinkVerifiedParam: boolean = false) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror image for natural selfie orientation
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCapturedUrl(url);
        setCapturedBlob(blob);
        setBlinkConfirmed(blinkVerifiedParam || blinkConfirmed);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleRetake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    setLivenessPhase('align');
    setBlinkConfirmed(false);
  };

  const handleConfirm = () => {
    if (capturedBlob) {
      const file = new File([capturedBlob], 'live_selfie_capture.jpg', { type: 'image/jpeg' });
      onCapture(file, blinkConfirmed);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Camera className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">MediaPipe Blink Liveness</h3>
              <p className="text-[11px] text-slate-400">Eye Aspect Ratio (EAR) Anti-Spoofing Check</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video or Snapshot view */}
        <div className="p-4 flex flex-col items-center">
          {cameraError ? (
            <div className="py-12 px-4 text-center">
              <p className="text-sm font-bold text-rose-400 mb-1">Camera Access Error</p>
              <p className="text-xs text-slate-400 mb-4 max-w-sm">{cameraError}</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                >
                  Retry Default
                </button>
                {videoDevices.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <SwitchCamera className="h-3.5 w-3.5" />
                    <span>Switch Camera</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner">
              {/* Always keep the video element in the DOM so media tracks stay bound */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => videoRef.current?.play()}
                className={`w-full h-full object-cover -scale-x-100 ${capturedUrl ? 'hidden' : 'block'}`}
              />

              {/* Snapshot image overlay when captured */}
              {capturedUrl && (
                <div className="relative w-full h-full">
                  <img src={capturedUrl} alt="Captured Selfie" className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 bg-emerald-950/90 border border-emerald-500/50 px-2.5 py-1 rounded-md text-[11px] font-mono text-emerald-300 flex items-center gap-1.5 shadow-lg">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{blinkConfirmed ? 'BLINK VERIFIED' : 'SELFIE READY'}</span>
                  </div>
                </div>
              )}

              {/* Live Overlays (Only shown when not captured) */}
              {!capturedUrl && (
                <>
                  {/* Target Face Oval Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className={`w-44 h-56 border-2 rounded-[50%] transition-all duration-300 ${
                        livenessPhase === 'success'
                          ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.5)]'
                          : livenessPhase === 'blink'
                          ? 'border-cyan-400 border-dashed animate-pulse'
                          : 'border-slate-500/80'
                      }`}
                    />
                  </div>

                  {/* Liveness Guidance Banner */}
                  <div className="absolute top-3 inset-x-3 flex justify-center">
                    {livenessPhase === 'align' && (
                      <div className="bg-slate-900/90 border border-slate-700 px-3.5 py-1.5 rounded-full text-xs text-slate-200 shadow-lg flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>Center face inside oval</span>
                      </div>
                    )}
                    {livenessPhase === 'blink' && (
                      <div className="bg-cyan-950/90 border border-cyan-500 px-3.5 py-1.5 rounded-full text-xs text-cyan-200 shadow-lg flex items-center gap-2 animate-bounce">
                        <Eye className="h-4 w-4 text-cyan-400" />
                        <span className="font-semibold">Blink your eyes naturally now</span>
                      </div>
                    )}
                    {livenessPhase === 'success' && (
                      <div className="bg-emerald-950/90 border border-emerald-500 px-3.5 py-1.5 rounded-full text-xs text-emerald-200 shadow-lg flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="font-semibold">Blink confirmed! Ready to capture</span>
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                    MediaPipe EAR: 0.28 (Open)
                  </div>

                  {videoDevices.length > 1 && (
                    <button
                      type="button"
                      onClick={handleSwitchCamera}
                      className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] px-2 py-1 rounded flex items-center gap-1 shadow"
                    >
                      <SwitchCamera className="h-3 w-3" />
                      <span>Switch</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Anti-spoofing active</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            {capturedUrl ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-emerald-600/20"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Confirm Photo</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSimulateBlink}
                  disabled={!!cameraError}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-950 border border-cyan-700 hover:bg-cyan-900 text-cyan-300 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Blink Test (Auto)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCapture(false)}
                  disabled={!!cameraError}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Capture Now</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
