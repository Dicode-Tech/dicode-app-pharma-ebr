import { useRef, useEffect, useState } from 'react';
import { PenLine, RotateCcw, Check, X } from 'lucide-react';
import { Button } from './ui/Button';

interface SignaturePadProps {
  operatorName: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

export function SignaturePad({ operatorName, onSave, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    setIsEmpty(false);
    lastPos.current = getPos(e, canvas);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }

  function stopDraw() {
    setIsDrawing(false);
    lastPos.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    onSave(canvas.toDataURL('image/png'));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b bg-blue-900 rounded-t-xl">
          <div className="flex items-center gap-2 text-white">
            <PenLine className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Electronic Signature</h2>
          </div>
          <p className="text-blue-200 text-sm mt-1">21 CFR Part 11 Compliant</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>{operatorName}</strong> — by signing, you confirm this step was performed
            in accordance with the GMP procedure and all data recorded is accurate and complete.
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Draw your signature below</p>
            <canvas
              ref={canvasRef}
              width={460}
              height={160}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 cursor-crosshair touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            {isEmpty && (
              <p className="text-center text-gray-400 text-xs mt-1">Use mouse or touch to sign</p>
            )}
          </div>

          <div className="text-xs text-gray-500 text-center">
            Timestamp: {new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'medium' })}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={clear} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button variant="outline" onClick={onCancel} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={save} disabled={isEmpty} className="flex-1">
              <Check className="w-4 h-4 mr-2" />
              Sign & Complete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
