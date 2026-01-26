import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLibrary } from './view_models/useLibrary.js';
import { useReader } from './view_models/useReader.js';

const api = window.api;

function formatCount(count) {
  if (count === 1) return '1 Score';
  return `${count} Scores`;
}

function useMetronome({ bpm, timeSignature, active, onPulse }) {
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const beatRef = useRef(0);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = null;
      beatRef.current = 0;
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!audioRef.current) {
      audioRef.current = new AudioContext();
    }

    const tick = () => {
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const isAccent = beatRef.current % timeSignature === 0;
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.value = isAccent ? 880 : 660;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);

      beatRef.current += 1;
      onPulse();
    };

    tick();
    intervalRef.current = setInterval(tick, (60 / bpm) * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = null;
    };
  }, [active, bpm, timeSignature, onPulse]);
}

function PageCanvas({ pdfDoc, pageIndex, zoom }) {
  const canvasRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask = null;
    setRendered(false);
    setError(null);

    if (!pdfDoc || !canvasRef.current) return undefined;

    (async () => {
      try {
        const page = await pdfDoc.getPage(pageIndex + 1);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: zoom });
        const outputScale = window.devicePixelRatio || 1;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        renderTask = page.render({
          canvasContext: context,
          transform,
          viewport
        });

        await renderTask.promise;
        if (!cancelled) setRendered(true);
        page.cleanup();
      } catch (error) {
        if (!cancelled) {
          setRendered(false);
          setError(error?.message || 'Render failed');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (error) {
          // ignore
        }
      }
    };
  }, [pdfDoc, pageIndex, zoom]);

  return (
    <div className="canvas-wrap">
      {!rendered && <div className="page-placeholder" />}
      {error && <div className="page-error">{error}</div>}
      <canvas ref={canvasRef} className={`pdf-canvas ${rendered ? 'visible' : ''}`} />
    </div>
  );
}

