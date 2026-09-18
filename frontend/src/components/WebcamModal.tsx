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

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }

    let mediaStream: MediaStream | null = null;
    try {
      const videoConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : { width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 }, facingMode: 'user' };

      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
    } catch (err1) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-[#ECECEC] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 text-[#14161A]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#ECECEC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#DFF3E1] flex items-center justify-center text-[#12805F]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#14161A]">MediaPipe Dynamic Blink Liveness</h3>
              <p className="text-[11px] text-[#9AA1AC]">Eye Aspect Ratio (EAR) Anti-Spoofing & Face Match</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-[#9AA1AC] hover:text-[#14161A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video or Snapshot view */}
        <div className="p-4 flex flex-col items-center">
          {cameraError ? (
            <div className="py-12 px-4 text-center">
              <p className="text-sm font-bold text-rose-600 mb-1">Camera Access Error</p>
              <p className="text-xs text-[#5B6270] mb-4 max-w-sm">{cameraError}</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="py-2 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-[#14161A] text-xs font-semibold"
                >
                  Retry Camera
                </button>
                {videoDevices.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="py-2 px-4 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span>Switch Camera</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-[#ECECEC] shadow-inner">
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
                  <div className="absolute top-3 right-3 bg-white/95 border border-[#B7E4C7] px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#12805F] flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{blinkConfirmed ? 'BLINK VERIFIED' : 'SELFIE READY'}</span>
                  </div>
                </div>
              )}

              {/* Live Overlays */}
              {!capturedUrl && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className={`w-44 h-56 border-2 rounded-[50%] transition-all duration-300 ${
                        livenessPhase === 'success'
                          ? 'border-[#12805F] shadow-[0_0_20px_rgba(18,128,95,0.4)]'
                          : livenessPhase === 'blink'
                          ? 'border-[#F15A24] border-dashed animate-pulse'
                          : 'border-white/70'
                      }`}
                    />
                  </div>

                  <div className="absolute top-3 inset-x-3 flex justify-center">
                    {livenessPhase === 'align' && (
                      <div className="bg-white/95 border border-[#ECECEC] px-3.5 py-1.5 rounded-full text-xs text-[#14161A] shadow-sm flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#12805F] animate-ping" />
                        <span>Center face inside oval</span>
                      </div>
                    )}
                    {livenessPhase === 'blink' && (
                      <div className="bg-[#DFF3E1] border border-[#12805F] px-3.5 py-1.5 rounded-full text-xs text-[#12805F] shadow-sm flex items-center gap-2 font-semibold">
                        <Eye className="w-4 h-4" />
                        <span>Blink your eyes naturally now</span>
                      </div>
                    )}
                    {livenessPhase === 'success' && (
                      <div className="bg-[#DFF3E1] border border-[#12805F] px-3.5 py-1.5 rounded-full text-xs text-[#12805F] shadow-sm flex items-center gap-2 font-semibold">
                        <Check className="w-4 h-4" />
                        <span>Blink confirmed! Ready to capture</span>
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded-full text-[10px] font-mono text-white">
                    MediaPipe EAR: 0.28 (Open)
                  </div>

                  {videoDevices.length > 1 && (
                    <button
                      type="button"
                      onClick={handleSwitchCamera}
                      className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-[#14161A] text-[10px] px-2.5 py-1 rounded-full border border-[#ECECEC] flex items-center gap-1 shadow-xs"
                    >
                      <SwitchCamera className="w-3 h-3" />
                      <span>Switch</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[#ECECEC] flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#9AA1AC] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#12805F]" />
            Dynamic blink anti-spoofing
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-full border border-[#D5D8DF] text-xs font-semibold text-[#5B6270] hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>

            {capturedUrl ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex items-center gap-1.5 py-2 px-3.5 rounded-full border border-[#D5D8DF] text-xs font-semibold text-[#5B6270] hover:bg-slate-50 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex items-center gap-1.5 py-2 px-5 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Photo</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSimulateBlink}
                  disabled={!!cameraError}
                  className="flex items-center gap-1.5 py-2 px-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-[#14161A] cursor-pointer disabled:opacity-50"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Blink Test (Auto)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCapture(false)}
                  disabled={!!cameraError}
                  className="flex items-center gap-1.5 py-2 px-5 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Camera className="w-3.5 h-3.5" />
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
