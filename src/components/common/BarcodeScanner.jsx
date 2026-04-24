import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { X, Camera, CameraOff, Keyboard } from "lucide-react";
import "./BarcodeScanner.css";

/**
 * Props:
 *   onScan(value: string) — called once when a barcode is decoded
 *   onClose()             — called when user dismisses
 *   title                 — optional modal title
 */
export default function BarcodeScanner({ onScan, onClose, title = "Scan Barcode" }) {
  const videoRef  = useRef(null);
  const readerRef = useRef(null);

  const [cameras,     setCameras]     = useState([]);
  const [camIdx,      setCamIdx]      = useState(0);
  const [error,       setError]       = useState("");
  const [flash,       setFlash]       = useState(false);
  const [manual,      setManual]      = useState("");
  const [showManual,  setShowManual]  = useState(false);

  // List cameras using native MediaDevices API
  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((devs) => {
        const vids = devs.filter((d) => d.kind === "videoinput");
        setCameras(vids);
        // prefer rear camera on mobile
        const backIdx = vids.findIndex((d) => /back|rear|environment/i.test(d.label));
        if (backIdx >= 0) setCamIdx(backIdx);
      })
      .catch(() => setError("Cannot access camera devices."));
  }, []);

  // Start scanner whenever camera index changes
  useEffect(() => {
    if (!videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    setError("");

    const deviceId = cameras[camIdx]?.deviceId ?? undefined;

    reader
      .decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
        if (result) {
          setFlash(true);
          setTimeout(() => setFlash(false), 350);
          reader.reset();
          onScan(result.getText());
        }
        if (err && !(err instanceof NotFoundException)) {
          console.warn("ZXing:", err);
        }
      })
      .catch((e) => {
        setError(e?.message || "Camera error — try manual entry below.");
      });

    return () => {
      try { reader.reset(); } catch (_) {}
    };
  }, [camIdx, cameras.length]); // eslint-disable-line

  const switchCamera = () => setCamIdx((i) => (i + 1) % Math.max(cameras.length, 1));

  const submitManual = (e) => {
    e.preventDefault();
    if (manual.trim()) onScan(manual.trim());
  };

  return (
    <div className="bs-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bs-modal">
        {/* Header */}
        <div className="bs-header">
          <span className="bs-title">{title}</span>
          <button className="bs-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Camera view */}
        <div className={`bs-viewport${flash ? " bs-flash" : ""}`}>
          <video ref={videoRef} className="bs-video" autoPlay playsInline muted />
          {!error && (
            <div className="bs-scanner-line-wrap">
              <div className="bs-scanner-line" />
            </div>
          )}
          <div className="bs-corner bs-tl" /><div className="bs-corner bs-tr" />
          <div className="bs-corner bs-bl" /><div className="bs-corner bs-br" />

          {error && (
            <div className="bs-cam-error">
              <CameraOff size={32} />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bs-controls">
          {cameras.length > 1 && (
            <button className="bs-ctrl-btn" onClick={switchCamera}>
              <Camera size={15} /> Switch Camera
            </button>
          )}
          {cameras[camIdx] && (
            <span className="bs-cam-name">{cameras[camIdx].label || `Camera ${camIdx + 1}`}</span>
          )}
          <button className="bs-ctrl-btn bs-ctrl-right" onClick={() => setShowManual((v) => !v)}>
            <Keyboard size={15} /> Enter manually
          </button>
        </div>

        {/* Manual entry fallback */}
        {showManual && (
          <form className="bs-manual" onSubmit={submitManual}>
            <input
              autoFocus
              className="bs-manual-input"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Type or paste barcode / SKU…"
            />
            <button type="submit" className="bs-manual-btn" disabled={!manual.trim()}>
              Submit
            </button>
          </form>
        )}

        <p className="bs-hint">Point the camera at any 1D / QR barcode</p>
      </div>
    </div>
  );
}
