'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X, RotateCcw, Check } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export default function WebcamModal({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      setError(null);
      setSnapshot(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 720, height: 720 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Camera unavailable');
      }
    };

    start();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open]);

  const capture = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const size = Math.min(v.videoWidth, v.videoHeight) || 720;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Center-crop square
    const sx = (v.videoWidth - size) / 2;
    const sy = (v.videoHeight - size) / 2;
    ctx.drawImage(v, sx, sy, size, size, 0, 0, size, size);
    setSnapshot(canvas.toDataURL('image/png'));
  };

  const retake = () => setSnapshot(null);

  const usePhoto = () => {
    if (!snapshot) return;
    fetch(snapshot)
      .then((r) => r.blob())
      .then((b) => {
        const file = new File([b], `selfie-${Date.now()}.png`, { type: 'image/png' });
        onCapture(file);
        onClose();
      });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#009E7E]" />
            <h3 className="font-semibold text-[#1a1f2e]">Capture Selfie</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="relative aspect-square bg-gray-900 rounded-2xl overflow-hidden">
            {snapshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={snapshot} alt="Captured selfie" className="w-full h-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-sm p-6 text-center bg-black/70">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 pb-6">
          {!snapshot ? (
            <button
              type="button"
              onClick={capture}
              disabled={!!error}
              className="inline-flex items-center gap-2 bg-[#009E7E] hover:bg-[#007A60] disabled:opacity-50 text-white font-semibold rounded-full px-6 py-2.5"
            >
              <Camera className="w-4 h-4" /> Capture
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={retake}
                className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full px-5 py-2.5 font-semibold"
              >
                <RotateCcw className="w-4 h-4" /> Retake
              </button>
              <button
                type="button"
                onClick={usePhoto}
                className="inline-flex items-center gap-2 bg-[#009E7E] hover:bg-[#007A60] text-white font-semibold rounded-full px-6 py-2.5"
              >
                <Check className="w-4 h-4" /> Use Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
