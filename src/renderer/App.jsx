import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLibrary } from './view_models/useLibrary.js';
import { useReader } from './view_models/useReader.js';

const api = window.api;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.12;

function getAppView() {
  if (typeof window === 'undefined') return 'main';
  const params = new URLSearchParams(window.location.search);
  return params.get('view') || 'main';
}

function formatCount(count) {
  if (count === 1) return '1 Score';
  return `${count} Scores`;
}

function useMetronome({ bpm, timeSignature, subdivision, countInBars, active, onPulse }) {
  const audioRef = useRef(null);
  const schedulerRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const tickRef = useRef(0);
  const pulseTimersRef = useRef([]);

  useEffect(() => {
    const clearPulseTimers = () => {
      pulseTimersRef.current.forEach((id) => clearTimeout(id));
      pulseTimersRef.current = [];
    };

    if (!active) {
      if (schedulerRef.current) {
        clearInterval(schedulerRef.current);
      }
      schedulerRef.current = null;
      tickRef.current = 0;
      clearPulseTimers();
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!audioRef.current) {
      audioRef.current = new AudioContext();
    }
    const ctx = audioRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const safeBpm = Math.max(30, Number(bpm) || 0);
    const beatsPerBar = Math.max(1, Number(timeSignature) || 1);
    const subdivisions = Math.min(Math.max(Number(subdivision) || 1, 1), 4);
    const countIn = Math.max(0, Number(countInBars) || 0);
    const ticksPerBar = beatsPerBar * subdivisions;
    const secondsPerTick = (60 / safeBpm) / subdivisions;
    const lookaheadMs = LOOKAHEAD_MS;
    const scheduleAheadTime = SCHEDULE_AHEAD_SEC;
    let countInTicksRemaining = countIn * ticksPerBar;

    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    tickRef.current = 0;
    clearPulseTimers();

    const schedulePulse = (time, pulseInfo) => {
      if (!onPulse) return;
      const delay = Math.max(time - ctx.currentTime, 0);
      const id = setTimeout(() => onPulse(pulseInfo), delay * 1000);
      pulseTimersRef.current.push(id);
    };

    const scheduleClick = (time, { isDownbeat, isBeat, isCountIn }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = isDownbeat ? (isCountIn ? 980 : 880) : isBeat ? 660 : 520;
      const level = isDownbeat ? 0.28 : isBeat ? 0.18 : 0.1;

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.1);
    };

    const scheduler = () => {
      while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
        const tickIndex = tickRef.current;
        const isBeat = tickIndex % subdivisions === 0;
        const isDownbeat = tickIndex % ticksPerBar === 0;
        const isCountIn = countInTicksRemaining > 0;
        const beatIndex = Math.floor(tickIndex / subdivisions) + 1;
        const countInBarsRemaining = isCountIn ? Math.ceil(countInTicksRemaining / ticksPerBar) : 0;

        scheduleClick(nextNoteTimeRef.current, { isDownbeat, isBeat, isCountIn });
        if (isBeat) {
          schedulePulse(nextNoteTimeRef.current, {
            beatIndex,
            beatsPerBar,
            isDownbeat,
            isCountIn,
            countInBarsRemaining
          });
        }

        tickRef.current = (tickIndex + 1) % ticksPerBar;
        if (countInTicksRemaining > 0) {
          countInTicksRemaining -= 1;
        }
        nextNoteTimeRef.current += secondsPerTick;
      }
    };

    schedulerRef.current = setInterval(scheduler, lookaheadMs);

    return () => {
      if (schedulerRef.current) {
        clearInterval(schedulerRef.current);
      }
      schedulerRef.current = null;
      clearPulseTimers();
    };
  }, [active, bpm, timeSignature, subdivision, countInBars, onPulse]);
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

