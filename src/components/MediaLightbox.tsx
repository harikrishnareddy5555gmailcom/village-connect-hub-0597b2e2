import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Play } from 'lucide-react';

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface MediaLightboxProps {
  items: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

const MediaLightbox: React.FC<MediaLightboxProps> = ({ items, initialIndex = 0, onClose }) => {
  const [idx, setIdx] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const current = items[idx];

  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const prev = useCallback(() => { reset(); setIdx(i => (i - 1 + items.length) % items.length); }, [items.length]);
  const next = useCallback(() => { reset(); setIdx(i => (i + 1) % items.length); }, [items.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 4));
      if (e.key === '-') setZoom(z => Math.max(z - 0.5, 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  useEffect(() => { reset(); setIdx(initialIndex); }, [initialIndex]);

  // Wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(Math.max(z - e.deltaY * 0.001, 1), 4));
  };

  // Drag pan
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) { setIsPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };
  const onMouseUp = () => setIsPanning(false);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
      style={{ touchAction: 'none' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 bg-black/60">
        <span className="text-white/60 text-sm">{idx + 1} / {items.length}</span>
        <div className="flex items-center gap-2">
          {current?.type === 'image' && (
            <>
              <button
                onClick={() => setZoom(z => Math.max(z - 0.5, 1))}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Zoom out"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-white/50 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(z + 0.5, 4))}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Zoom in"
              >
                <ZoomIn size={18} />
              </button>
              {zoom > 1 && (
                <button
                  onClick={reset}
                  className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Reset zoom"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </>
          )}
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-2"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Main viewer */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        onWheel={current?.type === 'image' ? onWheel : undefined}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
      >
        {current?.type === 'image' ? (
          <img
            src={current.url}
            alt=""
            draggable={false}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transition: isPanning ? 'none' : 'transform 0.15s ease',
              userSelect: 'none',
            }}
          />
        ) : (
          <video
            src={current?.url}
            controls
            autoPlay
            playsInline
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12 }}
          />
        )}

        {/* Nav arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="flex-shrink-0 flex gap-1.5 px-4 py-3 overflow-x-auto bg-black/60 justify-center">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { reset(); setIdx(i); }}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                i === idx ? 'border-white scale-110' : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
            >
              {item.type === 'image' ? (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                  <Play size={14} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaLightbox;
