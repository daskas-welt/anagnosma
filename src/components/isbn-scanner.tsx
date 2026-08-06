'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeIsbn } from '@/lib/isbn';

export function IsbnScanner({
  onScan,
  label = 'Scan ISBN',
  busy = false,
  compact = false,
}: {
  onScan: (isbn: string) => void | Promise<void>;
  label?: string;
  busy?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [value, setValue] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const scanInProgressRef = useRef(false);

  useEffect(() => {
    if (!open) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }
    // Also release the stream on unmount. Both hosts render this scanner inside
    // a Sheet, so closing the sheet tears the component down while `open` is
    // still true — without this cleanup the camera (and its indicator light)
    // would stay live until the tab is closed.
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        !panelRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setOpen(false);
        setCameraOpen(false);
        setCameraError(null);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  async function submit(rawValue: string) {
    if (scanInProgressRef.current) return;
    const isbn = normalizeIsbn(rawValue);
    if (!isbn) {
      setCameraError('Enter a valid ISBN-10 or ISBN-13.');
      return;
    }
    scanInProgressRef.current = true;
    controlsRef.current?.stop();
    try {
      await onScan(isbn);
      setValue('');
      setOpen(false);
      setCameraOpen(false);
    } finally {
      scanInProgressRef.current = false;
    }
  }

  async function startCamera() {
    setCameraError(null);
    setCameraOpen(true);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result) => {
          if (result) void submit(result.getText());
        },
      );
    } catch {
      setCameraError(
        'Camera access is unavailable. Check browser permissions or use the scanner input below.',
      );
      setCameraOpen(false);
    }
  }

  return (
    <div className={compact ? 'contents' : 'relative space-y-3'}>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size={compact ? 'icon' : 'default'}
        aria-label={compact ? (open ? 'Close ISBN scanner' : label) : undefined}
        title={compact ? (open ? 'Close ISBN scanner' : label) : undefined}
        onClick={() => {
          if (busy) return;
          setOpen((nextOpen) => !nextOpen);
          setCameraError(null);
          setCameraOpen(false);
        }}
      >
        <ScanLine />
        {compact ? (
          <span className="sr-only">{open ? 'Close scanner' : label}</span>
        ) : open ? (
          'Close scanner'
        ) : (
          label
        )}
      </Button>
      {open && (
        <div
          ref={panelRef}
          className={`space-y-3 rounded-lg border bg-popover p-3 shadow-lg ${
            compact
              ? 'absolute top-full left-0 z-10 mt-2 w-full'
              : 'w-full bg-muted/20'
          }`}
        >
          <div>
            <p className="font-medium">Scan ISBN</p>
            <p className="text-sm text-muted-foreground">
              Use your camera, or scan with a USB/Bluetooth barcode scanner. A
              scanner that types like a keyboard works automatically.
            </p>
          </div>
          <video
            ref={videoRef}
            className={
              cameraOpen
                ? 'aspect-video w-full rounded-lg bg-black object-cover'
                : 'hidden'
            }
            muted
            playsInline
          />
          {!cameraOpen && (
            <Button
              type="button"
              className="w-full"
              onClick={startCamera}
              disabled={busy}
            >
              <ScanLine />
              Use camera
            </Button>
          )}
          <div className="flex gap-2">
            <Input
              autoFocus
              inputMode="numeric"
              placeholder="Scan ISBN"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={busy}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void submit(value);
                }
              }}
            />
            <Button
              type="button"
              onClick={() => void submit(value)}
              disabled={busy}
            >
              {busy ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Looking up...
                </>
              ) : (
                'Use ISBN'
              )}
            </Button>
          </div>
          {cameraError && (
            <p role="alert" className="text-sm text-destructive">
              {cameraError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