function MetronomeWindow() {
  const [pulse, setPulse] = useState(false);
  const [bpm, setBpm] = useState(92);
  const [timeSignature, setTimeSignature] = useState(4);
  const [subdivision, setSubdivision] = useState(1);
  const [countInBars, setCountInBars] = useState(0);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [beatState, setBeatState] = useState({
    beatIndex: 1,
    isCountIn: false,
    countInBarsRemaining: 0
  });

  const handlePulse = useCallback((pulseInfo) => {
    setPulse(true);
    if (pulseInfo) {
      setBeatState({
        beatIndex: pulseInfo.beatIndex,
        isCountIn: pulseInfo.isCountIn,
        countInBarsRemaining: pulseInfo.countInBarsRemaining
      });
    }
    setTimeout(() => setPulse(false), 140);
  }, []);

  useMetronome({
    bpm,
    timeSignature,
    subdivision,
    countInBars,
    active: metronomeOn,
    onPulse: handlePulse
  });

  useEffect(() => {
    if (!metronomeOn) {
      setBeatState({
        beatIndex: 1,
        isCountIn: false,
        countInBarsRemaining: 0
      });
    }
  }, [metronomeOn]);

  useEffect(() => {
    setBeatState((prev) => ({
      ...prev,
      beatIndex: Math.min(prev.beatIndex, timeSignature)
    }));
  }, [timeSignature]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tag = event.target?.tagName || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        setMetronomeOn((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const beatDots = useMemo(
    () => Array.from({ length: timeSignature }, (_, index) => index + 1),
    [timeSignature]
  );
  const clampedBeatIndex = Math.min(beatState.beatIndex, timeSignature);
  const countInLabel = beatState.countInBarsRemaining === 1 ? 'bar' : 'bars';

  return (
    <div className={`metronome-window ${metronomeOn ? 'running' : ''}`}>
      <div className="metronome-drag" aria-hidden="true" />
      <header className="metronome-head">
        <div className="metronome-title-block">
          <div className="metronome-title">Metronome</div>
          <div className="metronome-sub">Feel the pulse. Keep the groove.</div>
        </div>
        <button
          id="metronome-toggle"
          className={`metronome-toggle ${metronomeOn ? 'active' : ''}`}
          onClick={() => setMetronomeOn((prev) => !prev)}
        >
          <span className="toggle-label">{metronomeOn ? 'Stop' : 'Start'}</span>
          <span className={`toggle-dot ${pulse ? 'active' : ''}`} aria-hidden="true" />
        </button>
      </header>
      <div className="metronome-main">
        <div className="metronome-tempo">
          <label htmlFor="bpm">Tempo</label>
          <div className="bpm-row">
            <input
              id="bpm"
              type="number"
              min="40"
              max="220"
              value={bpm}
              onChange={(event) => setBpm(parseInt(event.target.value || '0', 10))}
            />
            <span className="bpm-unit">BPM</span>
          </div>
          <input
            className="bpm-slider"
            type="range"
            min="40"
            max="220"
            step="1"
            value={bpm}
            onChange={(event) => setBpm(parseInt(event.target.value || '0', 10))}
          />
        </div>
        <div className="metronome-beats">
          <div
            className={`beat-ring ${beatState.isCountIn ? 'count-in' : ''}`}
            role="group"
            aria-label="Beat display"
          >
            {beatDots.map((beat) => (
              <span
                key={beat}
                className={`beat-dot ${metronomeOn && beat === clampedBeatIndex ? 'active' : ''} ${
                  beat === 1 ? 'downbeat' : ''
                }`}
              />
            ))}
          </div>
          <div className="beat-readout" aria-live="polite">
            {metronomeOn
              ? beatState.isCountIn
                ? `Count-in: ${beatState.countInBarsRemaining} ${countInLabel}`
                : `Beat ${clampedBeatIndex} / ${timeSignature}`
              : 'Ready'}
          </div>
        </div>
      </div>
      <div className="metronome-settings">
        <div className="setting">
          <label htmlFor="time-signature">Time</label>
          <select
            id="time-signature"
            value={timeSignature}
            onChange={(event) => setTimeSignature(parseInt(event.target.value, 10))}
          >
            <option value={4}>4/4</option>
            <option value={3}>3/4</option>
            <option value={6}>6/8</option>
          </select>
        </div>
        <div className="setting">
          <label htmlFor="subdivision">Subdivision</label>
          <select
            id="subdivision"
            value={subdivision}
            onChange={(event) => setSubdivision(parseInt(event.target.value, 10))}
          >
            <option value={1}>1/4</option>
            <option value={2}>1/8</option>
            <option value={3}>Triplet</option>
            <option value={4}>1/16</option>
          </select>
        </div>
        <div className="setting">
          <label htmlFor="count-in">Count-in</label>
          <select
            id="count-in"
            value={countInBars}
            onChange={(event) => setCountInBars(parseInt(event.target.value, 10))}
          >
            <option value={0}>No Count-In</option>
            <option value={1}>1 Bar</option>
            <option value={2}>2 Bars</option>
            <option value={3}>3 Bars</option>
            <option value={4}>4 Bars</option>
          </select>
        </div>
      </div>
      <div className="metronome-footer">
        <span className="metronome-hint">Space to start/stop</span>
      </div>
    </div>
  );
}

function MainApp() {
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 3;
  const PAGE_GAP = 12;
  const metronomeIcon = `${import.meta.env.BASE_URL}icons/Metronome%20Icon.png`;
  const { documents, libraryRoot, loading, chooseLibraryRoot, importFiles } = useLibrary(api);
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [toolbarHover, setToolbarHover] = useState(false);
  const [stageActive, setStageActive] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  const [isCentered, setIsCentered] = useState(false);
  const [pagesPerView, setPagesPerView] = useState(1);

  const canvasRef = useRef(null);
  const singleRef = useRef(null);
  const readerStageRef = useRef(null);
  const sidebarRef = useRef(null);
  const readerRef = useRef(null);
  const pageBaseRef = useRef({ width: null, height: null });
  const zoomSnapRef = useRef(null);
  const zoomScrollRef = useRef(null);
  const stageActivityTimer = useRef(null);
  const panState = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
    container: null
  });
  const clampedPagesPerView = Math.min(Math.max(pagesPerView, 1), 3);

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

  const activateStage = useCallback(() => {
    setStageActive(true);
    if (stageActivityTimer.current) {
      clearTimeout(stageActivityTimer.current);
    }
    stageActivityTimer.current = setTimeout(() => {
      setStageActive(false);
      stageActivityTimer.current = null;
    }, 1000);
  }, []);

  const computeFitScale = useCallback(() => {
    const baseWidth = pageBaseRef.current.width;
    if (!baseWidth) return;
    const container = viewMode === 'single' ? singleRef.current : canvasRef.current;
    const host = container || readerStageRef.current;
    if (!host) return;
    const padding = 16;
    const gapTotal = (clampedPagesPerView - 1) * PAGE_GAP;
    const available = Math.max(host.clientWidth - padding, 200);
    const usable = Math.max(available - gapTotal, 160);
    const fit = usable / (baseWidth * clampedPagesPerView);
    const minScale = clampedPagesPerView > 1 ? MIN_ZOOM : 1;
    const nextScale = Math.min(Math.max(fit, minScale), MAX_ZOOM);
    setFitScale(nextScale);
    const contentWidth = baseWidth * nextScale * zoom * clampedPagesPerView + gapTotal;
    setIsCentered(contentWidth < host.clientWidth - 10);
  }, [viewMode, zoom, MAX_ZOOM, MIN_ZOOM, clampedPagesPerView, PAGE_GAP]);

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
    const gapTotal = (clampedPagesPerView - 1) * PAGE_GAP;
    const contentWidth = baseWidth * fitScale * zoom * clampedPagesPerView + gapTotal;
    setIsCentered(contentWidth < host.clientWidth - 10);
  }, [fitScale, zoom, viewMode, clampedPagesPerView, PAGE_GAP]);

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
      activateStage();
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
  }, [activateStage]);

  useEffect(() => {
    const stage = readerStageRef.current;
    if (!stage) return;

    const handleMouseMove = () => {
      activateStage();
    };

    const handleMouseLeave = () => {
      if (stageActivityTimer.current) {
        clearTimeout(stageActivityTimer.current);
        stageActivityTimer.current = null;
      }
      setStageActive(false);
    };

    stage.addEventListener('mousemove', handleMouseMove);
    stage.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      stage.removeEventListener('mousemove', handleMouseMove);
      stage.removeEventListener('mouseleave', handleMouseLeave);
      if (stageActivityTimer.current) {
        clearTimeout(stageActivityTimer.current);
        stageActivityTimer.current = null;
      }
    };
  }, [activateStage]);

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

  const handleOpenMetronome = useCallback(() => {
    if (api?.window?.openMetronome) {
      api.window.openMetronome();
    }
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
    const factor = Math.exp(-event.deltaY * 0.0003333);
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
        const maxStart = Math.max(pageCount - clampedPagesPerView, 0);
        if (event.key === 'ArrowRight') {
          setSinglePageIndex((prev) => Math.min(prev + clampedPagesPerView, maxStart));
        }
        if (event.key === 'ArrowLeft') {
          setSinglePageIndex((prev) => Math.max(prev - clampedPagesPerView, 0));
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
  }, [selectedDoc, viewMode, pageCount, clampedPagesPerView, setSinglePageIndex, toggleFullscreen, toggleSidebarPinned, toggleFocusMode]);

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
    if (viewMode !== 'single' || pageDelay <= 0 || pageCount <= clampedPagesPerView) return undefined;
    const maxStart = Math.max(pageCount - clampedPagesPerView, 0);
    const timer = setInterval(() => {
      setSinglePageIndex((prev) => {
        if (prev >= maxStart) return prev;
        return Math.min(prev + clampedPagesPerView, maxStart);
      });
    }, pageDelay * 1000);
    return () => clearInterval(timer);
  }, [viewMode, pageDelay, pageCount, clampedPagesPerView, setSinglePageIndex]);

  const handleSelect = useCallback((doc) => {
    setSelectedDoc(doc);
    setSinglePageIndex(doc.page_index || 0);
  }, [setSelectedDoc, setSinglePageIndex]);

  const handleImport = useCallback(async () => {
    const result = await importFiles();
    const importedPaths = result?.importedPaths || [];
    const importedDocs = result?.documents || documents;
    if (!importedPaths.length) return;
    const lastPath = importedPaths[importedPaths.length - 1];
    const nextDoc = importedDocs.find((doc) => doc.file_path === lastPath);
    if (nextDoc) {
      handleSelect(nextDoc);
    }
  }, [importFiles, documents, handleSelect]);

  useEffect(() => {
    if (!api?.onMenuImportPdf || !api?.onMenuLibraryLocation) return undefined;
    const offImport = api.onMenuImportPdf(() => handleImport());
    const offLocation = api.onMenuLibraryLocation(() => chooseLibraryRoot());
    return () => {
      if (offImport) offImport();
      if (offLocation) offLocation();
    };
  }, [handleImport, chooseLibraryRoot]);

  useEffect(() => {
    if (pageCount === 0) return;
    const maxStart = Math.max(pageCount - clampedPagesPerView, 0);
    if (singlePageIndex > maxStart) {
      setSinglePageIndex(maxStart);
    }
  }, [pageCount, clampedPagesPerView, singlePageIndex, setSinglePageIndex]);

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter((doc) => (doc.title || '').toLowerCase().includes(term));
  }, [documents, search]);

  const sidebarVisible = sidebarPinned || sidebarHover;
  const maxStartIndex = Math.max(pageCount - clampedPagesPerView, 0);
  const isPrevDisabled = !selectedDoc || singlePageIndex <= 0;
  const isNextDisabled = !selectedDoc || pageCount === 0 || singlePageIndex >= maxStartIndex;
  const singlePageIndices = useMemo(() => {
    if (!selectedDoc || !pdfDoc) return [];
    const remaining = pageCount - singlePageIndex;
    const count = Math.min(clampedPagesPerView, remaining);
    if (count <= 0) return [];
    return Array.from({ length: count }, (_, offset) => singlePageIndex + offset);
  }, [selectedDoc, pdfDoc, pageCount, singlePageIndex, clampedPagesPerView]);

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
              <div className="control-group">
                <label>View</label>
                <div className="segmented" role="group" aria-label="View mode">
                  <button
                    type="button"
                    className={viewMode === 'continuous' ? 'active' : ''}
                    onClick={() => setViewMode('continuous')}
                    aria-pressed={viewMode === 'continuous'}
                  >
                    Continues
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'single' ? 'active' : ''}
                    onClick={() => setViewMode('single')}
                    aria-pressed={viewMode === 'single'}
                  >
                    Page by Page
                  </button>
                </div>
              </div>
              <div className="control-group">
                <label>Pages / View</label>
                <div className="segmented" role="group" aria-label="Pages per view">
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={clampedPagesPerView === count ? 'active' : ''}
                      onClick={() => setPagesPerView(count)}
                      aria-pressed={clampedPagesPerView === count}
                    >
                      {count}
                    </button>
                  ))}
                </div>
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
              {viewMode === 'continuous' && (
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
              )}
              {viewMode === 'single' && (
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
              )}
              <button
                type="button"
                className="metronome-launch"
                onClick={handleOpenMetronome}
                aria-label="Open metronome"
                title="Open metronome"
              >
                <img
                  className="metronome-launch-icon"
                  src={metronomeIcon}
                  alt=""
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          <div id="reader-stage" className="reader-stage" ref={readerStageRef}>
            <div className={`stage-controls ${stageActive ? 'visible' : ''}`}>
              <button
                className={`stage-btn ${focusMode ? 'active' : ''}`}
                onClick={toggleFocusMode}
                title={focusMode ? 'Exit Focus (Z)' : 'Focus Mode (Z)'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {focusMode ? (
                    <>
                      <path d="M9 4v5H4" />
                      <path d="M15 4v5h5" />
                      <path d="M9 20v-5H4" />
                      <path d="M15 20v-5h5" />
                    </>
                  ) : (
                    <>
                      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                    </>
                  )}
                </svg>
              </button>
              <button
                className="stage-btn"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isFullscreen ? (
                    <>
                      <path d="M4 14h6v6" />
                      <path d="M20 10h-6V4" />
                      <path d="M14 10l7-7" />
                      <path d="M3 21l7-7" />
                    </>
                  ) : (
                    <>
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <polyline points="21 3 14 10" />
                      <polyline points="3 21 10 14" />
                    </>
                  )}
                </svg>
              </button>
            </div>
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
              {!pageLoading && !selectedDoc && (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12h6" />
                      <path d="M12 9v6" />
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <h3 className="empty-title">No Score Selected</h3>
                  <p className="empty-desc">Choose a score from the library or import new files</p>
                  <button className="empty-btn" onClick={handleImport}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Import PDF
                  </button>
                </div>
              )}
              <div className="page-stack" style={{ '--pages-per-view': clampedPagesPerView }}>
                {selectedDoc && pdfDoc && Array.from({ length: pageCount }).map((_, index) => (
                  <div className="page-shell" key={`${selectedDoc.id}-${index}`}>
                    <PageCanvas pdfDoc={pdfDoc} pageIndex={index} zoom={zoom * fitScale} />
                  </div>
                ))}
              </div>
            </div>

            <div
              id="single-page"
              className={`single-page ${viewMode === 'single' ? '' : 'hidden'} ${stageActive ? 'nav-visible' : ''}`}
            >
              <button
                className="nav nav-prev"
                onClick={() => setSinglePageIndex((prev) => Math.max(prev - clampedPagesPerView, 0))}
                disabled={isPrevDisabled}
                aria-label="Previous page"
                title="Previous page"
              >
                <span className="nav-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="14 6 8 12 14 18" />
                  </svg>
                </span>
              </button>
              <div
                className={`single-container ${isCentered ? 'centered' : ''}`}
                ref={singleRef}
                onMouseDown={beginPan}
                onDoubleClick={handleDoubleClick}
                onWheel={handleWheelZoom}
              >
                {pageLoading && <div className="empty">Rendering pages...</div>}
                {pdfError && <div className="empty">Failed to load PDF: {pdfError}</div>}
                {!pageLoading && !selectedDoc && (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 12h6" />
                        <path d="M12 9v6" />
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                    <h3 className="empty-title">No Score Selected</h3>
                    <p className="empty-desc">Choose a score from the library or import new files</p>
                    <button className="empty-btn" onClick={handleImport}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Import PDF
                    </button>
                  </div>
                )}
                {!pageLoading && selectedDoc && pdfDoc && (
                  <div className="page-stack single-stack" style={{ '--pages-per-view': clampedPagesPerView }}>
                    {singlePageIndices.map((index) => (
                      <div className="page-shell" key={`${selectedDoc.id}-${index}`}>
                        <PageCanvas pdfDoc={pdfDoc} pageIndex={index} zoom={zoom * fitScale} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="nav nav-next"
                onClick={() =>
                  setSinglePageIndex((prev) => Math.min(prev + clampedPagesPerView, maxStartIndex))
                }
                disabled={isNextDisabled}
                aria-label="Next page"
                title="Next page"
              >
                <span className="nav-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="10 6 16 12 10 18" />
                  </svg>
                </span>
              </button>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}

function AppRoot() {
  const view = getAppView();
  return view === 'metronome' ? <MetronomeWindow /> : <MainApp />;
}

export default AppRoot;
