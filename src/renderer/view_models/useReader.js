import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).toString();

const assetBaseUrl = new URL('pdfjs/', window.location.href).toString();
const cMapUrl = new URL('cmaps/', assetBaseUrl).toString();
const standardFontDataUrl = new URL('standard_fonts/', assetBaseUrl).toString();

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

function getFileType(filePath) {
  if (!filePath) return null;
  const ext = filePath.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.some((e) => e.slice(1) === ext)) return 'image';
  return null;
}

function useDebouncedEffect(effect, deps, delay) {
  useEffect(() => {
    const handler = setTimeout(() => effect(), delay);
    return () => clearTimeout(handler);
  }, [...deps, delay]);
}

export function useReader(api, selectedDoc) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState('continuous');
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [pageDelay, setPageDelay] = useState(0);
  const [singlePageIndex, setSinglePageIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const pendingScroll = useRef(null);
  const activeDocRef = useRef(null);

  useEffect(() => {
    if (!selectedDoc) return;
    setViewMode(selectedDoc.view_mode || 'continuous');
    setZoom(selectedDoc.zoom || 1);
    setScrollSpeed(selectedDoc.auto_scroll_speed || 0);
    setPageDelay(selectedDoc.auto_page_turn_delay || 0);
    setSinglePageIndex(selectedDoc.page_index || 0);
    const storedOffset = selectedDoc.scroll_offset || 0;
    pendingScroll.current = storedOffset;
    setScrollOffset(storedOffset);
  }, [selectedDoc]);

  useEffect(() => {
    if (!selectedDoc || !api?.pdf) {
      if (activeDocRef.current) {
        activeDocRef.current.destroy();
        activeDocRef.current = null;
      }
      setPdfDoc(null);
      setImageUrl(null);
      setFileType(null);
      setPageCount(0);
      setError(null);
      return;
    }

    const detectedType = getFileType(selectedDoc.file_path);
    setFileType(detectedType);

    let cancelled = false;
    setLoading(true);
    setError(null);

    if (detectedType === 'image') {
      // For images, load as data URL to avoid file:// restrictions
      (async () => {
        try {
          const url = api.fileReadAsDataUrl
            ? await api.fileReadAsDataUrl(selectedDoc.file_path)
            : await api.fileUrlFromPath(selectedDoc.file_path);
          if (cancelled) return;
          setPdfDoc(null);
          if (activeDocRef.current) {
            activeDocRef.current.destroy();
            activeDocRef.current = null;
          }
          setImageUrl(url);
          setPageCount(1);
        } catch (err) {
          setImageUrl(null);
          setPageCount(0);
          setError(err?.message || 'Failed to load image');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    } else {
      // For PDFs, use PDF.js
      (async () => {
        try {
          const fileBuffer = await api.pdf.readFile(selectedDoc.file_path);
          if (cancelled) return;
          const data = normalizeBuffer(fileBuffer);
          if (!data) {
            throw new Error('Unsupported PDF buffer format');
          }
          const loadingTask = pdfjsLib.getDocument({
            data,
            cMapUrl,
            cMapPacked: true,
            standardFontDataUrl
          });
          const doc = await loadingTask.promise;
          if (cancelled) {
            doc.destroy();
            return;
          }
          if (activeDocRef.current) {
            activeDocRef.current.destroy();
          }
          activeDocRef.current = doc;
          setImageUrl(null);
          setPdfDoc(doc);
          setPageCount(doc.numPages || 0);
        } catch (err) {
          setPdfDoc(null);
          setPageCount(0);
          setError(err?.message || 'Failed to load PDF');
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [api, selectedDoc]);

  useDebouncedEffect(() => {
    if (!selectedDoc || !api?.reader) return;
    api.reader.saveReadingState(selectedDoc.id, {
      pageIndex: singlePageIndex,
      zoom,
      scrollOffset,
      viewMode,
      autoScrollSpeed: scrollSpeed,
      autoPageTurnDelay: pageDelay
    });
  }, [selectedDoc, singlePageIndex, zoom, scrollOffset, viewMode, scrollSpeed, pageDelay], 500);

  const onScroll = useCallback((value) => {
    setScrollOffset(value);
  }, []);

  return {
    pdfDoc,
    imageUrl,
    fileType,
    pageCount,
    loading,
    error,
    zoom,
    viewMode,
    scrollSpeed,
    pageDelay,
    singlePageIndex,
    scrollOffset,
    setZoom,
    setViewMode,
    setScrollSpeed,
    setPageDelay,
    setSinglePageIndex,
    setScrollOffset,
    onScroll,
    pendingScroll
  };
}

function normalizeBuffer(fileBuffer) {
  if (!fileBuffer) return null;
  if (fileBuffer instanceof Uint8Array) return fileBuffer;
  if (fileBuffer instanceof ArrayBuffer) return new Uint8Array(fileBuffer);
  if (ArrayBuffer.isView(fileBuffer)) {
    return new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
  }
  if (fileBuffer.type === 'Buffer' && Array.isArray(fileBuffer.data)) {
    return Uint8Array.from(fileBuffer.data);
  }
  return null;
}
