import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).toString();

const assetBaseUrl = new URL('pdfjs/', window.location.href).toString();
const cMapUrl = new URL('cmaps/', assetBaseUrl).toString();
const standardFontDataUrl = new URL('standard_fonts/', assetBaseUrl).toString();

function useDebouncedEffect(effect, deps, delay) {
  useEffect(() => {
    const handler = setTimeout(() => effect(), delay);
    return () => clearTimeout(handler);
  }, [...deps, delay]);
}

export function useReader(api, selectedDoc) {
  const [pdfDoc, setPdfDoc] = useState(null);
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
      setPageCount(0);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

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
        setPdfDoc(doc);
        setPageCount(doc.numPages || 0);
      } catch (error) {
        setPdfDoc(null);
        setPageCount(0);
        setError(error?.message || 'Failed to load PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

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
