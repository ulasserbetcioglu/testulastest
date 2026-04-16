import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, RefreshCw, Check, Maximize, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Blob {
    pixelCount: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    typeId?: string | null;
}

interface Classification {
    id: string;
    name: string;
    min: number;
    max: number;
    color: string;
    visible: boolean;
    count: number;
}

interface FlyAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAnalysisComplete: (results: { total: number; details: Record<string, number> }, imageUrl?: string) => void;
    title?: string;
}

const FlyAnalysisModal: React.FC<FlyAnalysisModalProps> = ({
    isOpen,
    onClose,
    onAnalysisComplete,
    title = "Sinek Analizi"
}) => {
    // State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [threshold, setThreshold] = useState<number>(100);
    const [isProcessing, setIsProcessing] = useState(false);
    const [blobs, setBlobs] = useState<Blob[]>([]);
    const [scale, setScale] = useState(1);
    const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
    const [showResults, setShowResults] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    // Cropping State
    const [isCropping, setIsCropping] = useState(false);
    const [cropStart, setCropStart] = useState<{ x: number, y: number } | null>(null);
    const [cropRect, setCropRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

    const [classifications, setClassifications] = useState<Classification[]>([
        { id: 'fruit_fly', name: 'Meyve Sineği', min: 4, max: 25, color: '#3b82f6', visible: true, count: 0 },
        { id: 'drain_fly', name: 'Gider Sineği', min: 26, max: 60, color: '#8b5cf6', visible: true, count: 0 },
        { id: 'pantry_pest', name: 'Ambar Zararlısı', min: 61, max: 100, color: '#ec4899', visible: true, count: 0 },
        { id: 'house_fly', name: 'Karasinek', min: 101, max: 350, color: '#ef4444', visible: true, count: 0 },
        { id: 'large', name: 'Arı / Diğer', min: 351, max: 8000, color: '#eab308', visible: true, count: 0 }
    ]);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            resetAnalysis();
        }
    }, [isOpen]);

    const resetAnalysis = () => {
        setImageSrc(null);
        setBlobs([]);
        setShowResults(false);
        setTotalCount(0);
        setIsCropping(false);
        setCropRect(null);
        setClassifications(prev => prev.map(c => ({ ...c, count: 0, visible: true })));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
                setImageSrc(event.target.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleImageLoad = () => {
        if (!imgRef.current || !canvasRef.current) return;

        const img = imgRef.current;
        setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });

        // Set canvas dimensions to match image
        canvasRef.current.width = img.naturalWidth;
        canvasRef.current.height = img.naturalHeight;

        // Auto calibrate after small delay
        setTimeout(autoCalibrate, 100);
    };

    const autoCalibrate = () => {
        if (!imgRef.current) return;

        const smallCanvas = document.createElement('canvas');
        const ctx = smallCanvas.getContext('2d');
        if (!ctx) return;

        smallCanvas.width = 100;
        smallCanvas.height = 100;
        ctx.drawImage(imgRef.current, 0, 0, 100, 100);

        const data = ctx.getImageData(0, 0, 100, 100).data;
        let totalBrightness = 0;

        for (let i = 0; i < data.length; i += 4) {
            totalBrightness += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }

        const avgBrightness = totalBrightness / (data.length / 4);
        let optimalThreshold = Math.floor(avgBrightness * 0.60);

        optimalThreshold = Math.max(40, Math.min(180, optimalThreshold));
        setThreshold(optimalThreshold);
        toast.success(`Otomatik kalibrasyon yapıldı: ${optimalThreshold}`);
    };

    // --- CROPPING HANDLERS ---

    const getImgCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        if (!imgRef.current) return { x: 0, y: 0 };
        const rect = imgRef.current.getBoundingClientRect();

        // Handle touch or mouse
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = (clientX - rect.left) * (imgRef.current.naturalWidth / rect.width);
        const y = (clientY - rect.top) * (imgRef.current.naturalHeight / rect.height);

        return { x, y };
    };

    const handleCropMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isCropping) return;
        const { x, y } = getImgCoordinates(e);
        setCropStart({ x, y });
        setCropRect({ x, y, w: 0, h: 0 });
    };

    const handleCropMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isCropping || !cropStart) return;
        const { x, y } = getImgCoordinates(e);
        const w = x - cropStart.x;
        const h = y - cropStart.y;
        setCropRect({
            x: w > 0 ? cropStart.x : x,
            y: h > 0 ? cropStart.y : y,
            w: Math.abs(w),
            h: Math.abs(h)
        });
    };

    const handleCropMouseUp = () => {
        setCropStart(null);
    };

    const applyCrop = () => {
        if (!cropRect || !imgRef.current || cropRect.w < 10 || cropRect.h < 10) {
            toast.error('Lütfen geçerli bir alan seçin.');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = cropRect.w;
        canvas.height = cropRect.h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(
            imgRef.current,
            cropRect.x, cropRect.y, cropRect.w, cropRect.h,
            0, 0, cropRect.w, cropRect.h
        );

        setImageSrc(canvas.toDataURL());
        setIsCropping(false);
        setCropRect(null);
        setBlobs([]);
        setShowResults(false);
        toast.success('Görüntü kırpıldı.');
    };

    const runAnalysis = () => {
        setIsProcessing(true);

        // Use setTimeout to allow UI to update before heavy processing
        setTimeout(() => {
            detectBlobs();
            requestAnimationFrame(() => {
                setIsProcessing(false);
                setShowResults(true);
            });
        }, 50);
    };

    // Flood fill algorithm to detect blobs
    const floodFill = (startX: number, startY: number, w: number, h: number, data: Uint8ClampedArray, visited: Int8Array, thresholdVal: number) => {
        const stack = [startY * w + startX];
        let pixelCount = 0;
        let minX = startX, maxX = startX, minY = startY, maxY = startY;

        while (stack.length > 0) {
            const currentIdx = stack.pop()!;
            if (visited[currentIdx]) continue;
            visited[currentIdx] = 1;

            const cx = currentIdx % w;
            const cy = Math.floor(currentIdx / w);

            pixelCount++;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;

            const neighbors = [
                { x: cx + 1, y: cy }, { x: cx - 1, y: cy },
                { x: cx, y: cy + 1 }, { x: cx, y: cy - 1 }
            ];

            for (let n of neighbors) {
                if (n.x >= 0 && n.x < w && n.y >= 0 && n.y < h) {
                    const nIdx = n.y * w + n.x;
                    if (!visited[nIdx]) {
                        const pos = nIdx * 4;
                        const brightness = 0.299 * data[pos] + 0.587 * data[pos + 1] + 0.114 * data[pos + 2];
                        if (brightness < thresholdVal) {
                            stack.push(nIdx);
                        }
                    }
                }
            }
        }

        if (pixelCount < 4) return null;

        return { pixelCount, minX, maxX, minY, maxY };
    };

    const detectBlobs = () => {
        if (!imgRef.current) return;

        const maxProcWidth = 800;
        const currentScale = Math.min(1, maxProcWidth / imgDimensions.width);
        setScale(currentScale);

        const w = Math.floor(imgDimensions.width * currentScale);
        const h = Math.floor(imgDimensions.height * currentScale);

        const procCanvas = document.createElement('canvas');
        procCanvas.width = w;
        procCanvas.height = h;
        const ctx = procCanvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(imgRef.current, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        const visited = new Int8Array(w * h);
        const newBlobs: Blob[] = [];

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = y * w + x;
                if (visited[idx]) continue;

                const pos = idx * 4;
                const brightness = (0.299 * data[pos] + 0.587 * data[pos + 1] + 0.114 * data[pos + 2]);

                if (brightness < threshold) {
                    const blob = floodFill(x, y, w, h, data, visited, threshold);
                    if (blob) {
                        // Check margins (black borders filter)
                        const margin = 2;
                        if (blob.minX <= margin || blob.minY <= margin || blob.maxX >= w - margin || blob.maxY >= h - margin) {
                            continue;
                        }

                        // Shape analysis (line filter)
                        const blobW = blob.maxX - blob.minX + 1;
                        const blobH = blob.maxY - blob.minY + 1;
                        const ratio = Math.max(blobW, blobH) / Math.min(blobW, blobH);

                        if (ratio > 3.5) {
                            continue;
                        }

                        // Scale back to original dimensions
                        newBlobs.push({
                            pixelCount: blob.pixelCount / (currentScale * currentScale),
                            minX: blob.minX / currentScale,
                            maxX: blob.maxX / currentScale,
                            minY: blob.minY / currentScale,
                            maxY: blob.maxY / currentScale
                        });
                    }
                }
            }
        }

        // Classify
        const tempClassifications = [...classifications].map(c => ({ ...c, count: 0 }));
        const classifiedBlobs = newBlobs.map(blob => {
            const type = tempClassifications.find(c => blob.pixelCount >= c.min && blob.pixelCount <= c.max);
            if (type) {
                type.count++;
                return { ...blob, typeId: type.id };
            }
            return { ...blob, typeId: null };
        });

        setBlobs(classifiedBlobs);
        setClassifications(tempClassifications);

        const total = tempClassifications.filter(c => c.visible).reduce((acc, c) => acc + c.count, 0);
        setTotalCount(total);
    };

    // Draw results whenever blobs or visibility changes
    useEffect(() => {
        if (!canvasRef.current || !imgRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Draw Crop Rect
        if (isCropping && cropRect) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
            ctx.setLineDash([]);

            // Draw corners for better UX
            const s = 20;
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            // TL
            ctx.moveTo(cropRect.x, cropRect.y + s); ctx.lineTo(cropRect.x, cropRect.y); ctx.lineTo(cropRect.x + s, cropRect.y);
            // TR
            ctx.moveTo(cropRect.x + cropRect.w - s, cropRect.y); ctx.lineTo(cropRect.x + cropRect.w, cropRect.y); ctx.lineTo(cropRect.x + cropRect.w, cropRect.y + s);
            // BR
            ctx.moveTo(cropRect.x + cropRect.w, cropRect.y + cropRect.h - s); ctx.lineTo(cropRect.x + cropRect.w, cropRect.y + cropRect.h); ctx.lineTo(cropRect.x + cropRect.w - s, cropRect.y + cropRect.h);
            // BL
            ctx.moveTo(cropRect.x, cropRect.y + cropRect.h - s); ctx.lineTo(cropRect.x, cropRect.y + cropRect.h); ctx.lineTo(cropRect.x + s, cropRect.y + cropRect.h);
            ctx.stroke();
            return;
        }

        // Draw Blobs
        if (blobs.length > 0) {
            blobs.forEach(blob => {
                if (!blob.typeId) return;

                const type = classifications.find(c => c.id === blob.typeId);
                if (type && type.visible) {
                    const width = blob.maxX - blob.minX;
                    const height = blob.maxY - blob.minY;
                    const cx = blob.minX + width / 2;
                    const cy = blob.minY + height / 2;
                    const radius = Math.max(width, height) / 2 + 6;

                    // Professional Marker Style

                    // 1. Semi-transparent fill
                    ctx.fillStyle = type.color + '40'; // ~25% opacity
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
                    ctx.fill();

                    // 2. Solid Border with glow
                    ctx.strokeStyle = type.color;
                    ctx.lineWidth = 2;
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 4;
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.shadowBlur = 0; // Reset shadow

                    // 3. Center dot
                    ctx.fillStyle = type.color;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
                    ctx.fill();
                }
            });
        }
    }, [blobs, classifications, cropRect, isCropping]);

    const toggleClassification = (id: string) => {
        setClassifications(prev => prev.map(c =>
            c.id === id ? { ...c, visible: !c.visible } : c
        ));
    };

    const handleSave = () => {
        // Generate result image URL if needed
        let resultImageUrl = undefined;

        if (canvasRef.current && imgRef.current) {
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = canvasRef.current.width;
            finalCanvas.height = canvasRef.current.height;
            const ctx = finalCanvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(imgRef.current, 0, 0);
                ctx.drawImage(canvasRef.current, 0, 0);

                // Add footer with count
                ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                ctx.fillRect(0, finalCanvas.height - 60, finalCanvas.width, 60);
                ctx.fillStyle = "#000";
                ctx.font = "bold 24px Arial";
                ctx.fillText(`Analiz Sonucu: ${totalCount} Adet`, 20, finalCanvas.height - 25);

                resultImageUrl = finalCanvas.toDataURL('image/jpeg', 0.8);
            }
        }

        const details = classifications.reduce((acc, c) => {
            acc[c.id] = c.count;
            return acc;
        }, {} as Record<string, number>);

        onAnalysisComplete({ total: totalCount, details }, resultImageUrl);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="bg-green-100 p-2 rounded-lg text-green-700">
                            <Maximize size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 space-y-6">

                    {/* 1. Upload Section */}
                    {!imageSrc && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-blue-800">
                                <AlertCircle className="shrink-0" />
                                <div className="text-sm">
                                    <strong>İpucu:</strong> En iyi sonuç için sarı yapışkan levhayı doğrudan karşıdan çekin. Işık yansımalarını önlemeye çalışın.
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-64">
                                <button
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center gap-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl hover:bg-green-50 hover:border-green-400 transition-all group"
                                >
                                    <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                        <Camera size={32} className="text-green-600" />
                                    </div>
                                    <div className="text-center">
                                        <span className="block font-semibold text-gray-700">Fotoğraf Çek</span>
                                        <span className="text-xs text-gray-500">Kamera ile çekim yapın</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center gap-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-all group"
                                >
                                    <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                        <Upload size={32} className="text-blue-600" />
                                    </div>
                                    <div className="text-center">
                                        <span className="block font-semibold text-gray-700">Dosya Yükle</span>
                                        <span className="text-xs text-gray-500">Galeriden seçin</span>
                                    </div>
                                </button>
                            </div>

                            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </div>
                    )}

                    {/* 2. Analysis Interface */}
                    {imageSrc && (
                        <div className="space-y-6">
                            {/* Toolbar */}
                            <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 items-center justify-between">
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button onClick={() => { setImageSrc(null); setShowResults(false); }} className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700">
                                        ← Yeni Fotoğraf
                                    </button>
                                    <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                                        <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Hassasiyet: {threshold}</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="255"
                                            value={threshold}
                                            onChange={(e) => setThreshold(parseInt(e.target.value))}
                                            className="w-full sm:w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {!isCropping ? (
                                    <>
                                        <button onClick={() => setIsCropping(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">
                                            <RefreshCw size={14} className="rotate-90" /> Kırp
                                        </button>
                                        <button onClick={autoCalibrate} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors">
                                            <RefreshCw size={14} /> Otomatik Ayarla
                                        </button>
                                        <button
                                            onClick={runAnalysis}
                                            disabled={isProcessing}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors disabled:opacity-50"
                                        >
                                            {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Maximize size={14} />}
                                            {isProcessing ? 'İşleniyor...' : 'Analiz Et'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => { setIsCropping(false); setCropRect(null); }} className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg">İptal</button>
                                        <button onClick={applyCrop} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg flex items-center gap-1"><Check size={14} /> Kırp ve Uygula</button>
                                    </>
                                )}
                            </div>

                            {/* Preview Area */}
                            <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-900 min-h-[300px] flex items-center justify-center">
                                <div
                                    className="relative inline-block max-w-full touch-none select-none"
                                    onMouseDown={handleCropMouseDown}
                                    onMouseMove={handleCropMouseMove}
                                    onMouseUp={handleCropMouseUp}
                                    onMouseLeave={handleCropMouseUp}
                                    onTouchStart={handleCropMouseDown}
                                    onTouchMove={handleCropMouseMove}
                                    onTouchEnd={handleCropMouseUp}
                                >
                                    <img
                                        ref={imgRef}
                                        src={imageSrc}
                                        alt="Analiz"
                                        className="max-w-full max-h-[60vh] object-contain block opacity-90"
                                        onLoad={handleImageLoad}
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        className="absolute inset-0 w-full h-full pointer-events-none"
                                    />
                                </div>
                            </div>

                            {/* Results Panel */}
                            {showResults && (
                                <div className="animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                                            <h3 className="font-bold text-gray-800">Analiz Sonuçları</h3>
                                            <div className="flex flex-col items-end">
                                                <span className="text-2xl font-black text-green-600 leading-none">{totalCount}</span>
                                                <span className="text-xs font-semibold text-gray-500 uppercase">Toplam</span>
                                            </div>
                                        </div>

                                        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {classifications.map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => toggleClassification(c.id)}
                                                    className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${c.visible ? 'bg-white border-gray-200 hover:border-gray-300' : 'bg-gray-50 border-dashed border-gray-200 opacity-60'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${c.visible ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'}`}>
                                                            {c.visible && <Check size={12} strokeWidth={3} />}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }}></div>
                                                            <span className="text-sm font-medium text-gray-700">{c.name}</span>
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-gray-900">{c.count}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                                            <button onClick={handleSave} className="w-full sm:w-auto bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md hover:bg-green-700 hover:shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2">
                                                <Check size={18} />
                                                Sonucu Kaydet
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default FlyAnalysisModal;