export default function App() {
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 3;
  const { documents, libraryRoot, loading, chooseLibraryRoot, importFiles } = useLibrary(api);
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [pulse, setPulse] = useState(false);
  const [bpm, setBpm] = useState(92);
  const [timeSignature, setTimeSignature] = useState(4);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [toolbarHover, setToolbarHover] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  const [isCentered, setIsCentered] = useState(false);

  const canvasRef = useRef(null);
  const singleRef = useRef(null);
  const readerStageRef = useRef(null);
  const sidebarRef = useRef(null);
  const readerRef = useRef(null);
  const pageBaseRef = useRef({ width: null, height: null });
  const zoomSnapRef = useRef(null);
  const zoomScrollRef = useRef(null);
  const panState = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
    container: null
  });

  const {
    pdfDoc,
    pageCount,
    loading: pageLoading,
    error: pdfError,
    zoom,
    viewMode,
    scrollSpeed,
    pageDelay,
    singlePageIndex,
    setZoom,
    setViewMode,
    setScrollSpeed,
    setPageDelay,
    setSinglePageIndex,
    onScroll,
    pendingScroll
  } = useReader(api, selectedDoc);

  useMetronome({
    bpm,
    timeSignature,
    active: metronomeOn,
    onPulse: () => {
      setPulse(true);
      setTimeout(() => setPulse(false), 140);
    }
  });

  const computeFitScale = useCallback(() => {
    const baseWidth = pageBaseRef.current.width;
    if (!baseWidth) return;
    const container = viewMode === 'single' ? singleRef.current : canvasRef.current;
    const host = container || readerStageRef.current;
    if (!host) return;
    const padding = 16;
    const available = Math.max(host.clientWidth - padding, 200);
    const fit = available / baseWidth;
    const nextScale = Math.min(Math.max(fit, 1), MAX_ZOOM);
    setFitScale(nextScale);
    const contentWidth = baseWidth * nextScale * zoom;
    setIsCentered(contentWidth < host.clientWidth - 10);
  }, [viewMode, zoom, MAX_ZOOM]);

  useEffect(() => {
    let cancelled = false;
    if (!pdfDoc) return;

    (async () => {
      try {
        const page = await pdfDoc.getPage(1);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1 });
        pageBaseRef.current = { width: viewport.width, height: viewport.height };
        page.cleanup();
        computeFitScale();
      } catch (error) {
        pageBaseRef.current = { width: null, height: null };
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, computeFitScale]);

  useEffect(() => {
    const stage = readerStageRef.current;
    if (!stage) return undefined;
    const observer = new ResizeObserver(() => computeFitScale());
    observer.observe(stage);
    return () => observer.disconnect();
  }, [viewMode, computeFitScale]);

  useEffect(() => {
    const baseWidth = pageBaseRef.current.width;
    const host = viewMode === 'single' ? singleRef.current : canvasRef.current;
    if (!baseWidth || !host) return;
    const contentWidth = baseWidth * fitScale * zoom;
    setIsCentered(contentWidth < host.clientWidth - 10);
  }, [fitScale, zoom, viewMode]);

  useEffect(() => {
    if (pendingScroll.current !== null && canvasRef.current && viewMode === 'continuous') {
      canvasRef.current.scrollTop = pendingScroll.current;
      pendingScroll.current = null;
    }
  }, [pdfDoc, pageCount, viewMode, pendingScroll]);

  useEffect(() => {
    const pending = zoomScrollRef.current;
    if (!pending) return;
    const container = pending.mode === 'single' ? singleRef.current : canvasRef.current;
    if (!container) return;
    container.scrollLeft = pending.left;
    container.scrollTop = pending.top;
    zoomScrollRef.current = null;
  }, [zoom, viewMode, pageCount]);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const container = canvasRef.current;
    let rafId;
    let last = performance.now();

    const step = (now) => {
      const delta = (now - last) / 1000;
      last = now;
      container.scrollTop += scrollSpeed * delta;
      rafId = requestAnimationFrame(step);
    };

    if (selectedDoc && scrollSpeed > 0 && viewMode === 'continuous') {
      rafId = requestAnimationFrame(step);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [scrollSpeed, viewMode, selectedDoc]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (api?.window?.setTrafficLights) {
      api.window.setTrafficLights(sidebarPinned || sidebarHover);
    }
  }, [sidebarPinned, sidebarHover]);

  useEffect(() => {
    let scrollTimeout;
    const handleScroll = (event) => {
      const target = event.target;
      target.classList.add('is-scrolling');
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        target.classList.remove('is-scrolling');
      }, 1000);
    };

    const containers = [canvasRef.current, singleRef.current];
    containers.forEach((el) => {
      if (el) el.addEventListener('scroll', handleScroll);
    });

    return () => {
      containers.forEach((el) => {
        if (el) el.removeEventListener('scroll', handleScroll);
      });
      clearTimeout(scrollTimeout);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!readerStageRef.current) return;
    if (!document.fullscreenElement) {
      readerStageRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const toggleSidebarPinned = useCallback(() => {
    setSidebarPinned((prev) => {
      const next = !prev;
      setSidebarHover(false);
      return next;
    });
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => !prev);
    setToolbarHover(false);
  }, []);

  const handlePanMove = useCallback((event) => {
    if (!panState.current.active) return;
    const { container, startX, startY, scrollLeft, scrollTop } = panState.current;
    if (!container) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    container.scrollLeft = scrollLeft - dx;
    container.scrollTop = scrollTop - dy;
  }, []);

  const endPan = useCallback(() => {
    if (!panState.current.active) return;
    const { container } = panState.current;
    if (container) container.classList.remove('is-panning');
    panState.current.active = false;
    panState.current.container = null;
    window.removeEventListener('mousemove', handlePanMove);
    window.removeEventListener('mouseup', endPan);
  }, [handlePanMove]);

  const beginPan = useCallback((event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const container = event.currentTarget;
    panState.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      container
    };
    container.classList.add('is-panning');
    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', endPan);
  }, [endPan, handlePanMove]);

  const handleDoubleClick = useCallback((event) => {
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const currentZoom = zoom;
    let nextZoom = currentZoom;

    if (zoomSnapRef.current === null) {
      zoomSnapRef.current = currentZoom;
      nextZoom = Math.min(currentZoom * 1.5, MAX_ZOOM);
    } else {
      nextZoom = zoomSnapRef.current;
      zoomSnapRef.current = null;
    }

    const ratio = nextZoom / currentZoom;
    const nextLeft = (container.scrollLeft + clickX) * ratio - clickX;
    const nextTop = (container.scrollTop + clickY) * ratio - clickY;
    zoomScrollRef.current = { left: nextLeft, top: nextTop, mode: viewMode };
    setZoom(nextZoom);
  }, [viewMode, zoom, setZoom, MAX_ZOOM]);

  const handleWheelZoom = useCallback((event) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const currentZoom = zoom;
    const factor = Math.exp(-event.deltaY * 0.002);
    const nextZoom = Math.min(Math.max(currentZoom * factor, MIN_ZOOM), MAX_ZOOM);
    if (nextZoom === currentZoom) return;
    const ratio = nextZoom / currentZoom;
    const nextLeft = (container.scrollLeft + cursorX) * ratio - cursorX;
    const nextTop = (container.scrollTop + cursorY) * ratio - cursorY;
    zoomScrollRef.current = { left: nextLeft, top: nextTop, mode: viewMode };
    setZoom(nextZoom);
  }, [zoom, viewMode, setZoom, MIN_ZOOM, MAX_ZOOM]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tag = event.target?.tagName || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (!selectedDoc) return;

      if (event.code === 'Space') {
        event.preventDefault();
        setMetronomeOn((prev) => !prev);
        return;
      }

      if (event.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }

      if (event.key.toLowerCase() === 'g') {
        toggleSidebarPinned();
      }

      if (event.key.toLowerCase() === 'z') {
        toggleFocusMode();
      }

      if (viewMode === 'single') {
        if (event.key === 'ArrowRight') {
          setSinglePageIndex((prev) => Math.min(prev + 1, pageCount - 1));
        }
        if (event.key === 'ArrowLeft') {
          setSinglePageIndex((prev) => Math.max(prev - 1, 0));
        }
      } else if (canvasRef.current) {
        if (event.key === 'ArrowDown') {
          canvasRef.current.scrollTop += 120;
        }
        if (event.key === 'ArrowUp') {
          canvasRef.current.scrollTop -= 120;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDoc, viewMode, pageCount, setSinglePageIndex, toggleFullscreen, toggleSidebarPinned, toggleFocusMode]);

  useEffect(() => {
    if (sidebarPinned || !sidebarHover) return undefined;
    const hoverBuffer = 14;
    const handleMouseMove = (event) => {
      if (!sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left - hoverBuffer &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (inside) return;
      if (!inside) setSidebarHover(false);
    };
    const handleMouseLeave = () => setSidebarHover(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [sidebarPinned, sidebarHover]);

  useEffect(() => {
    if (!focusMode) {
      setToolbarHover(false);
      return undefined;
    }
    const triggerZone = 60;
    const handleMouseMove = (event) => {
      if (!readerRef.current) return;
      const rect = readerRef.current.getBoundingClientRect();
      const nearTop = event.clientY >= rect.top && event.clientY <= rect.top + triggerZone;
      if (nearTop && !toolbarHover) {
        setToolbarHover(true);
      } else if (!nearTop && toolbarHover && event.clientY > rect.top + 150) {
        setToolbarHover(false);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [focusMode, toolbarHover]);

  useEffect(() => {
    if (viewMode !== 'single' || pageDelay <= 0 || pageCount <= 1) return undefined;
    const timer = setInterval(() => {
      setSinglePageIndex((prev) => {
        if (prev >= pageCount - 1) return prev;
        return prev + 1;
      });
    }, pageDelay * 1000);
    return () => clearInterval(timer);
  }, [viewMode, pageDelay, pageCount, setSinglePageIndex]);

  useEffect(() => {
    if (!api?.onMenuImportPdf || !api?.onMenuLibraryLocation) return undefined;
    const offImport = api.onMenuImportPdf(() => importFiles());
    const offLocation = api.onMenuLibraryLocation(() => chooseLibraryRoot());
    return () => {
      if (offImport) offImport();
      if (offLocation) offLocation();
    };
  }, [importFiles, chooseLibraryRoot]);

  useEffect(() => {
    if (pageCount === 0) return;
    if (singlePageIndex > pageCount - 1) {
      setSinglePageIndex(Math.max(pageCount - 1, 0));
    }
  }, [pageCount, singlePageIndex, setSinglePageIndex]);

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter((doc) => (doc.title || '').toLowerCase().includes(term));
  }, [documents, search]);

  const handleSelect = (doc) => {
    setSelectedDoc(doc);
    setSinglePageIndex(doc.page_index || 0);
  };

  const sidebarVisible = sidebarPinned || sidebarHover;

  return (
    <div
      id="app"
      className={`${isFullscreen ? 'fullscreen' : ''} ${sidebarPinned ? '' : 'sidebar-collapsed'} ${
        sidebarHover ? 'sidebar-hover' : ''
      } ${focusMode ? 'focus-mode' : ''} ${toolbarHover ? 'toolbar-hover' : ''}`}
    >
      <main className="layout">
        {!sidebarPinned && !sidebarHover && (
          <div
            className="library-edge"
            onMouseEnter={() => setSidebarHover(true)}
            onClick={toggleSidebarPinned}
          />
        )}
        <aside
          className={`library ${sidebarVisible ? 'open' : 'collapsed'}`}
          ref={sidebarRef}
          onMouseEnter={() => {
            if (!sidebarPinned) setSidebarHover(true);
          }}
        >
          <div className="library-drag" aria-hidden="true" />
          <div className="library-head">
            <div className="library-actions">
              <span className="library-title">Library</span>
              <button
                className={`pin-toggle ${sidebarPinned ? 'active' : ''}`}
                onClick={toggleSidebarPinned}
                aria-label={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                title={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                <span className="pin-icon" aria-hidden="true" />
              </button>
            </div>
            <input
              id="search"
              type="search"
              placeholder="Search title, tags"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="library-meta">
              <span id="library-count">{formatCount(filteredDocuments.length)}</span>
              <span id="library-root" className="library-root">{libraryRoot}</span>
            </div>
          </div>
          <div id="library-list" className="library-list">
            {loading && <div className="empty">Loading library...</div>}
            {!loading && filteredDocuments.length === 0 && (
              <div className="empty">Import PDFs to start your gallery.</div>
            )}
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`library-item ${selectedDoc?.id === doc.id ? 'active' : ''}`}
                onClick={() => handleSelect(doc)}
              >
                <div className="library-item-title">{doc.title || 'Untitled'}</div>
                <div className="library-item-meta">
                  <span>{doc.page_count || '--'} pages</span>
                  <span>{doc.last_opened ? 'Resume' : 'New'}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="reader" ref={readerRef}>
          <div className="reader-toolbar">
            <div className="doc-meta">
              <div id="doc-title" className="doc-title">{selectedDoc?.title || 'Select a score'}</div>
              <div id="doc-sub" className="doc-sub">
                {selectedDoc ? `${pageCount || selectedDoc.page_count || 0} pages loaded` : 'PDF reader with guided practice tools'}
              </div>
            </div>
            <div className="toolbar-controls">
              <button className={`ghost ${focusMode ? 'active' : ''}`} onClick={toggleFocusMode} title="Toggle Focus Mode (Z)">
                {focusMode ? 'Exit Focus' : 'Focus'}
              </button>
              <button className="ghost" onClick={toggleFullscreen}>
                {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              </button>
              <div className="control-group">
                <label>View</label>
                <select value={viewMode} onChange={(event) => setViewMode(event.target.value)}>
                  <option value="continuous">Continuous</option>
                  <option value="single">Single Page</option>
                </select>
              </div>
              <div className="control-group">
                <label>Zoom</label>
                <input
                  id="zoom"
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step="0.05"
                  value={zoom}
                  onChange={(event) => setZoom(parseFloat(event.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Auto Scroll</label>
                <input
                  id="scroll-speed"
                  type="range"
                  min="0"
                  max="140"
                  step="5"
                  value={scrollSpeed}
                  onChange={(event) => setScrollSpeed(parseFloat(event.target.value))}
                />
              </div>
              <div className="toolbar-practice">
                <div className="control-group">
                  <label>Metronome</label>
                  <div className="meter-controls compact">
                    <input
                      id="bpm"
                      type="number"
                      min="40"
                      max="220"
                      value={bpm}
                      onChange={(event) => setBpm(parseInt(event.target.value || '0', 10))}
                    />
                    <select
                      id="time-signature"
                      value={timeSignature}
                      onChange={(event) => setTimeSignature(parseInt(event.target.value, 10))}
                    >
                      <option value={4}>4/4</option>
                      <option value={3}>3/4</option>
                      <option value={6}>6/8</option>
                    </select>
                    <button
                      id="metronome-toggle"
                      className="accent"
                      onClick={() => setMetronomeOn((prev) => !prev)}
                    >
                      {metronomeOn ? 'Stop' : 'Start'}
                    </button>
                    <div id="metronome-pulse" className={`pulse ${pulse ? 'active' : ''}`}></div>
                  </div>
                </div>
                <div className="control-group">
                  <label>Auto Page Turn</label>
                  <div className="page-controls inline">
                    <input
                      id="page-delay"
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={pageDelay}
                      onChange={(event) => setPageDelay(parseFloat(event.target.value))}
                    />
                    <span id="page-delay-value">{pageDelay}s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="reader-stage" className="reader-stage" ref={readerStageRef}>
            <div
              id="page-canvas"
              className={`page-canvas ${viewMode === 'continuous' ? '' : 'hidden'} ${isCentered ? 'centered' : ''}`}
              ref={canvasRef}
              onScroll={(event) => onScroll(event.currentTarget.scrollTop)}
              onMouseDown={beginPan}
              onDoubleClick={handleDoubleClick}
              onWheel={handleWheelZoom}
            >
              {pageLoading && <div className="empty">Rendering pages...</div>}
              {pdfError && <div className="empty">Failed to load PDF: {pdfError}</div>}
              {!pageLoading && !selectedDoc && <div className="empty">Choose a score to begin reading.</div>}
              <div className="page-stack">
                {selectedDoc && pdfDoc && Array.from({ length: pageCount }).map((_, index) => (
                  <div className="page-shell" key={`${selectedDoc.id}-${index}`}>
                    <PageCanvas pdfDoc={pdfDoc} pageIndex={index} zoom={zoom * fitScale} />
                  </div>
                ))}
              </div>
            </div>

            <div id="single-page" className={`single-page ${viewMode === 'single' ? '' : 'hidden'}`}>
              <button className="nav" onClick={() => setSinglePageIndex(Math.max(singlePageIndex - 1, 0))}>Prev</button>
              <div
                className={`single-container ${isCentered ? 'centered' : ''}`}
                ref={singleRef}
                onMouseDown={beginPan}
                onDoubleClick={handleDoubleClick}
                onWheel={handleWheelZoom}
              >
                {selectedDoc && pdfDoc ? (
                  <div className="page-shell">
                    <PageCanvas pdfDoc={pdfDoc} pageIndex={singlePageIndex} zoom={zoom * fitScale} />
                  </div>
                ) : (
                  <div className="page-placeholder" />
                )}
              </div>
              <button
                className="nav"
                onClick={() => setSinglePageIndex(Math.min(singlePageIndex + 1, pageCount - 1))}
              >
                Next
              </button>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}
