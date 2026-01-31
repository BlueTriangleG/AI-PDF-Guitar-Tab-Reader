import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLibrary } from './view_models/useLibrary.js';
import { useReader } from './view_models/useReader.js';

const api = window.api;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.12;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const STANDARD_TUNING = [
  { note: 'E', octave: 2 },
  { note: 'A', octave: 2 },
  { note: 'D', octave: 3 },
  { note: 'G', octave: 3 },
  { note: 'B', octave: 3 },
  { note: 'E', octave: 4 }
];
const I18N = {
  en: {
    appName: 'AI PDF Guitar Tab Reader',
    defaultLabel: 'Default',
    autoLabel: 'Auto',
    scoresCount: '{count} Score',
    scoresCountPlural: '{count} Scores',
    itemsCount: '{count} item',
    itemsCountPlural: '{count} items',
    pagesCountSingle: '{count} page',
    pagesCount: '{count} pages',
    pagesLoaded: '{count} pages loaded',
    readerTagline: 'PDF reader with guided practice tools',
    readerSelectScore: 'Select a score',
    readerResume: 'Resume',
    readerNew: 'New',
    libraryTitle: 'Library',
    librarySubtitle: 'All your scores, in one place.',
    librarySearch: 'Search library',
    libraryMyLibrary: 'My Library',
    libraryPosition: 'Position',
    libraryHistory: 'History',
    libraryNoRecent: 'No recent scores yet',
    libraryLoading: 'Loading library...',
    libraryDropTitle: 'Drop to Add',
    libraryDropHint: 'Drop folders to link them, or PDFs to import',
    libraryViewGrid: 'Grid',
    libraryViewList: 'List',
    librarySortAdded: 'Added',
    librarySortName: 'Name',
    librarySortLastOpened: 'Last Opened',
    libraryNoFolders: 'No folders here yet.',
    libraryNoScores: 'No scores here yet.',
    libraryOpenStack: 'Open as Stack',
    libraryCopy: 'Copy',
    libraryCut: 'Cut',
    libraryPaste: 'Paste',
    libraryDelete: 'Delete',
    libraryNewFolder: 'New Folder',
    libraryFolderName: 'Folder name',
    libraryCancel: 'Cancel',
    libraryCreate: 'Create',
    libraryDeleteConfirm: 'Delete {count} item(s)? This cannot be undone.',
    libraryDeleteSelection: 'Delete {label}? This cannot be undone.',
    librarySortAsc: 'Sort ascending',
    librarySortDesc: 'Sort descending',
    libraryImportFiles: 'Import Files',
    libraryLinkFolder: 'Add Folder',
    favoriteAdd: 'Mark as favorite',
    favoriteRemove: 'Remove favorite',
    readerSearch: 'Search title, tags',
    readerView: 'View',
    readerViewContinuous: 'Continuous',
    readerViewSingle: 'Page by Page',
    readerPagesPerView: 'Pages / View',
    readerZoom: 'Zoom',
    readerAutoScroll: 'Auto Scroll',
    readerAutoPage: 'Auto Page Turn',
    readerZoomOut: 'Zoom out',
    readerZoomIn: 'Zoom in',
    readerZoomFit: 'Fit to view',
    readerViewModeLabel: 'View mode',
    readerPagesPerViewLabel: 'Pages per view',
    readerZoomControlsLabel: 'Zoom controls',
    readerFocusEnter: 'Focus Mode (Z)',
    readerFocusExit: 'Exit Focus (Z)',
    readerFullscreenEnter: 'Fullscreen (F)',
    readerFullscreenExit: 'Exit Fullscreen (F)',
    readerOpenLibrary: 'Open Library',
    readerOpenFolder: 'Open folder in library',
    readerPin: 'Pin sidebar',
    readerUnpin: 'Unpin sidebar',
    readerOpenMetronome: 'Open metronome',
    readerOpenTuner: 'Open tuner',
    readerOpenRecording: 'Open recording',
    readerImagesLabel: 'Images',
    readerImageAlt: 'Image',
    readerRenderFailed: 'Render failed',
    readerPrevPage: 'Previous page',
    readerNextPage: 'Next page',
    readerEmptyTitle: 'No Score Selected',
    readerEmptyDesc: 'Choose a score from the library or import new files',
    readerImport: 'Import Files',
    readerOpenImages: 'Open Images',
    readerLoadingLibrary: 'Loading library...',
    readerImportHint: 'Import PDFs to start your gallery.',
    readerFailedLoad: 'Failed to load: {error}',
    readerPages: '{count} pages',
    librarySortLabel: 'Sort scores',
    commonUntitled: 'Untitled',
    commonPreview: 'Preview',
    commonBack: 'Back',
    recordingTitle: 'Recording',
    recordingSubtitle: 'Record audio or video sessions',
    recordingTabAudio: 'Record',
    recordingTabVideo: 'Video',
    recordingAudioLabel: 'Audio',
    recordingVideoLabel: 'Video',
    recordingFormatLabel: 'Format',
    recordingAudioFolder: 'Audio',
    recordingVideoFolder: 'Video',
    recordingSaving: 'Saving...',
    recordingStatus: 'Recording {kind}',
    recordingAudioKind: 'audio',
    recordingVideoKind: 'video',
    recordingNotSupported: 'Recording not supported.',
    recordingFailed: 'Recording failed.',
    recordingMicDenied: 'Microphone or camera permission denied.',
    recordingMicUnavailable: 'Microphone unavailable.',
    recordingCameraUnavailable: 'Camera unavailable.',
    recordingRecordAudio: 'Record audio',
    recordingStopAudio: 'Stop audio recording',
    recordingRecordVideo: 'Record video',
    recordingStopVideo: 'Stop video recording',
    recordingMicrophone: 'Microphone {index}',
    recordingCamera: 'Camera {index}',
    settingsTitle: 'Settings',
    settingsSubtitle: 'Personalize your experience',
    settingsLanguage: 'Language',
    languageEnglish: 'English',
    languageChinese: '中文',
    metronomeTitle: 'Metronome',
    metronomeSubtitle: 'Feel the pulse. Keep the groove.',
    metronomeStart: 'Start',
    metronomeStop: 'Stop',
    metronomeTempo: 'Tempo',
    metronomeBpm: 'BPM',
    metronomeBeatDisplay: 'Beat display',
    metronomeCountIn: 'Count-in: {count} {unit}',
    metronomeBeat: 'Beat {current} / {total}',
    metronomeReady: 'Ready',
    metronomeTime: 'Time',
    metronomeSubdivision: 'Subdivision',
    metronomeCountInLabel: 'Count-in',
    metronomeNoCountIn: 'No Count-In',
    metronomeBar: 'bar',
    metronomeBars: 'bars',
    metronomeTriplet: 'Triplet',
    metronomeBarCount: '{count} {unit}',
    metronomeHint: 'Space to start/stop',
    tunerTitle: 'Tuner',
    tunerSubtitleTune: 'Pick a tuning and tune each string',
    tunerSubtitleManage: 'Manage your tuning sets',
    tunerEdit: 'Edit Tunings',
    tunerBack: 'Back to Tuner',
    tunerStandard: 'Standard',
    tunerTuning: 'Tuning',
    tunerDelete: 'Delete',
    tunerNamePlaceholder: 'Tuning name',
    tunerSave: 'Save',
    tunerSaveAs: 'Save As New',
    tunerClarity: 'Clarity',
    tunerMicNotSupported: 'Microphone not supported.',
    tunerMicDenied: 'Microphone permission denied.'
  },
  zh: {
    appName: 'AI PDF Guitar Tab Reader',
    defaultLabel: '默认',
    autoLabel: '自动',
    scoresCount: '{count} 个谱子',
    scoresCountPlural: '{count} 个谱子',
    itemsCount: '{count} 个项目',
    itemsCountPlural: '{count} 个项目',
    pagesCountSingle: '{count} 页',
    pagesCount: '{count} 页',
    pagesLoaded: '已加载 {count} 页',
    readerTagline: 'PDF 阅读与练习工具',
    readerSelectScore: '选择一个谱子',
    readerResume: '继续',
    readerNew: '新',
    libraryTitle: '乐谱库',
    librarySubtitle: '所有谱子都在这里。',
    librarySearch: '搜索乐谱库',
    libraryMyLibrary: '我的乐谱库',
    libraryPosition: '位置',
    libraryHistory: '历史',
    libraryNoRecent: '暂无最近打开的谱子',
    libraryLoading: '正在加载乐谱库...',
    libraryDropTitle: '拖拽添加',
    libraryDropHint: '拖拽文件夹以链接，或拖拽 PDF 以导入',
    libraryViewGrid: '网格',
    libraryViewList: '列表',
    librarySortAdded: '添加时间',
    librarySortName: '名称',
    librarySortLastOpened: '上次打开',
    libraryNoFolders: '这里还没有文件夹。',
    libraryNoScores: '这里还没有谱子。',
    libraryOpenStack: '合并打开',
    libraryCopy: '复制',
    libraryCut: '剪切',
    libraryPaste: '粘贴',
    libraryDelete: '删除',
    libraryNewFolder: '新建文件夹',
    libraryFolderName: '文件夹名称',
    libraryCancel: '取消',
    libraryCreate: '创建',
    libraryDeleteConfirm: '删除 {count} 个项目？此操作无法撤销。',
    libraryDeleteSelection: '删除 {label}？此操作无法撤销。',
    librarySortAsc: '升序',
    librarySortDesc: '降序',
    libraryImportFiles: '导入文件',
    libraryLinkFolder: '添加文件夹',
    favoriteAdd: '加入收藏',
    favoriteRemove: '取消收藏',
    readerSearch: '搜索标题或标签',
    readerView: '视图',
    readerViewContinuous: '连续滚动',
    readerViewSingle: '逐页阅读',
    readerPagesPerView: '每屏页数',
    readerZoom: '缩放',
    readerAutoScroll: '自动滚动',
    readerAutoPage: '自动翻页',
    readerZoomOut: '缩小',
    readerZoomIn: '放大',
    readerZoomFit: '适配',
    readerViewModeLabel: '视图模式',
    readerPagesPerViewLabel: '每屏页数',
    readerZoomControlsLabel: '缩放控制',
    readerFocusEnter: '进入专注 (Z)',
    readerFocusExit: '退出专注 (Z)',
    readerFullscreenEnter: '全屏 (F)',
    readerFullscreenExit: '退出全屏 (F)',
    readerOpenLibrary: '打开乐谱库',
    readerOpenFolder: '在乐谱库中打开',
    readerPin: '固定侧边栏',
    readerUnpin: '取消固定侧边栏',
    readerOpenMetronome: '打开节拍器',
    readerOpenTuner: '打开调音器',
    readerOpenRecording: '打开录音',
    readerImagesLabel: '图片',
    readerImageAlt: '图片',
    readerRenderFailed: '渲染失败',
    readerPrevPage: '上一页',
    readerNextPage: '下一页',
    readerEmptyTitle: '尚未选择谱子',
    readerEmptyDesc: '从乐谱库选择或导入新文件',
    readerImport: '导入文件',
    readerOpenImages: '打开图片',
    readerLoadingLibrary: '正在加载乐谱库...',
    readerImportHint: '导入 PDF 开始你的谱库',
    readerFailedLoad: '加载失败：{error}',
    readerPages: '{count} 页',
    librarySortLabel: '排序',
    commonUntitled: '未命名',
    commonPreview: '预览',
    commonBack: '返回',
    recordingTitle: '录制',
    recordingSubtitle: '录制音频或视频',
    recordingTabAudio: '录音',
    recordingTabVideo: '录像',
    recordingAudioLabel: '音频',
    recordingVideoLabel: '视频',
    recordingFormatLabel: '格式',
    recordingAudioFolder: '音频',
    recordingVideoFolder: '视频',
    recordingSaving: '保存中...',
    recordingStatus: '正在录制{kind}',
    recordingAudioKind: '音频',
    recordingVideoKind: '视频',
    recordingNotSupported: '当前不支持录制。',
    recordingFailed: '录制失败。',
    recordingMicDenied: '麦克风或摄像头权限被拒绝。',
    recordingMicUnavailable: '麦克风不可用。',
    recordingCameraUnavailable: '摄像头不可用。',
    recordingRecordAudio: '开始录音',
    recordingStopAudio: '停止录音',
    recordingRecordVideo: '开始录像',
    recordingStopVideo: '停止录像',
    recordingMicrophone: '麦克风 {index}',
    recordingCamera: '摄像头 {index}',
    settingsTitle: '设置',
    settingsSubtitle: '个性化你的体验',
    settingsLanguage: '语言',
    languageEnglish: 'English',
    languageChinese: '中文',
    metronomeTitle: '节拍器',
    metronomeSubtitle: '感受节拍，保持律动。',
    metronomeStart: '开始',
    metronomeStop: '停止',
    metronomeTempo: '速度',
    metronomeBpm: 'BPM',
    metronomeBeatDisplay: '节拍显示',
    metronomeCountIn: '预备：{count}{unit}',
    metronomeBeat: '第 {current} 拍 / 共 {total} 拍',
    metronomeReady: '准备就绪',
    metronomeTime: '拍号',
    metronomeSubdivision: '细分',
    metronomeCountInLabel: '预备',
    metronomeNoCountIn: '不预备',
    metronomeBar: '小节',
    metronomeBars: '小节',
    metronomeTriplet: '三连音',
    metronomeBarCount: '{count}{unit}',
    metronomeHint: '空格开始/暂停',
    tunerTitle: '调音器',
    tunerSubtitleTune: '选择调弦并逐弦调音',
    tunerSubtitleManage: '管理调弦组合',
    tunerEdit: '编辑调弦',
    tunerBack: '返回调音',
    tunerStandard: '标准',
    tunerTuning: '调弦',
    tunerDelete: '删除',
    tunerNamePlaceholder: '调弦名称',
    tunerSave: '保存',
    tunerSaveAs: '另存为新组合',
    tunerClarity: '清晰度',
    tunerMicNotSupported: '不支持麦克风。',
    tunerMicDenied: '麦克风权限被拒绝。'
  }
};

function noteToFrequency(note, octave) {
  const noteIndex = NOTE_NAMES.indexOf(note);
  if (noteIndex === -1) return 0;
  const midi = (octave + 1) * 12 + noteIndex;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function useI18n() {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    if (!api?.app?.getLanguage) return undefined;
    let active = true;
    (async () => {
      try {
        const saved = await api.app.getLanguage();
        if (!active) return;
        if (saved) setLanguageState(saved);
      } catch (error) {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!api?.app?.onLanguageChanged) return undefined;
    const unsubscribe = api.app.onLanguageChanged((next) => {
      setLanguageState(next || 'en');
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const t = useCallback((key, fallback, params) => {
    const dict = I18N[language] || I18N.en;
    let text = dict[key] ?? I18N.en[key] ?? (typeof fallback === 'string' ? fallback : key);
    const vars = typeof fallback === 'object' && fallback !== null ? fallback : params;
    if (vars) {
      Object.entries(vars).forEach(([name, value]) => {
        text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), value);
      });
    }
    return text;
  }, [language]);

  const setLanguage = useCallback((next) => {
    setLanguageState(next);
    if (api?.app?.setLanguage) {
      api.app.setLanguage(next);
    }
  }, []);

  return { language, setLanguage, t };
}

function getAppView() {
  if (typeof window === 'undefined') return 'main';
  const params = new URLSearchParams(window.location.search);
  return params.get('view') || 'main';
}

function formatCount(t, count) {
  const total = Number(count) || 0;
  if (total === 1) return t('scoresCount', { count: 1 });
  return t('scoresCountPlural', { count: total });
}

function formatItemCount(t, count) {
  const total = Number(count) || 0;
  if (total === 1) return t('itemsCount', { count: 1 });
  return t('itemsCountPlural', { count: total });
}

function formatPagesCount(t, count) {
  const total = Number(count) || 0;
  if (total === 1) return t('pagesCountSingle', { count: 1 });
  return t('pagesCount', { count: total });
}

function basenameForPath(value) {
  if (!value) return '';
  return value.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || value;
}

function normalizePath(value) {
  if (!value) return '';
  return value.replace(/[\\/]+$/, '');
}

function getParentDir(value) {
  const trimmed = normalizePath(value);
  if (!trimmed) return '';
  const lastSlash = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  if (lastSlash <= 0) return '';
  return trimmed.slice(0, lastSlash);
}

function getRelativePath(targetPath, rootPath) {
  const root = normalizePath(rootPath);
  if (!targetPath || !root) return '';
  if (!targetPath.startsWith(root)) return '';
  let relative = targetPath.slice(root.length);
  relative = relative.replace(/^[\\/]+/, '');
  return relative;
}

function pickRecordingMimeType(kind) {
  if (typeof window === 'undefined') return '';
  const Recorder = window.MediaRecorder;
  if (!Recorder || typeof Recorder.isTypeSupported !== 'function') return '';
  const candidates = kind === 'video'
    ? [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ]
    : [
        'audio/mpeg',
        'audio/mp3',
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/webm'
      ];
  return candidates.find((type) => Recorder.isTypeSupported(type)) || '';
}

function getSupportedRecordingMimeTypes(kind) {
  if (typeof window === 'undefined') return [];
  const Recorder = window.MediaRecorder;
  if (!Recorder || typeof Recorder.isTypeSupported !== 'function') return [];
  const candidates = kind === 'video'
    ? [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ]
    : [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg;codecs=opus',
        'audio/webm;codecs=opus',
        'audio/webm'
      ];
  return candidates.filter((type) => Recorder.isTypeSupported(type));
}

function labelForMimeType(mimeType) {
  if (!mimeType) return 'Default';
  if (mimeType.includes('mp4')) return 'MP4';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'MP3';
  if (mimeType.includes('wav')) return 'WAV';
  if (mimeType.includes('ogg')) return 'OGG';
  if (mimeType.includes('webm')) return 'WEBM';
  return mimeType;
}

function isUnderRoot(filePath, rootPath) {
  const root = normalizePath(rootPath);
  if (!filePath || !root) return false;
  if (!filePath.startsWith(root)) return false;
  if (filePath.length === root.length) return true;
  const next = filePath.charAt(root.length);
  return next === '/' || next === '\\';
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

function PageCanvas({ pdfDoc, pageIndex, zoom, t }) {
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
          const fallback = typeof t === 'function' ? t('readerRenderFailed') : 'Render failed';
          setError(error?.message || fallback);
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
  }, [pdfDoc, pageIndex, zoom, t]);

  return (
    <div className="canvas-wrap">
      {!rendered && <div className="page-placeholder" />}
      {error && <div className="page-error">{error}</div>}
      <canvas ref={canvasRef} className={`pdf-canvas ${rendered ? 'visible' : ''}`} />
    </div>
  );
}

function DocPreview({ filePath, label, fileType }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState(false);
  const objectUrlRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl('');
    setError(false);
    if (!filePath) return undefined;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }

    (async () => {
      try {
        const ext = filePath.toLowerCase().split('.').pop();
        const isImage = fileType === 'image' || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext);
        let blobUrl = '';

        if (isImage) {
          if (api.fileReadAsDataUrl) {
            blobUrl = await api.fileReadAsDataUrl(filePath);
          } else if (api.fileUrlFromPath) {
            blobUrl = await api.fileUrlFromPath(filePath);
          } else {
            throw new Error('No image loader available');
          }
        } else {
          if (!api?.pdf?.renderPage) {
            throw new Error('No PDF renderer available');
          }
          const outputPath = await api.pdf.renderPage(filePath, 0, 0.3);
          if (cancelled) return;
          if (api.pdf.readFile) {
            const data = await api.pdf.readFile(outputPath);
            if (cancelled) return;
            const bytes = data?.buffer
              ? data
              : data?.data
                ? new Uint8Array(data.data)
                : new Uint8Array(data || []);
            const blob = new Blob([bytes], { type: 'image/png' });
            blobUrl = URL.createObjectURL(blob);
          } else if (api.fileUrlFromPath) {
            blobUrl = await api.fileUrlFromPath(outputPath);
          } else {
            blobUrl = outputPath;
          }
        }

        if (cancelled) return;
        objectUrlRef.current = blobUrl;
        setPreviewUrl(blobUrl);
      } catch (err) {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = '';
      }
    };
  }, [filePath, fileType]);

  return (
    <div className={`doc-preview ${previewUrl ? 'ready' : ''} ${error ? 'error' : ''}`}>
      {previewUrl ? (
        <img src={previewUrl} alt={label} loading="lazy" />
      ) : (
        <div className="doc-preview-placeholder" />
      )}
    </div>
  );
}

function MetronomeWindow() {
  const { t } = useI18n();
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
  const countInLabel = beatState.countInBarsRemaining === 1 ? t('metronomeBar') : t('metronomeBars');

  return (
    <div className={`metronome-window ${metronomeOn ? 'running' : ''}`}>
      <div className="metronome-drag" aria-hidden="true" />
      <header className="metronome-head">
        <div className="metronome-title-block">
          <div className="metronome-title">{t('metronomeTitle')}</div>
          <div className="metronome-sub">{t('metronomeSubtitle')}</div>
        </div>
        <button
          id="metronome-toggle"
          className={`metronome-toggle ${metronomeOn ? 'active' : ''}`}
          onClick={() => setMetronomeOn((prev) => !prev)}
        >
          <span className="toggle-label">{metronomeOn ? t('metronomeStop') : t('metronomeStart')}</span>
          <span className={`toggle-dot ${pulse ? 'active' : ''}`} aria-hidden="true" />
        </button>
      </header>
      <div className="metronome-main">
        <div className="metronome-tempo">
          <label htmlFor="bpm">{t('metronomeTempo')}</label>
          <div className="bpm-row">
            <input
              id="bpm"
              type="number"
              min="40"
              max="220"
              value={bpm}
              onChange={(event) => setBpm(parseInt(event.target.value || '0', 10))}
            />
            <span className="bpm-unit">{t('metronomeBpm')}</span>
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
            aria-label={t('metronomeBeatDisplay')}
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
                ? t('metronomeCountIn', { count: beatState.countInBarsRemaining, unit: countInLabel })
                : t('metronomeBeat', { current: clampedBeatIndex, total: timeSignature })
              : t('metronomeReady')}
          </div>
        </div>
      </div>
      <div className="metronome-settings">
        <div className="setting">
          <label htmlFor="time-signature">{t('metronomeTime')}</label>
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
          <label htmlFor="subdivision">{t('metronomeSubdivision')}</label>
          <select
            id="subdivision"
            value={subdivision}
            onChange={(event) => setSubdivision(parseInt(event.target.value, 10))}
          >
            <option value={1}>1/4</option>
            <option value={2}>1/8</option>
            <option value={3}>{t('metronomeTriplet')}</option>
            <option value={4}>1/16</option>
          </select>
        </div>
        <div className="setting">
          <label htmlFor="count-in">{t('metronomeCountInLabel')}</label>
          <select
            id="count-in"
            value={countInBars}
            onChange={(event) => setCountInBars(parseInt(event.target.value, 10))}
          >
            <option value={0}>{t('metronomeNoCountIn')}</option>
            {[1, 2, 3, 4].map((count) => (
              <option key={count} value={count}>
                {t('metronomeBarCount', { count, unit: count === 1 ? t('metronomeBar') : t('metronomeBars') })}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="metronome-footer">
        <span className="metronome-hint">{t('metronomeHint')}</span>
      </div>
    </div>
  );
}

function detectPitch(buffer, sampleRate, minFreq, maxFreq) {
  const size = buffer.length;
  let rms = 0;
  for (let i = 0; i < size; i += 1) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.00008) return null;

  let r1 = 0;
  let r2 = size - 1;
  const threshold = 0.0008;
  while (r1 < size / 2 && Math.abs(buffer[r1]) < threshold) r1 += 1;
  while (r2 > size / 2 && Math.abs(buffer[r2]) < threshold) r2 -= 1;

  const trimmed = buffer.slice(r1, r2);
  const trimmedSize = trimmed.length;
  if (trimmedSize < 2) return null;

  const c = new Array(trimmedSize).fill(0);
  for (let lag = 0; lag < trimmedSize; lag += 1) {
    let sum = 0;
    for (let i = 0; i < trimmedSize - lag; i += 1) {
      sum += trimmed[i] * trimmed[i + lag];
    }
    c[lag] = sum;
  }

  let d = 0;
  while (d < trimmedSize - 1 && c[d] > c[d + 1]) d += 1;

  let maxPos = -1;
  let maxVal = -1;
  for (let i = d; i < trimmedSize; i += 1) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }
  if (maxPos <= 0) return null;

  let T0 = maxPos;
  if (maxPos > 0 && maxPos < trimmedSize - 1) {
    const x1 = c[maxPos - 1];
    const x2 = c[maxPos];
    const x3 = c[maxPos + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) {
      T0 = maxPos - b / (2 * a);
    }
  }

  const frequency = sampleRate / T0;
  const clarity = c[0] ? maxVal / c[0] : 0;
  if (minFreq && frequency < minFreq) return null;
  if (maxFreq && frequency > maxFreq) return null;
  return { frequency, clarity };
}

function TunerWindow() {
  const { t } = useI18n();
  const [listening, setListening] = useState(true);
  const [frequency, setFrequency] = useState(null);
  const [clarity, setClarity] = useState(0);
  const [error, setError] = useState('');
  const [selectedStringIndex, setSelectedStringIndex] = useState(0);
  const [tunings, setTunings] = useState(() => ([
    { id: 'standard', name: t('tunerStandard'), strings: STANDARD_TUNING }
  ]));
  const [activeTuningId, setActiveTuningId] = useState('standard');
  const [tunerView, setTunerView] = useState('tune');
  const [editingId, setEditingId] = useState('standard');
  const [draftName, setDraftName] = useState(t('tunerStandard'));
  const [draftStrings, setDraftStrings] = useState(STANDARD_TUNING);
  const [meterOffset, setMeterOffset] = useState(0);
  const [completedStrings, setCompletedStrings] = useState(() => new Set());
  const inTuneStartRef = useRef(null);

  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const historyRef = useRef([]);
  const lastUpdateRef = useRef(0);
  const meterRef = useRef(null);

  useEffect(() => {
    if (!api?.settings) return undefined;
    let active = true;
    (async () => {
      try {
        const saved = await api.settings.get('tuner.tunings');
        const savedActive = await api.settings.get('tuner.active');
        if (!active) return;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTunings(parsed);
          }
        }
        if (savedActive) {
          setActiveTuningId(savedActive);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!api?.settings) return;
    api.settings.set('tuner.tunings', JSON.stringify(tunings));
    api.settings.set('tuner.active', activeTuningId);
  }, [tunings, activeTuningId]);

  const localizedTunings = useMemo(() => {
    return tunings.map((tuning) => (
      tuning.id === 'standard' ? { ...tuning, name: t('tunerStandard') } : tuning
    ));
  }, [tunings, t]);

  const activeTuning = useMemo(() => {
    return localizedTunings.find((tuning) => tuning.id === activeTuningId) || localizedTunings[0];
  }, [localizedTunings, activeTuningId]);

  useEffect(() => {
    setSelectedStringIndex(0);
    setCompletedStrings(new Set());
  }, [activeTuningId]);

  const editingTuning = useMemo(() => {
    return localizedTunings.find((tuning) => tuning.id === editingId) || localizedTunings[0];
  }, [localizedTunings, editingId]);

  useEffect(() => {
    setDraftName(editingTuning?.name || t('tunerTuning'));
    setDraftStrings(editingTuning?.strings || STANDARD_TUNING);
  }, [editingTuning, t]);

  const currentTarget = useMemo(() => {
    const strings = activeTuning?.strings || STANDARD_TUNING;
    return strings[selectedStringIndex] || strings[0];
  }, [selectedStringIndex, activeTuning]);

  const stringSpecs = useMemo(() => {
    const strings = activeTuning?.strings || STANDARD_TUNING;
    return strings.map((s) => ({
      ...s,
      label: `${s.note}${s.octave}`,
      freq: noteToFrequency(s.note, s.octave)
    }));
  }, [activeTuning]);

  const draftSpecs = useMemo(() => {
    const strings = draftStrings || STANDARD_TUNING;
    return strings.map((s) => ({
      ...s,
      label: `${s.note}${s.octave}`,
      freq: noteToFrequency(s.note, s.octave)
    }));
  }, [draftStrings]);

  const tuningRange = useMemo(() => {
    const freqs = stringSpecs.map((s) => s.freq).filter(Boolean);
    if (!freqs.length) return { min: 70, max: 360 };
    const min = Math.min(...freqs) * 0.75;
    const max = Math.max(...freqs) * 1.35;
    return { min, max };
  }, [stringSpecs]);

  const centsOffset = useMemo(() => {
    if (!frequency) return 0;
    const targetFreq = noteToFrequency(currentTarget.note, currentTarget.octave);
    if (!targetFreq) return 0;
    return 1200 * Math.log2(frequency / targetFreq);
  }, [frequency, currentTarget]);

  const isInTune = Math.abs(centsOffset) <= 5;

  useEffect(() => {
    const meter = meterRef.current;
    if (!meter) return;
    const half = Math.max(meter.clientWidth / 2 - 6, 0);
    const clamped = Math.max(-50, Math.min(50, centsOffset));
    setMeterOffset((clamped / 50) * half);
  }, [centsOffset]);

  useEffect(() => {
    if (!listening) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.close();
        audioRef.current = null;
      }
      analyserRef.current = null;
      historyRef.current = [];
      return;
    }

    const start = async () => {
      try {
        setError('');
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext || !navigator.mediaDevices?.getUserMedia) {
          setError(t('tunerMicNotSupported'));
          setListening(false);
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        streamRef.current = stream;
        const ctx = new AudioContext();
        audioRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        await ctx.resume();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 4096;
        analyser.smoothingTimeConstant = 0.1;
        analyserRef.current = analyser;
        source.connect(analyser);

        const buffer = new Float32Array(analyser.fftSize);
        const update = (timestamp) => {
          if (!analyserRef.current || !audioRef.current) return;
          analyserRef.current.getFloatTimeDomainData(buffer);
          const result = detectPitch(buffer, audioRef.current.sampleRate, tuningRange.min, tuningRange.max);
          if (result && result.frequency) {
            historyRef.current.push(result.frequency);
            if (historyRef.current.length > 5) historyRef.current.shift();
            const sorted = [...historyRef.current].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const smoothed = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

            if (timestamp - lastUpdateRef.current > 80) {
              lastUpdateRef.current = timestamp;
              setFrequency(smoothed);
              setClarity(result.clarity);
            }
          } else if (timestamp - lastUpdateRef.current > 120) {
            lastUpdateRef.current = timestamp;
            setClarity(result?.clarity || 0);
          }
          rafRef.current = requestAnimationFrame(update);
        };

        rafRef.current = requestAnimationFrame(update);
      } catch (err) {
        setError(t('tunerMicDenied'));
        setListening(false);
      }
    };

    start();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [listening]);

  useEffect(() => {
    if (!listening) {
      inTuneStartRef.current = null;
      return;
    }
    if (!frequency || !isInTune) {
      inTuneStartRef.current = null;
      return;
    }
    if (!inTuneStartRef.current) {
      inTuneStartRef.current = performance.now();
      return;
    }
    const elapsed = performance.now() - inTuneStartRef.current;
    if (elapsed < 600) return;
    setCompletedStrings((prev) => {
      const next = new Set(prev);
      next.add(selectedStringIndex);
      return next;
    });
    inTuneStartRef.current = null;
    setSelectedStringIndex((prev) => {
      for (let i = prev + 1; i < stringSpecs.length; i += 1) {
        if (!completedStrings.has(i)) return i;
      }
      for (let i = 0; i < prev; i += 1) {
        if (!completedStrings.has(i)) return i;
      }
      return prev;
    });
  }, [frequency, isInTune, listening, selectedStringIndex, completedStrings, stringSpecs]);

  return (
    <div className={`tuner-window ${listening ? 'listening' : ''}`}>
      <div className="tuner-drag" aria-hidden="true" />
      <header className="tuner-head">
        <div className="tuner-title-block">
          <div className="tuner-title">{t('tunerTitle')}</div>
          <div className="tuner-sub">
            {tunerView === 'tune' ? t('tunerSubtitleTune') : t('tunerSubtitleManage')}
          </div>
        </div>
        <button
          type="button"
          className="tuner-mode"
          onClick={() => {
            setTunerView((prev) => {
              const next = prev === 'tune' ? 'manage' : 'tune';
              if (next === 'manage') setEditingId(activeTuningId);
              return next;
            });
          }}
        >
          {tunerView === 'tune' ? t('tunerEdit') : t('tunerBack')}
        </button>
      </header>
      <div className="tuner-main">
        {tunerView === 'tune' ? (
          <>
            <div className="tuner-tuning-row">
              <select
                value={activeTuningId}
                onChange={(event) => setActiveTuningId(event.target.value)}
                className="tuner-select"
              >
              {localizedTunings.map((tuning) => (
                <option key={tuning.id} value={tuning.id}>{tuning.name}</option>
              ))}
            </select>
            </div>
            <div className="tuner-meter" ref={meterRef}>
              <div className="tuner-meter-track" />
              <div
                className={`tuner-meter-needle ${isInTune ? 'in' : ''}`}
                style={{ transform: `translateX(${meterOffset}px) translateY(-50%)` }}
              />
            </div>
            <div className="tuner-strings">
              {stringSpecs.map((string, index) => (
                <button
                  key={string.label}
                  type="button"
                  className={`tuner-string ${index === selectedStringIndex ? 'active' : ''} ${completedStrings.has(index) ? 'done' : ''}`}
                  onClick={() => setSelectedStringIndex(index)}
                >
                  <span className="string-order">{stringSpecs.length - index}</span>
                  <span className="string-label">{string.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="tuner-manage">
            <div className="tuner-manage-list">
              {localizedTunings.map((tuning) => (
                <div key={tuning.id} className={`tuning-card ${tuning.id === editingId ? 'active' : ''}`}>
                  <div
                    className="tuning-card-main"
                    onClick={() => {
                      setEditingId(tuning.id);
                      setActiveTuningId(tuning.id);
                    }}
                  >
                    <div className="tuning-name">{tuning.name}</div>
                    <div className="tuning-notes">
                      {(tuning.strings || []).map((s) => `${s.note}${s.octave}`).join(' · ')}
                    </div>
                  </div>
                  <div className="tuning-actions">
                    {tuning.id !== 'standard' && (
                      <button
                        type="button"
                        className="danger"
                        onClick={() => {
                          setTunings((prev) => prev.filter((t) => t.id !== tuning.id));
                          if (activeTuningId === tuning.id) setActiveTuningId('standard');
                          if (editingId === tuning.id) setEditingId('standard');
                        }}
                      >
                        {t('tunerDelete')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="tuner-editor">
              <input
                type="text"
                className="tuner-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder={t('tunerNamePlaceholder')}
              />
              <div className="tuner-edit">
                {draftSpecs.map((string, index) => (
                  <div key={`${string.label}-${index}`} className="tuner-edit-row">
                    <span className="edit-order">{draftSpecs.length - index}</span>
                    <select
                      value={string.note}
                      onChange={(event) => {
                        const note = event.target.value;
                        setDraftStrings((prev) => prev.map((s, i) => (i === index ? { ...s, note } : s)));
                      }}
                    >
                      {NOTE_NAMES.map((note) => (
                        <option key={note} value={note}>{note}</option>
                      ))}
                    </select>
                    <select
                      value={string.octave}
                      onChange={(event) => {
                        const octave = parseInt(event.target.value, 10);
                        setDraftStrings((prev) => prev.map((s, i) => (i === index ? { ...s, octave } : s)));
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((oct) => (
                        <option key={oct} value={oct}>{oct}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="tuner-editor-actions">
                <button
                  type="button"
                  onClick={() => {
                    const name = draftName.trim() || t('tunerTuning');
                    if (editingId === 'standard') {
                      const id = `custom-${Date.now()}`;
                      setTunings((prev) => ([
                        ...prev,
                        { id, name, strings: draftStrings.map((s) => ({ note: s.note, octave: s.octave })) }
                      ]));
                      setEditingId(id);
                    } else {
                      setTunings((prev) => prev.map((tuning) => (
                        tuning.id === editingId
                          ? { ...tuning, name, strings: draftStrings.map((s) => ({ note: s.note, octave: s.octave })) }
                          : tuning
                      )));
                    }
                  }}
                >
                  {t('tunerSave')}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    const id = `custom-${Date.now()}`;
                    setTunings((prev) => ([
                      ...prev,
                      { id, name: draftName.trim() || t('tunerTuning'), strings: draftStrings.map((s) => ({ note: s.note, octave: s.octave })) }
                    ]));
                    setEditingId(id);
                  }}
                >
                  {t('tunerSaveAs')}
                </button>
              </div>
            </div>
          </div>
        )}
        {error && <div className="tuner-error">{error}</div>}
        <div className="tuner-clarity">
          <span>{t('tunerClarity')}</span>
          <div className="clarity-bar">
            <div className="clarity-fill" style={{ width: `${Math.min(1, clarity) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LibraryWindow() {
  const ROOT_VIEW = '__root__';
  const arrowDownIcon = `${import.meta.env.BASE_URL}icons/Arrow%20Down%20Icon.svg`;
  const { t } = useI18n();
  const [sources, setSources] = useState([]);
  const [rootFolders, setRootFolders] = useState([]);
  const [subfolders, setSubfolders] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [selectedView, setSelectedView] = useState(ROOT_VIEW);
  const [activeDocId, setActiveDocId] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sourcesReady, setSourcesReady] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [sidebarFolders, setSidebarFolders] = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sortKey, setSortKey] = useState('last_opened');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [selectedFolders, setSelectedFolders] = useState(new Set());
  const [selectedDocOrder, setSelectedDocOrder] = useState([]);
  const [lastSelectedDoc, setLastSelectedDoc] = useState(null);
  const [lastSelectedFolder, setLastSelectedFolder] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [newFolderPopup, setNewFolderPopup] = useState(false);
  const [newFolderInput, setNewFolderInput] = useState('');
  const [draggedFolder, setDraggedFolder] = useState(null);
  const [draggedDoc, setDraggedDoc] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [clipboard, setClipboard] = useState({ docs: [], folders: [], mode: null }); // mode: 'copy' or 'cut'
  const newFolderInputRef = useRef(null);

  const selectedDocItems = useMemo(
    () => allDocuments.filter((doc) => selectedDocs.has(doc.id)),
    [allDocuments, selectedDocs]
  );
  const selectedImageDocs = useMemo(
    () => selectedDocItems.filter((doc) => doc.file_type === 'image'),
    [selectedDocItems]
  );
  const canOpenImageStack = selectedImageDocs.length >= 2 && selectedImageDocs.length === selectedDocItems.length;

  useEffect(() => {
    if (!api?.settings) return undefined;
    let active = true;
    (async () => {
      try {
        const [savedKey, savedDirection] = await Promise.all([
          api.settings.get('library.sortKey'),
          api.settings.get('library.sortDirection')
        ]);
        if (!active) return;
        if (savedKey && ['added', 'name', 'last_opened'].includes(savedKey)) {
          setSortKey(savedKey);
        }
        if (savedDirection && ['asc', 'desc'].includes(savedDirection)) {
          setSortDirection(savedDirection);
        }
      } catch (error) {
        // Ignore settings read errors
      }
    })();
    return () => {
      active = false;
    };
  }, [api]);

  useEffect(() => {
    if (!api?.settings) return;
    api.settings.set('library.sortKey', sortKey);
    api.settings.set('library.sortDirection', sortDirection);
  }, [api, sortKey, sortDirection]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const openNewFolderPopup = useCallback(() => {
    setNewFolderInput('');
    setNewFolderPopup(true);
  }, []);

  const closeNewFolderPopup = useCallback(() => {
    setNewFolderPopup(false);
    setNewFolderInput('');
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDocs(new Set());
    setSelectedFolders(new Set());
    setSelectedDocOrder([]);
    setLastSelectedDoc(null);
    setLastSelectedFolder(null);
  }, []);

  const refreshSources = useCallback(async () => {
    if (!api?.library) return;
    setLoading(true);
    try {
      const [nextSources, nextFolders, nextRecent, nextDocs] = await Promise.all([
        api.library.listSources(),
        api.library.listFolders(),
        api.library.listRecent(10),
        api.library.listDocuments()
      ]);
      setSources(nextSources || []);
      setRootFolders(nextFolders || []);
      setRecentDocs(nextRecent || []);
      setAllDocuments(nextDocs || []);
      setSourcesReady(true);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const refreshSubfolders = useCallback(async (pathValue) => {
    if (!api?.library) return;
    if (!pathValue || pathValue === ROOT_VIEW) {
      setSubfolders([]);
      return;
    }
    setLoading(true);
    try {
      const nextFolders = await api.library.listFolders(pathValue);
      setSubfolders(nextFolders || []);
    } catch (error) {
      setSubfolders([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refreshSources();
    if (!api?.onLibraryChanged) return undefined;
    const unsubscribe = api.onLibraryChanged(() => {
      refreshSources();
      refreshSubfolders(selectedView);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [api, refreshSources, refreshSubfolders, selectedView]);

  useEffect(() => {
    if (!api?.onLibraryRevealFolder) return undefined;
    const unsubscribe = api.onLibraryRevealFolder((folderPath) => {
      if (!folderPath) {
        setSelectedView(ROOT_VIEW);
        clearSelection();
        return;
      }
      setSelectedView(folderPath);
      clearSelection();
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [api, clearSelection]);

  useEffect(() => {
    if (selectedView === ROOT_VIEW) {
      setSubfolders([]);
      return;
    }
    refreshSubfolders(selectedView);
  }, [selectedView, refreshSubfolders]);

  const internalSource = useMemo(
    () => sources.find((source) => source.kind === 'internal'),
    [sources]
  );
  const linkedSources = useMemo(
    () => sources.filter((source) => source.kind === 'linked'),
    [sources]
  );
  const internalRoot = internalSource?.path || '';

  const folderEntries = useMemo(() => {
    const seen = new Set();
    const entries = [];
    const add = (entry) => {
      if (!entry || seen.has(entry)) return;
      seen.add(entry);
      entries.push(entry);
    };
    rootFolders.forEach(add);
    linkedSources.forEach((source) => add(source.path));
    return entries.sort((a, b) => basenameForPath(a).localeCompare(basenameForPath(b)));
  }, [rootFolders, linkedSources]);

  const currentRoot = useMemo(() => {
    if (selectedView === ROOT_VIEW) return '';
    if (internalRoot && isUnderRoot(selectedView, internalRoot)) return internalRoot;
    const linked = linkedSources.find((source) => isUnderRoot(selectedView, source.path));
    return linked?.path || '';
  }, [selectedView, internalRoot, linkedSources]);

  const sidebarParentPath = useMemo(() => {
    if (selectedView === ROOT_VIEW) return '';
    if (!currentRoot) return '';
    const normalizedRoot = normalizePath(currentRoot);
    const normalizedInternal = normalizePath(internalRoot);
    const normalizedSelected = normalizePath(selectedView);
    const isLinkedRoot = normalizedRoot && normalizedInternal && normalizedRoot !== normalizedInternal;
    if (normalizedSelected === normalizedRoot && isLinkedRoot) {
      return currentRoot;
    }
    const parent = getParentDir(selectedView);
    if (!parent || !isUnderRoot(parent, currentRoot)) return '';
    return parent;
  }, [selectedView, currentRoot, internalRoot]);

  useEffect(() => {
    if (!sourcesReady || selectedView === ROOT_VIEW) return;
    if (!currentRoot) {
      setSelectedView(ROOT_VIEW);
    }
  }, [currentRoot, selectedView, sourcesReady]);

  const refreshSidebarFolders = useCallback(async (parentPath) => {
    if (!api?.library) return;
    if (!parentPath) {
      setSidebarFolders(folderEntries);
      return;
    }
    setSidebarLoading(true);
    try {
      const nextFolders = await api.library.listFolders(parentPath);
      setSidebarFolders(nextFolders || []);
    } catch (error) {
      setSidebarFolders([]);
    } finally {
      setSidebarLoading(false);
    }
  }, [api, folderEntries]);

  useEffect(() => {
    refreshSidebarFolders(sidebarParentPath);
  }, [sidebarParentPath, refreshSidebarFolders]);

  const currentFolders = selectedView === ROOT_VIEW ? folderEntries : subfolders;

  const currentDocs = useMemo(() => {
    if (!allDocuments.length) return [];
    if (selectedView === ROOT_VIEW) {
      const favorites = allDocuments.filter((doc) => doc.favorite);
      const rootDocs = internalRoot
        ? allDocuments.filter((doc) => normalizePath(getParentDir(doc.file_path)) === normalizePath(internalRoot))
        : [];
      const merged = new Map();
      favorites.forEach((doc) => merged.set(doc.id, doc));
      rootDocs.forEach((doc) => merged.set(doc.id, doc));
      return Array.from(merged.values());
    }
    return allDocuments.filter((doc) => normalizePath(getParentDir(doc.file_path)) === normalizePath(selectedView));
  }, [allDocuments, selectedView, internalRoot]);

  const searchTerm = sidebarSearch.trim().toLowerCase();
  const isSearchActive = searchTerm.length > 0;
  const folderCandidates = useMemo(() => {
    const seen = new Set();
    const add = (path) => {
      if (!path || seen.has(path)) return;
      seen.add(path);
    };
    rootFolders.forEach(add);
    linkedSources.forEach((source) => add(source.path));
    allDocuments.forEach((doc) => add(getParentDir(doc.file_path)));
    return Array.from(seen);
  }, [rootFolders, linkedSources, allDocuments]);

  const folderItems = useMemo(() => {
    const linkedPaths = new Set(linkedSources.map((s) => s.path));
    const baseFolders = isSearchActive ? folderCandidates : currentFolders;
    return baseFolders.map((folder) => ({
      path: folder,
      label: basenameForPath(folder),
      count: allDocuments.filter((doc) => isUnderRoot(doc.file_path, folder)).length,
      isLinked: linkedPaths.has(folder)
    }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [currentFolders, allDocuments, linkedSources, isSearchActive, folderCandidates]);

  const docItems = useMemo(() => {
    const baseDocs = isSearchActive ? allDocuments : currentDocs;
    return baseDocs.map((doc) => ({
      doc,
      label: doc.title || t('commonUntitled')
    }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [currentDocs, allDocuments, isSearchActive, t]);

  const filteredFolderItems = useMemo(() => {
    if (!searchTerm) return folderItems;
    return folderItems.filter((item) => item.label.toLowerCase().includes(searchTerm));
  }, [folderItems, searchTerm]);

  const filteredDocItems = useMemo(() => {
    if (!searchTerm) return docItems;
    return docItems.filter((item) => {
      const title = (item.doc.title || '').toLowerCase();
      const filename = basenameForPath(item.doc.file_path).toLowerCase();
      return title.includes(searchTerm) || filename.includes(searchTerm);
    });
  }, [docItems, searchTerm]);

  const sortedDocItems = useMemo(() => {
    const toTimestamp = (value) => {
      if (!value) return 0;
      if (typeof value === 'number') return value;
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const getSortValue = (item) => {
      if (sortKey === 'added') {
        return toTimestamp(item.doc.created_at || item.doc.file_mtime);
      }
      if (sortKey === 'last_opened') {
        return toTimestamp(item.doc.last_opened);
      }
      return (item.label || basenameForPath(item.doc.file_path) || '').toLowerCase();
    };

    const sorted = [...filteredDocItems].sort((a, b) => {
      const aFav = a.doc.favorite ? 1 : 0;
      const bFav = b.doc.favorite ? 1 : 0;
      if (aFav !== bFav) {
        return bFav - aFav;
      }
      const aVal = getSortValue(a);
      const bVal = getSortValue(b);
      let cmp = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal);
      } else {
        cmp = (aVal || 0) - (bVal || 0);
      }
      if (cmp === 0) {
        cmp = a.label.localeCompare(b.label);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [filteredDocItems, sortKey, sortDirection]);

  const sortedDocOrder = useMemo(() => {
    const order = new Map();
    sortedDocItems.forEach((item, index) => {
      order.set(item.doc.id, index);
    });
    return order;
  }, [sortedDocItems]);

  const totalItemCount = filteredFolderItems.length + filteredDocItems.length;

  const positionText = useMemo(() => {
    if (selectedView === ROOT_VIEW) return t('libraryMyLibrary');
    if (internalRoot && currentRoot && isUnderRoot(currentRoot, internalRoot)) {
      const relative = getRelativePath(selectedView, internalRoot);
      if (!relative) return t('libraryMyLibrary');
      return [t('libraryMyLibrary'), ...relative.split(/[\\/]/)].filter(Boolean).join(' / ');
    }
    if (currentRoot) {
      const relative = getRelativePath(selectedView, currentRoot);
      const parts = relative ? relative.split(/[\\/]/) : [];
      return [t('libraryMyLibrary'), basenameForPath(currentRoot), ...parts].filter(Boolean).join(' / ');
    }
    return t('libraryMyLibrary');
  }, [selectedView, currentRoot, internalRoot, t]);

  const canGoBack = selectedView !== ROOT_VIEW;

  const handleAddFolder = useCallback(async () => {
    if (!api?.library) return;
    const linked = await api.library.linkFolder();
    if (linked) {
      await refreshSources();
      setSelectedView(linked);
    }
  }, [api, refreshSources]);

  const handleImportFiles = useCallback(async () => {
    if (!api?.library) return;
    await api.library.importFiles();
    setSelectedView(ROOT_VIEW);
    await refreshSources();
  }, [api, refreshSources]);

  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (!api?.library || !api?.getPathForFile) return;

    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;

    // Use Electron's webUtils to get file paths (required with contextIsolation)
    const paths = files.map((f) => api.getPathForFile(f)).filter(Boolean);
    if (!paths.length) return;

    // Determine target folder for imports
    const targetFolder = selectedView === ROOT_VIEW ? internalRoot : selectedView;
    const importTarget = targetFolder && internalRoot && targetFolder.startsWith(internalRoot)
      ? targetFolder
      : internalRoot;

    // Let main process handle path classification and operations
    const result = await api.library.handleDroppedPaths(paths, importTarget);

    // Navigate to the first linked folder if any
    if (result.folders && result.folders.length > 0) {
      setSelectedView(result.folders[0]);
    }

    await refreshSources();
  }, [api, refreshSources, selectedView, internalRoot]);

  const handleCreateFolder = useCallback(async (event) => {
    event.preventDefault();
    if (!api?.library) return;
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const parentPath = selectedView === ROOT_VIEW ? internalRoot : selectedView;
    try {
      const created = await api.library.createFolder(trimmed, parentPath);
      setNewFolderName('');
      await refreshSources();
      if (created) setSelectedView(created);
    } catch (error) {
      setNewFolderName('');
    }
  }, [api, newFolderName, refreshSources, selectedView, internalRoot]);

  const handleOpenDoc = useCallback(async (doc) => {
    if (!api?.library || !doc?.id) return;
    setActiveDocId(doc.id);
    await api.library.openDocument(doc.id);
  }, [api]);

  const handleToggleFavorite = useCallback(async (doc, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!api?.library?.setFavorite || !doc?.id) return;
    const next = !doc.favorite;
    setAllDocuments((prev) => prev.map((item) => (
      item.id === doc.id ? { ...item, favorite: next ? 1 : 0 } : item
    )));
    await api.library.setFavorite(doc.id, next);
  }, [api]);

  const handleBack = useCallback(() => {
    if (!canGoBack) return;
    if (!currentRoot) {
      setSelectedView(ROOT_VIEW);
      return;
    }
    if (normalizePath(selectedView) === normalizePath(currentRoot)) {
      setSelectedView(ROOT_VIEW);
      return;
    }
    const parent = getParentDir(selectedView);
    if (!parent || !isUnderRoot(parent, currentRoot)) {
      setSelectedView(ROOT_VIEW);
      return;
    }
    const isInternalRoot = internalRoot && normalizePath(currentRoot) === normalizePath(internalRoot);
    if (isInternalRoot && normalizePath(parent) === normalizePath(currentRoot)) {
      setSelectedView(ROOT_VIEW);
      return;
    }
    setSelectedView(parent);
  }, [canGoBack, currentRoot, selectedView, internalRoot]);

  const handleOpenImageStack = useCallback(async (docIds, orderHint = []) => {
    if (!api?.library?.openImageStack || !docIds?.length) return;
    const docsById = new Map(allDocuments.map((doc) => [doc.id, doc]));
    const docIdSet = new Set(docIds);
    const orderedIds = [];
    orderHint.forEach((id) => {
      if (docIdSet.has(id)) orderedIds.push(id);
    });
    if (orderedIds.length < docIds.length) {
      const remaining = docIds.filter((id) => !orderedIds.includes(id));
      remaining.sort((a, b) => {
        const aOrder = sortedDocOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
        const bOrder = sortedDocOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      });
      orderedIds.push(...remaining);
    }
    const imageDocs = orderedIds
      .map((id) => docsById.get(id))
      .filter((doc) => doc && doc.file_type === 'image');
    if (imageDocs.length < 2) return;
    const paths = imageDocs.map((doc) => doc.file_path);
    await api.library.openImageStack(paths);
    clearSelection();
  }, [api, allDocuments, sortedDocOrder, clearSelection]);

  const handleSelectDoc = useCallback((doc, event) => {
    const docId = doc.id;
    const isShift = event?.shiftKey;
    const isMeta = event?.metaKey || event?.ctrlKey;
    const isDouble = event?.detail >= 2;

    setSelectedFolders(new Set());
    setLastSelectedFolder(null);

    if (isDouble && selectedDocs.has(docId)) {
      setLastSelectedDoc(docId);
      return;
    }

    if (!isShift && !isMeta && selectedDocs.has(docId)) {
      setLastSelectedDoc(docId);
      return;
    }

    if (isShift && lastSelectedDoc && sortedDocItems.length > 0) {
      const docIdList = sortedDocItems.map((d) => d.doc.id);
      const lastIdx = docIdList.indexOf(lastSelectedDoc);
      const currentIdx = docIdList.indexOf(docId);
      if (lastIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(lastIdx, currentIdx);
        const end = Math.max(lastIdx, currentIdx);
        const range = docIdList.slice(start, end + 1);
        const nextSelected = new Set([...selectedDocs, ...range]);
        const nextOrder = selectedDocOrder.filter((id) => nextSelected.has(id));
        range.forEach((id) => {
          if (!nextOrder.includes(id)) nextOrder.push(id);
        });
        setSelectedDocs(nextSelected);
        setSelectedDocOrder(nextOrder);
        setLastSelectedDoc(docId);
        return;
      }
    }

    if (isMeta) {
      const nextSelected = new Set(selectedDocs);
      let nextOrder = [...selectedDocOrder];
      if (nextSelected.has(docId)) {
        nextSelected.delete(docId);
        nextOrder = nextOrder.filter((id) => id !== docId);
      } else {
        nextSelected.add(docId);
        nextOrder.push(docId);
      }
      setSelectedDocs(nextSelected);
      setSelectedDocOrder(nextOrder);
    } else {
      setSelectedDocs(new Set([docId]));
      setSelectedDocOrder([docId]);
    }
    setLastSelectedDoc(docId);
  }, [lastSelectedDoc, sortedDocItems, selectedDocs, selectedDocOrder]);

  const handleDocDoubleClick = useCallback(async (doc) => {
    if (canOpenImageStack && selectedDocs.has(doc.id)) {
      await handleOpenImageStack(Array.from(selectedDocs), selectedDocOrder);
      return;
    }
    await handleOpenDoc(doc);
  }, [canOpenImageStack, selectedDocs, selectedDocOrder, handleOpenImageStack, handleOpenDoc]);

  const handleSelectFolder = useCallback((folderPath, event) => {
    const isShift = event?.shiftKey;
    const isMeta = event?.metaKey || event?.ctrlKey;

    setSelectedDocs(new Set());
    setSelectedDocOrder([]);
    setLastSelectedDoc(null);

    if (isShift && lastSelectedFolder && filteredFolderItems.length > 0) {
      const folderPathList = filteredFolderItems.map((f) => f.path);
      const lastIdx = folderPathList.indexOf(lastSelectedFolder);
      const currentIdx = folderPathList.indexOf(folderPath);
      if (lastIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(lastIdx, currentIdx);
        const end = Math.max(lastIdx, currentIdx);
        const range = folderPathList.slice(start, end + 1);
        setSelectedFolders((prev) => new Set([...prev, ...range]));
        return;
      }
    }

    if (isMeta) {
      setSelectedFolders((prev) => {
        const next = new Set(prev);
        if (next.has(folderPath)) {
          next.delete(folderPath);
        } else {
          next.add(folderPath);
        }
        return next;
      });
    } else {
      setSelectedFolders(new Set([folderPath]));
    }
    setLastSelectedFolder(folderPath);
  }, [lastSelectedFolder, filteredFolderItems]);

  const handleDeleteSelected = useCallback(async () => {
    if (!api?.library) return;

    const docCount = selectedDocs.size;
    const folderCount = selectedFolders.size;

    if (docCount === 0 && folderCount === 0) return;

    const total = docCount + folderCount;
    const label = formatItemCount(t, total);
    const confirmed = window.confirm(t('libraryDeleteSelection', { label }));
    if (!confirmed) return;

    // Delete documents
    if (docCount > 0) {
      await api.library.deleteDocuments(Array.from(selectedDocs), true);
    }

    // Delete folders
    for (const folderPath of selectedFolders) {
      await api.library.deleteFolder(folderPath);
    }

    clearSelection();
    await refreshSources();
    await refreshSubfolders(selectedView);
  }, [api, selectedDocs, selectedFolders, clearSelection, refreshSources, refreshSubfolders, selectedView, t]);

  const handleCreateNewFolder = useCallback(async () => {
    if (!api?.library) return;
    const name = newFolderInput.trim();
    if (!name) return;

    const parentPath = selectedView === ROOT_VIEW ? (internalRoot || null) : selectedView;
    const created = await api.library.createFolder(name, parentPath);
    closeNewFolderPopup();
    await refreshSources();
    await refreshSubfolders(selectedView);
    if (created) setSelectedView(created);
  }, [api, newFolderInput, selectedView, internalRoot, closeNewFolderPopup, refreshSources, refreshSubfolders]);

  const hasSelection = selectedDocs.size > 0 || selectedFolders.size > 0;
  const selectionCount = selectedDocs.size + selectedFolders.size;

  // Folder drag and drop handlers
  const handleFolderDragStart = useCallback((e, folderPath) => {
    setDraggedFolder(folderPath);
    setDraggedDoc(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', folderPath);
  }, []);

  const handleFolderDragEnd = useCallback(() => {
    setDraggedFolder(null);
    setDropTarget(null);
  }, []);

  // Document drag handlers
  const handleDocDragStart = useCallback((e, docId) => {
    setDraggedDoc(docId);
    setDraggedFolder(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `doc:${docId}`);
  }, []);

  const handleDocDragEnd = useCallback(() => {
    setDraggedDoc(null);
    setDropTarget(null);
  }, []);

  const handleFolderDragOver = useCallback((e, folderPath) => {
    e.preventDefault();
    e.stopPropagation();
    // Accept both folder and document drags
    if ((draggedFolder && draggedFolder !== folderPath) || draggedDoc) {
      e.dataTransfer.dropEffect = 'move';
      setDropTarget(folderPath);
    }
  }, [draggedFolder, draggedDoc]);

  const handleFolderDragLeave = useCallback((e) => {
    e.preventDefault();
    setDropTarget(null);
  }, []);

  const handleFolderDrop = useCallback(async (e, targetFolderPath) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);

    // Handle document drop
    if (draggedDoc) {
      if (!api?.library?.moveDocument) {
        setDraggedDoc(null);
        return;
      }

      const result = await api.library.moveDocument(draggedDoc, targetFolderPath);
      setDraggedDoc(null);

      if (result.error) {
        alert(result.error);
        return;
      }

      await refreshSources();
      await refreshSubfolders(selectedView);
      return;
    }

    // Handle folder drop
    if (!draggedFolder || draggedFolder === targetFolderPath) {
      setDraggedFolder(null);
      return;
    }

    // Check if trying to drop into itself or a child
    if (targetFolderPath.startsWith(draggedFolder)) {
      setDraggedFolder(null);
      return;
    }

    if (!api?.library?.moveFolder) {
      setDraggedFolder(null);
      return;
    }

    const result = await api.library.moveFolder(draggedFolder, targetFolderPath);
    setDraggedFolder(null);

    if (result.error) {
      alert(result.error);
      return;
    }

    await refreshSources();
    await refreshSubfolders(selectedView);
  }, [api, draggedFolder, draggedDoc, refreshSources, refreshSubfolders, selectedView]);

  // Clipboard handlers
  const handleCopy = useCallback(() => {
    if (!hasSelection) return;
    setClipboard({
      docs: Array.from(selectedDocs),
      folders: Array.from(selectedFolders),
      mode: 'copy'
    });
  }, [hasSelection, selectedDocs, selectedFolders]);

  const handleCut = useCallback(() => {
    if (!hasSelection) return;
    setClipboard({
      docs: Array.from(selectedDocs),
      folders: Array.from(selectedFolders),
      mode: 'cut'
    });
  }, [hasSelection, selectedDocs, selectedFolders]);

  const handlePaste = useCallback(async () => {
    if (!clipboard.mode || (!clipboard.docs.length && !clipboard.folders.length)) return;
    if (!api?.library) return;

    const targetFolder = selectedView === ROOT_VIEW ? internalRoot : selectedView;
    if (!targetFolder) return;

    const isCut = clipboard.mode === 'cut';
    let hasError = false;

    // Paste documents
    for (const docId of clipboard.docs) {
      const result = isCut
        ? await api.library.moveDocument(docId, targetFolder)
        : await api.library.copyDocument(docId, targetFolder);
      if (result.error) {
        hasError = true;
        alert(result.error);
        break;
      }
    }

    // Paste folders
    if (!hasError) {
      for (const folderPath of clipboard.folders) {
        const result = isCut
          ? await api.library.moveFolder(folderPath, targetFolder)
          : await api.library.copyFolder(folderPath, targetFolder);
        if (result.error) {
          hasError = true;
          alert(result.error);
          break;
        }
      }
    }

    // Clear clipboard if cut
    if (isCut) {
      setClipboard({ docs: [], folders: [], mode: null });
    }

    clearSelection();
    await refreshSources();
    await refreshSubfolders(selectedView);
  }, [api, clipboard, selectedView, internalRoot, clearSelection, refreshSources, refreshSubfolders]);

  const hasClipboard = clipboard.mode && (clipboard.docs.length > 0 || clipboard.folders.length > 0);

  const handleContextMenuAction = useCallback(async (action) => {
    if (!api?.library) return;

    const menuData = contextMenu;
    closeContextMenu();

    if (!menuData) return;

    // Check if the right-clicked item is part of the current selection
    const isInSelection = menuData.type === 'folder'
      ? selectedFolders.has(menuData.target)
      : menuData.type === 'doc'
        ? selectedDocs.has(menuData.target)
        : false;

    // If right-clicked item is in selection, operate on all selected items
    // Otherwise, operate on just the right-clicked item
    const targetDocs = isInSelection ? Array.from(selectedDocs) : (menuData.type === 'doc' ? [menuData.target] : []);
    const targetFolders = isInSelection ? Array.from(selectedFolders) : (menuData.type === 'folder' ? [menuData.target] : []);

    if (action === 'copy') {
      setClipboard({ docs: targetDocs, folders: targetFolders, mode: 'copy' });
      clearSelection();
    } else if (action === 'cut') {
      setClipboard({ docs: targetDocs, folders: targetFolders, mode: 'cut' });
      clearSelection();
    } else if (action === 'importFiles') {
      await handleImportFiles();
    } else if (action === 'linkFolder') {
      await handleAddFolder();
    } else if (action === 'openImageStack') {
      await handleOpenImageStack(targetDocs, selectedDocOrder);
    } else if (action === 'paste') {
      await handlePaste();
    } else if (action === 'delete') {
      const count = targetDocs.length + targetFolders.length;
      const label = formatItemCount(t, count);
      const confirmed = window.confirm(t('libraryDeleteSelection', { label }));
      if (confirmed) {
        for (const folderPath of targetFolders) {
          await api.library.deleteFolder(folderPath);
        }
        if (targetDocs.length > 0) {
          await api.library.deleteDocuments(targetDocs, true);
        }
        clearSelection();
        await refreshSources();
        await refreshSubfolders(selectedView);
      }
    } else if (action === 'newFolder') {
      openNewFolderPopup();
    }
  }, [api, contextMenu, selectedDocs, selectedFolders, clearSelection, refreshSources, refreshSubfolders, selectedView, closeContextMenu, openNewFolderPopup, handlePaste, handleOpenImageStack, handleImportFiles, handleAddFolder, t]);

  useEffect(() => {
    if (!api?.onMenuImportPdf || !api?.onMenuLibraryLocation) return undefined;
    const offImport = api.onMenuImportPdf(() => handleImportFiles());
    const offLink = api.onMenuLibraryLocation(() => handleAddFolder());
    return () => {
      if (offImport) offImport();
      if (offLink) offLink();
    };
  }, [handleImportFiles, handleAddFolder]);

  // Clear selection when navigating to different view
  useEffect(() => {
    clearSelection();
  }, [selectedView, clearSelection]);

  // Keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (contextMenu) {
          closeContextMenu();
        } else {
          clearSelection();
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection) {
        e.preventDefault();
        handleDeleteSelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        // Select all in current view
        const allDocIds = sortedDocItems.map((d) => d.doc.id);
        const allFolderPaths = filteredFolderItems.map((f) => f.path);
        setSelectedDocs(new Set(allDocIds));
        setSelectedDocOrder(allDocIds);
        setSelectedFolders(new Set(allFolderPaths));
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'c' && hasSelection) {
        e.preventDefault();
        handleCopy();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'x' && hasSelection) {
        e.preventDefault();
        handleCut();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'v' && hasClipboard) {
        e.preventDefault();
        handlePaste();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection, hasSelection, handleDeleteSelected, filteredDocItems, filteredFolderItems, contextMenu, closeContextMenu, handleCopy, handleCut, handlePaste, hasClipboard]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return undefined;
    const handleClick = (e) => {
      // Don't close if clicking inside context menu
      if (e.target.closest('.context-menu')) return;
      closeContextMenu();
    };
    // Use mousedown instead of click to close before other handlers
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [contextMenu, closeContextMenu]);

  const activeLabel = useMemo(() => {
    if (selectedView === ROOT_VIEW) return t('libraryMyLibrary');
    return basenameForPath(selectedView);
  }, [selectedView, t]);

  return (
    <div
      className={`library-window ${isDragging ? 'dragging' : ''} ${hasSelection ? 'selecting' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-zone">
            <div className="drop-icon">
              <svg viewBox="0 0 48 48" width="64" height="64">
                <path
                  d="M24 4v28m0 0l-10-10m10 10l10-10M8 40h32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="drop-title">{t('libraryDropTitle')}</div>
            <div className="drop-hint">{t('libraryDropHint')}</div>
          </div>
        </div>
      )}
      <header className="library-header">
        <div className="library-title-block">
          <div className="library-title">{t('libraryTitle')}</div>
          <div className="library-subtitle">{t('librarySubtitle')}</div>
        </div>
        <div className="library-actions">
          <input
            type="search"
            className="library-search"
            placeholder={t('librarySearch')}
            value={sidebarSearch}
            onChange={(event) => setSidebarSearch(event.target.value)}
          />
        </div>
      </header>
      <div className="library-body">
        <aside className="library-sidebar">
          <div className="library-section">
            <div className="section-title">{t('libraryPosition')}</div>
            <div className="position-display">{positionText}</div>
          </div>
          <div className="library-section">
            <div className="section-title">{t('libraryHistory')}</div>
            <div className="recent-list">
              {recentDocs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  className={`recent-item ${activeDocId === doc.id ? 'active' : ''}`}
                  onClick={() => handleOpenDoc(doc)}
                >
                  <span className="recent-title">{doc.title || t('commonUntitled')}</span>
                  <span className="recent-meta">{basenameForPath(doc.file_path)}</span>
                </button>
              ))}
              {!recentDocs.length && (
                <div className="source-empty">{t('libraryNoRecent')}</div>
              )}
            </div>
          </div>
        </aside>
        <section
          className="library-content"
          onClick={(e) => {
            // Clear selection when clicking on blank area
            if (!e.target.closest('.folder-entry') && !e.target.closest('.item-card')) {
              clearSelection();
            }
          }}
          onContextMenu={(e) => {
            if (e.target === e.currentTarget || e.target.closest('.content-section')) {
              if (!e.target.closest('.folder-entry') && !e.target.closest('.item-card')) {
                e.preventDefault();
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  type: 'blank',
                  target: null
                });
              }
            }
          }}
        >
          <div className="library-content-head">
            <div className="content-title-row">
              <div className="content-title-main">
                {canGoBack && (
                  <button type="button" className="back-button" onClick={handleBack} aria-label={t('commonBack')}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
                <div className="content-title">{activeLabel}</div>
              </div>
              <div className="content-tools">
                <div className="view-toggle" role="group" aria-label={t('readerViewModeLabel')}>
                  <button
                    type="button"
                    className={viewMode === 'grid' ? 'active' : ''}
                    onClick={() => setViewMode('grid')}
                  >
                    {t('libraryViewGrid')}
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'list' ? 'active' : ''}
                    onClick={() => setViewMode('list')}
                  >
                    {t('libraryViewList')}
                  </button>
                </div>
                <div className="sort-controls">
                  <select
                    aria-label={t('librarySortLabel')}
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value)}
                  >
                    <option value="added">{t('librarySortAdded')}</option>
                    <option value="name">{t('librarySortName')}</option>
                    <option value="last_opened">{t('librarySortLastOpened')}</option>
                  </select>
                  <button
                    type="button"
                    className={`sort-toggle ${sortDirection === 'asc' ? 'asc' : 'desc'}`}
                    onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    aria-label={sortDirection === 'asc' ? t('librarySortDesc') : t('librarySortAsc')}
                    title={sortDirection === 'asc' ? t('librarySortDesc') : t('librarySortAsc')}
                  >
                    <img src={arrowDownIcon} alt="" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          {loading && <div className="empty">{t('libraryLoading')}</div>}
          {!loading && (
            <>
              <div className="content-section folders">
                <div className={`library-items ${viewMode}`}>
                  {filteredFolderItems.map((folder) => (
                    <div
                      key={folder.path}
                      className={`folder-entry ${selectedFolders.has(folder.path) ? 'selected' : ''} ${draggedFolder === folder.path ? 'dragging' : ''} ${dropTarget === folder.path ? 'drop-target' : ''} ${folder.isLinked ? 'linked' : ''} ${clipboard.folders.includes(folder.path) ? `clipboard-${clipboard.mode}` : ''}`}
                      draggable={!folder.isLinked}
                      onDragStart={(e) => !folder.isLinked && handleFolderDragStart(e, folder.path)}
                      onDragEnd={handleFolderDragEnd}
                      onDragOver={(e) => handleFolderDragOver(e, folder.path)}
                      onDragLeave={handleFolderDragLeave}
                      onDrop={(e) => handleFolderDrop(e, folder.path)}
                      onClick={(e) => handleSelectFolder(folder.path, e)}
                      onDoubleClick={() => setSelectedView(folder.path)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          type: 'folder',
                          target: folder.path,
                          label: folder.label
                        });
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedView(folder.path);
                        }
                      }}
                    >
                      <div className="folder-icon-wrap">
                        <div className={`item-icon ${folder.isLinked ? 'folder-linked' : 'folder'}`} aria-hidden="true" />
                      </div>
                      <div className="item-title">{folder.label}</div>
                    </div>
                  ))}
                </div>
                {!filteredFolderItems.length && (
                  <div className="empty">{t('libraryNoFolders')}</div>
                )}
              </div>
              <div className="content-section scores">
                <div className={`library-items ${viewMode}`}>
                  {sortedDocItems.map((item) => (
                    <div
                      key={item.doc.id}
                      className={`item-card doc-item ${activeDocId === item.doc.id ? 'active' : ''} ${selectedDocs.has(item.doc.id) ? 'selected' : ''} ${draggedDoc === item.doc.id ? 'dragging' : ''} ${clipboard.docs.includes(item.doc.id) ? `clipboard-${clipboard.mode}` : ''}`}
                      draggable
                      onDragStart={(e) => handleDocDragStart(e, item.doc.id)}
                      onDragEnd={handleDocDragEnd}
                      onClick={(e) => handleSelectDoc(item.doc, e)}
                      onDoubleClick={() => handleDocDoubleClick(item.doc)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          type: 'doc',
                          target: item.doc.id,
                          label: item.doc.title || t('commonUntitled')
                        });
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span
                        role="button"
                        tabIndex={0}
                        className={`favorite-star ${item.doc.favorite ? 'active' : ''}`}
                        onClick={(e) => handleToggleFavorite(item.doc, e)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleFavorite(item.doc, e);
                          }
                        }}
                        aria-label={item.doc.favorite ? t('favoriteRemove') : t('favoriteAdd')}
                        title={item.doc.favorite ? t('favoriteRemove') : t('favoriteAdd')}
                      >
                        ★
                      </span>
                      <DocPreview
                        filePath={item.doc.file_path}
                        label={item.doc.title || t('commonPreview')}
                        fileType={item.doc.file_type}
                      />
                      <div className="item-title">{item.doc.title || t('commonUntitled')}</div>
                      <div className="item-meta">
                        <span>{item.doc.page_count ? formatPagesCount(t, item.doc.page_count) : '--'}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {!filteredDocItems.length && (
                  <div className="empty">{t('libraryNoScores')}</div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'blank' && (
            <>
              <button
                type="button"
                className="context-menu-item"
                onClick={() => handleContextMenuAction('importFiles')}
              >
                {t('libraryImportFiles')}
              </button>
              <button
                type="button"
                className="context-menu-item"
                onClick={() => handleContextMenuAction('linkFolder')}
              >
                {t('libraryLinkFolder')}
              </button>
              <button
                type="button"
                className="context-menu-item"
                onClick={() => handleContextMenuAction('newFolder')}
              >
                {t('libraryNewFolder')}
              </button>
              {hasClipboard && (
                <button
                  type="button"
                  className="context-menu-item"
                  onClick={() => handleContextMenuAction('paste')}
                >
                  <span>{t('libraryPaste')}</span>
                  <span className="shortcut">⌘V</span>
                </button>
              )}
            </>
          )}
          {(contextMenu.type === 'folder' || contextMenu.type === 'doc') && (
            <>
              <button
                type="button"
                className="context-menu-item"
                onClick={() => handleContextMenuAction('importFiles')}
              >
                {t('libraryImportFiles')}
              </button>
              <button
                type="button"
                className="context-menu-item"
                onClick={() => handleContextMenuAction('linkFolder')}
              >
                {t('libraryLinkFolder')}
              </button>
              <div className="context-menu-divider" />
              {contextMenu.type === 'doc' && canOpenImageStack && selectedDocs.has(contextMenu.target) && (
                <>
                  <button
                    type="button"
                    className="context-menu-item"
                    onClick={() => handleContextMenuAction('openImageStack')}
                  >
                    {t('libraryOpenStack')}
                  </button>
                  <div className="context-menu-divider" />
                </>
              )}
              <button
                type="button"
                className="context-menu-item"
                onClick={() => handleContextMenuAction('copy')}
              >
                <span>{t('libraryCopy')}</span>
                <span className="shortcut">⌘C</span>
              </button>
              <button
                type="button"
                className="context-menu-item"
                onClick={() => handleContextMenuAction('cut')}
              >
                <span>{t('libraryCut')}</span>
                <span className="shortcut">⌘X</span>
              </button>
              {hasClipboard && (
                <button
                  type="button"
                  className="context-menu-item"
                  onClick={() => handleContextMenuAction('paste')}
                >
                  <span>{t('libraryPaste')}</span>
                  <span className="shortcut">⌘V</span>
                </button>
              )}
              <div className="context-menu-divider" />
              <button
                type="button"
                className="context-menu-item danger"
                onClick={() => handleContextMenuAction('delete')}
              >
                <span>{t('libraryDelete')}</span>
                <span className="shortcut">⌫</span>
              </button>
            </>
          )}
        </div>
      )}
      {newFolderPopup && (
        <div className="popup-overlay" onClick={closeNewFolderPopup}>
          <div className="popup-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="popup-title">{t('libraryNewFolder')}</div>
            <input
              ref={newFolderInputRef}
              type="text"
              className="popup-input"
              placeholder={t('libraryFolderName')}
              value={newFolderInput}
              onChange={(e) => setNewFolderInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateNewFolder();
                if (e.key === 'Escape') closeNewFolderPopup();
              }}
              autoFocus
            />
            <div className="popup-actions">
              <button type="button" className="ghost" onClick={closeNewFolderPopup}>
                {t('libraryCancel')}
              </button>
              <button type="button" onClick={handleCreateNewFolder}>
                {t('libraryCreate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_ARRAY = [];

function MainApp() {
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 3;
  const PAGE_GAP = 12;
  const metronomeIcon = `${import.meta.env.BASE_URL}icons/Metronome%20Icon.png`;
  const bookOpenIcon = `${import.meta.env.BASE_URL}icons/Book%20Open%20Icon.svg`;
  const arrowDownIcon = `${import.meta.env.BASE_URL}icons/Arrow%20Down%20Icon.svg`;
  const { t } = useI18n();
  const { documents, libraryRoot, loading, chooseLibraryRoot, importFiles, refresh } = useLibrary(api);
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [imageBundle, setImageBundle] = useState(null);
  const [sidebarSortKey, setSidebarSortKey] = useState('last_opened');
  const [sidebarSortDirection, setSidebarSortDirection] = useState('desc');
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

  useEffect(() => {
    if (!api?.settings) return undefined;
    let active = true;
    (async () => {
      try {
        const [savedKey, savedDirection] = await Promise.all([
          api.settings.get('reader.sidebarSortKey'),
          api.settings.get('reader.sidebarSortDirection')
        ]);
        if (!active) return;
        if (savedKey && ['added', 'name', 'last_opened'].includes(savedKey)) {
          setSidebarSortKey(savedKey);
        }
        if (savedDirection && ['asc', 'desc'].includes(savedDirection)) {
          setSidebarSortDirection(savedDirection);
        }
      } catch (error) {
        // Ignore settings read errors
      }
    })();
    return () => {
      active = false;
    };
  }, [api]);

  useEffect(() => {
    if (!api?.settings) return;
    api.settings.set('reader.sidebarSortKey', sidebarSortKey);
    api.settings.set('reader.sidebarSortDirection', sidebarSortDirection);
  }, [api, sidebarSortKey, sidebarSortDirection]);
  const clampedPagesPerView = Math.min(Math.max(pagesPerView, 1), 3);
  const imageFiles = imageBundle?.paths || EMPTY_ARRAY;

  const {
    pdfDoc,
    imageUrl,
    imagePages,
    fileType,
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
  } = useReader(api, selectedDoc, imageFiles);

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
    const baseHeight = pageBaseRef.current.height;
    if (!baseWidth || !baseHeight) return;
    const container = viewMode === 'single' ? singleRef.current : canvasRef.current;
    const host = container || readerStageRef.current;
    if (!host) return;
    const padding = 16;
    const gapTotal = (clampedPagesPerView - 1) * PAGE_GAP;
    const availableWidth = Math.max(host.clientWidth - padding, 200);
    const availableHeight = Math.max(host.clientHeight - padding, 200);
    const usableWidth = Math.max(availableWidth - gapTotal, 160);
    // Calculate scale to fit width and height
    const fitWidth = usableWidth / (baseWidth * clampedPagesPerView);
    const fitHeight = availableHeight / baseHeight;
    // Use the smaller scale to ensure entire page fits in container
    const fit = Math.min(fitWidth, fitHeight);
    const nextScale = Math.min(Math.max(fit, MIN_ZOOM), MAX_ZOOM);
    setFitScale(nextScale);
    const contentWidth = baseWidth * nextScale * zoom * clampedPagesPerView + gapTotal;
    setIsCentered(contentWidth < host.clientWidth - 10);
  }, [viewMode, zoom, MAX_ZOOM, MIN_ZOOM, clampedPagesPerView, PAGE_GAP]);

  useEffect(() => {
    let cancelled = false;

    if (fileType === 'image-set' && imagePages.length) {
      const maxWidth = Math.max(...imagePages.map((page) => page.width || 0));
      const maxHeight = Math.max(...imagePages.map((page) => page.height || 0));
      if (maxWidth && maxHeight) {
        pageBaseRef.current = { width: maxWidth, height: maxHeight };
        computeFitScale();
        return () => {
          cancelled = true;
        };
      }
    }

    if (fileType === 'image' && imageUrl) {
      // For images, load and get dimensions
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        pageBaseRef.current = { width: img.naturalWidth, height: img.naturalHeight };
        computeFitScale();
      };
      img.onerror = () => {
        pageBaseRef.current = { width: null, height: null };
      };
      img.src = imageUrl;
      return () => {
        cancelled = true;
      };
    }

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
  }, [pdfDoc, imageUrl, fileType, imagePages, computeFitScale]);

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
    setFocusMode((prev) => {
      const next = !prev;
      if (next) {
        setSidebarPinned(false);
        setSidebarHover(false);
      } else {
        setSidebarPinned(true);
        setSidebarHover(false);
      }
      return next;
    });
    setToolbarHover(false);
  }, []);

  const handleOpenMetronome = useCallback(() => {
    if (api?.window?.openMetronome) {
      api.window.openMetronome();
    }
  }, []);

  const handleOpenTuner = useCallback(() => {
    if (api?.window?.openTuner) {
      api.window.openTuner();
    }
  }, []);

  const handleOpenRecording = useCallback(() => {
    if (api?.window?.openRecording) {
      api.window.openRecording();
    }
  }, []);

  const handleOpenLibrary = useCallback(() => {
    if (api?.window?.openLibrary) {
      api.window.openLibrary();
    }
  }, []);

  const handleOpenLibraryAt = useCallback((folderPath) => {
    if (api?.window?.openLibraryAt) {
      api.window.openLibraryAt(folderPath || null);
      return;
    }
    if (api?.window?.openLibrary) {
      api.window.openLibrary();
    }
  }, []);

  const handleFitZoom = useCallback(() => {
    const baseWidth = pageBaseRef.current.width;
    const baseHeight = pageBaseRef.current.height;
    const container = viewMode === 'single' ? singleRef.current : canvasRef.current;
    const host = container || readerStageRef.current;
    if (!baseWidth || !baseHeight || !host) {
      setZoom(1);
      return;
    }
    const padding = 16;
    const gapTotal = (clampedPagesPerView - 1) * PAGE_GAP;
    const availableW = Math.max(host.clientWidth - padding, 200);
    const availableH = Math.max(host.clientHeight - padding, 200);
    const fitW = Math.max(availableW - gapTotal, 160) / (baseWidth * clampedPagesPerView);
    const fitH = availableH / baseHeight;
    const targetScale = Math.min(fitW, fitH);
    if (!targetScale || !fitScale) {
      setZoom(1);
      return;
    }
    const nextZoom = Math.min(Math.max(targetScale / fitScale, MIN_ZOOM), MAX_ZOOM);
    setZoom(nextZoom);
  }, [viewMode, clampedPagesPerView, fitScale, setZoom, MIN_ZOOM, MAX_ZOOM, PAGE_GAP]);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, MIN_ZOOM));
  }, [setZoom, MIN_ZOOM]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, MAX_ZOOM));
  }, [setZoom, MAX_ZOOM]);

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
    setImageBundle(null);
    setSinglePageIndex(doc.page_index || 0);
  }, [setSelectedDoc, setSinglePageIndex]);

  const handleOpenDocById = useCallback(async (docId) => {
    if (!docId) return;
    let nextDoc = documents.find((doc) => doc.id === docId);
    if (!nextDoc) {
      const result = await refresh();
      nextDoc = result?.documents?.find((doc) => doc.id === docId) || null;
    }
    if (nextDoc) {
      handleSelect(nextDoc);
    }
  }, [documents, refresh, handleSelect]);

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

  const handleOpenImages = useCallback(async () => {
    if (!api?.reader?.openImages) return;
    const paths = await api.reader.openImages();
    if (!paths || !paths.length) return;
    const parent = getParentDir(paths[0]);
    const labelBase = parent ? basenameForPath(parent) : t('readerImagesLabel');
    setImageBundle({
      paths,
      title: `${labelBase} (${paths.length})`
    });
    setSelectedDoc(null);
    setSinglePageIndex(0);
  }, [api, t]);

  useEffect(() => {
    if (!api?.onMenuImportPdf || !api?.onMenuLibraryLocation) return undefined;
    const offImport = api.onMenuImportPdf(() => handleImport());
    const offLocation = api.onMenuLibraryLocation(() => chooseLibraryRoot());
    const offImages = api.onMenuOpenImages ? api.onMenuOpenImages(() => handleOpenImages()) : null;
    return () => {
      if (offImport) offImport();
      if (offLocation) offLocation();
      if (offImages) offImages();
    };
  }, [api, handleImport, chooseLibraryRoot, handleOpenImages]);

  useEffect(() => {
    if (!api?.onReaderOpenDocument) return undefined;
    const unsubscribe = api.onReaderOpenDocument((docId) => {
      handleOpenDocById(docId);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [api, handleOpenDocById]);

  useEffect(() => {
    if (!api?.onReaderOpenImageStack) return undefined;
    const unsubscribe = api.onReaderOpenImageStack((paths) => {
      if (!paths || !paths.length) return;
      const parent = getParentDir(paths[0]);
      const labelBase = parent ? basenameForPath(parent) : t('readerImagesLabel');
      setImageBundle({
        paths,
        title: `${labelBase} (${paths.length})`
      });
      setSelectedDoc(null);
      setSinglePageIndex(0);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [api, t]);

  useEffect(() => {
    if (pageCount === 0) return;
    const maxStart = Math.max(pageCount - clampedPagesPerView, 0);
    if (singlePageIndex > maxStart) {
      setSinglePageIndex(maxStart);
    }
  }, [pageCount, clampedPagesPerView, singlePageIndex, setSinglePageIndex]);

  // Get current folder path from selected document or image stack
  const currentFolderPath = useMemo(() => {
    if (selectedDoc?.file_path) return getParentDir(selectedDoc.file_path);
    if (imageBundle?.paths?.length) return getParentDir(imageBundle.paths[0]);
    return null;
  }, [selectedDoc, imageBundle]);

  // Filter documents to show only those in the same folder as selected doc
  const filteredDocuments = useMemo(() => {
    let docs = documents;

    // If a document is selected, only show documents from the same folder
    if (currentFolderPath) {
      docs = documents.filter((doc) => {
        const docFolder = getParentDir(doc.file_path);
        return docFolder === currentFolderPath;
      });
    }

    // Apply search filter
    const term = search.trim().toLowerCase();
    if (term) {
      docs = docs.filter((doc) => (doc.title || '').toLowerCase().includes(term));
    }

    const toTimestamp = (value) => {
      if (!value) return 0;
      if (typeof value === 'number') return value;
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const getSortValue = (doc) => {
      if (sidebarSortKey === 'added') {
        return toTimestamp(doc.created_at || doc.file_mtime);
      }
      if (sidebarSortKey === 'last_opened') {
        return toTimestamp(doc.last_opened);
      }
      return ((doc.title || basenameForPath(doc.file_path)) || '').toLowerCase();
    };

    const sorted = [...docs].sort((a, b) => {
      const aVal = getSortValue(a);
      const bVal = getSortValue(b);
      let cmp = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal);
      } else {
        cmp = (aVal || 0) - (bVal || 0);
      }
      if (cmp === 0) {
        const aLabel = (a.title || basenameForPath(a.file_path) || '').toLowerCase();
        const bLabel = (b.title || basenameForPath(b.file_path) || '').toLowerCase();
        cmp = aLabel.localeCompare(bLabel);
      }
      return sidebarSortDirection === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [documents, search, currentFolderPath, sidebarSortKey, sidebarSortDirection]);

  // Get current folder name for display
  const currentFolderName = useMemo(() => {
    if (!currentFolderPath) return t('libraryTitle');
    return basenameForPath(currentFolderPath);
  }, [currentFolderPath, t]);

  const hasActiveDoc = Boolean(selectedDoc || imageBundle);
  const activeTitle = imageBundle?.title || selectedDoc?.title || t('readerSelectScore');
  const activePagesText = hasActiveDoc
    ? t('pagesLoaded', { count: pageCount || selectedDoc?.page_count || 0 })
    : t('readerTagline');

  const sidebarVisible = sidebarPinned || sidebarHover;
  const maxStartIndex = Math.max(pageCount - clampedPagesPerView, 0);
  const isPrevDisabled = !hasActiveDoc || singlePageIndex <= 0;
  const isNextDisabled = !hasActiveDoc || pageCount === 0 || singlePageIndex >= maxStartIndex;
  const singlePageIndices = useMemo(() => {
    if (!hasActiveDoc || pageCount === 0) return [];
    const remaining = pageCount - singlePageIndex;
    const count = Math.min(clampedPagesPerView, remaining);
    if (count <= 0) return [];
    return Array.from({ length: count }, (_, offset) => singlePageIndex + offset);
  }, [hasActiveDoc, pageCount, singlePageIndex, clampedPagesPerView]);

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
              <span
                className="library-title library-title-link"
                onClick={() => handleOpenLibraryAt(currentFolderPath)}
                aria-label={t('readerOpenFolder')}
                title={t('readerOpenFolder')}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleOpenLibraryAt(currentFolderPath);
                  }
                }}
              >
                {currentFolderName}
              </span>
              <div className="library-action-buttons">
                <button
                  className="library-toggle"
                  onClick={handleOpenLibrary}
                  aria-label={t('readerOpenLibrary')}
                  title={t('readerOpenLibrary')}
                >
                  <img src={bookOpenIcon} alt="" aria-hidden="true" />
                </button>
                <button
                  className={`pin-toggle ${sidebarPinned ? 'active' : ''}`}
                  onClick={toggleSidebarPinned}
                  aria-label={sidebarPinned ? t('readerUnpin') : t('readerPin')}
                  title={sidebarPinned ? t('readerUnpin') : t('readerPin')}
                >
                  <span className="pin-icon" aria-hidden="true" />
                </button>
              </div>
            </div>
            <input
              id="search"
              type="search"
              placeholder={t('readerSearch')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="library-meta">
              <span id="library-count">{formatCount(t, filteredDocuments.length)}</span>
              <div className="sort-controls">
                <select
                  aria-label={t('librarySortLabel')}
                  value={sidebarSortKey}
                  onChange={(event) => setSidebarSortKey(event.target.value)}
                >
                  <option value="added">{t('librarySortAdded')}</option>
                  <option value="name">{t('librarySortName')}</option>
                  <option value="last_opened">{t('librarySortLastOpened')}</option>
                </select>
                <button
                  type="button"
                  className={`sort-toggle ${sidebarSortDirection === 'asc' ? 'asc' : 'desc'}`}
                  onClick={() => setSidebarSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  aria-label={sidebarSortDirection === 'asc' ? t('librarySortDesc') : t('librarySortAsc')}
                  title={sidebarSortDirection === 'asc' ? t('librarySortDesc') : t('librarySortAsc')}
                >
                  <img src={arrowDownIcon} alt="" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
          <div id="library-list" className="library-list">
            {loading && <div className="empty">{t('readerLoadingLibrary')}</div>}
            {!loading && filteredDocuments.length === 0 && (
              <div className="empty">{t('readerImportHint')}</div>
            )}
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`library-item ${selectedDoc?.id === doc.id ? 'active' : ''}`}
                onClick={() => handleSelect(doc)}
              >
                <div className="library-item-title">{doc.title || t('commonUntitled')}</div>
                <div className="library-item-meta">
                  <span>{doc.page_count ? formatPagesCount(t, doc.page_count) : '--'}</span>
                  <span>{doc.last_opened ? t('readerResume') : t('readerNew')}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="reader" ref={readerRef}>
          <div className="reader-toolbar">
            <div className="doc-meta">
              <div id="doc-title" className="doc-title">{activeTitle}</div>
              <div id="doc-sub" className="doc-sub">{activePagesText}</div>
            </div>
            <div className="toolbar-controls">
              <div className="control-group">
                <label>{t('readerView')}</label>
                <div className="segmented" role="group" aria-label={t('readerViewModeLabel')}>
                  <button
                    type="button"
                    className={viewMode === 'continuous' ? 'active' : ''}
                    onClick={() => setViewMode('continuous')}
                    aria-pressed={viewMode === 'continuous'}
                  >
                    {t('readerViewContinuous')}
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'single' ? 'active' : ''}
                    onClick={() => setViewMode('single')}
                    aria-pressed={viewMode === 'single'}
                  >
                    {t('readerViewSingle')}
                  </button>
                </div>
              </div>
              <div className="control-group">
                <label>{t('readerPagesPerView')}</label>
                <div className="segmented" role="group" aria-label={t('readerPagesPerViewLabel')}>
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
                <label>{t('readerZoom')}</label>
                <div className="zoom-pill" role="group" aria-label={t('readerZoomControlsLabel')}>
                  <button
                    type="button"
                    className="zoom-pill-button"
                    onClick={handleZoomOut}
                    aria-label={t('readerZoomOut')}
                    title={t('readerZoomOut')}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M8.5 11h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M15.5 15.5l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="zoom-pill-button zoom-fit"
                    onClick={handleFitZoom}
                    aria-label={t('readerZoomFit')}
                    title={t('readerZoomFit')}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 9V4h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M20 9V4h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M4 15v5h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="zoom-pill-button"
                    onClick={handleZoomIn}
                    aria-label={t('readerZoomIn')}
                    title={t('readerZoomIn')}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M11 8.5v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M8.5 11h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M15.5 15.5l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
              {viewMode === 'continuous' && (
                <div className="control-group">
                  <label>{t('readerAutoScroll')}</label>
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
                  <label>{t('readerAutoPage')}</label>
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
                aria-label={t('readerOpenMetronome')}
                title={t('readerOpenMetronome')}
              >
                <img
                  className="metronome-launch-icon"
                  src={metronomeIcon}
                  alt=""
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                className="tuner-launch"
                onClick={handleOpenTuner}
                aria-label={t('readerOpenTuner')}
                title={t('readerOpenTuner')}
              >
                <svg className="tuner-launch-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 3v7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M16 3v7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 10a4 4 0 0 0 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 10v10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                className="record-launch"
                onClick={handleOpenRecording}
                aria-label={t('readerOpenRecording')}
                title={t('readerOpenRecording')}
              >
                <svg className="record-launch-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" />
                </svg>
              </button>
            </div>
          </div>

          <div id="reader-stage" className="reader-stage" ref={readerStageRef}>
            <div className={`stage-controls ${stageActive ? 'visible' : ''}`}>
              <button
                className={`stage-btn ${focusMode ? 'active' : ''}`}
                onClick={toggleFocusMode}
                title={focusMode ? t('readerFocusExit') : t('readerFocusEnter')}
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
                title={isFullscreen ? t('readerFullscreenExit') : t('readerFullscreenEnter')}
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
              {pageLoading && (
                <div className="loading-spinner-container">
                  <div className="loading-spinner" />
                </div>
              )}
              {pdfError && <div className="empty">{t('readerFailedLoad', { error: pdfError })}</div>}
              {!pageLoading && !hasActiveDoc && (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12h6" />
                      <path d="M12 9v6" />
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <h3 className="empty-title">{t('readerEmptyTitle')}</h3>
                  <p className="empty-desc">{t('readerEmptyDesc')}</p>
                  <button className="empty-btn" onClick={handleImport}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {t('readerImport')}
                  </button>
                  <button className="empty-btn secondary" onClick={handleOpenImages}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
                      <circle cx="9" cy="10" r="2" />
                      <path d="M21 17l-5.5-5.5L9 18l-3-3-3 3" />
                    </svg>
                    {t('readerOpenImages')}
                  </button>
                </div>
              )}
              <div className="page-stack" style={{ '--pages-per-view': clampedPagesPerView }}>
                {selectedDoc && pdfDoc && Array.from({ length: pageCount }).map((_, index) => (
                  <div className="page-shell" key={`${selectedDoc.id}-${index}`}>
                    <PageCanvas pdfDoc={pdfDoc} pageIndex={index} zoom={zoom * fitScale} t={t} />
                  </div>
                ))}
                {selectedDoc && fileType === 'image' && imageUrl && (
                  <div className="page-shell">
                    <img
                      src={imageUrl}
                      alt={selectedDoc.title || t('readerImageAlt')}
                      className="image-page"
                      style={{
                        width: pageBaseRef.current.width ? pageBaseRef.current.width * zoom * fitScale : 'auto',
                        height: pageBaseRef.current.height ? pageBaseRef.current.height * zoom * fitScale : 'auto'
                      }}
                      draggable={false}
                    />
                  </div>
                )}
                {fileType === 'image-set' && imagePages.length > 0 && imagePages.map((page, index) => (
                  <div className="page-shell" key={`image-${page.path}-${index}`}>
                    <img
                      src={page.url}
                      alt={imageBundle?.title || t('readerImageAlt')}
                      className="image-page"
                      style={{
                        width: page.width ? page.width * zoom * fitScale : 'auto',
                        height: page.height ? page.height * zoom * fitScale : 'auto'
                      }}
                      draggable={false}
                    />
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
                aria-label={t('readerPrevPage')}
                title={t('readerPrevPage')}
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
                {pageLoading && (
                <div className="loading-spinner-container">
                  <div className="loading-spinner" />
                </div>
              )}
                {pdfError && <div className="empty">{t('readerFailedLoad', { error: pdfError })}</div>}
                {!pageLoading && !hasActiveDoc && (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 12h6" />
                        <path d="M12 9v6" />
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                    <h3 className="empty-title">{t('readerEmptyTitle')}</h3>
                    <p className="empty-desc">{t('readerEmptyDesc')}</p>
                    <button className="empty-btn" onClick={handleImport}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      {t('readerImport')}
                    </button>
                    <button className="empty-btn secondary" onClick={handleOpenImages}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
                        <circle cx="9" cy="10" r="2" />
                        <path d="M21 17l-5.5-5.5L9 18l-3-3-3 3" />
                      </svg>
                      {t('readerOpenImages')}
                    </button>
                  </div>
                )}
                {!pageLoading && selectedDoc && pdfDoc && (
                  <div className="page-stack single-stack" style={{ '--pages-per-view': clampedPagesPerView }}>
                    {singlePageIndices.map((index) => (
                      <div className="page-shell" key={`${selectedDoc.id}-${index}`}>
                        <PageCanvas pdfDoc={pdfDoc} pageIndex={index} zoom={zoom * fitScale} t={t} />
                      </div>
                    ))}
                  </div>
                )}
                {!pageLoading && selectedDoc && fileType === 'image' && imageUrl && (
                  <div className="page-stack single-stack" style={{ '--pages-per-view': 1 }}>
                    <div className="page-shell">
                      <img
                        src={imageUrl}
                        alt={selectedDoc.title || t('readerImageAlt')}
                        className="image-page"
                        style={{
                          width: pageBaseRef.current.width ? pageBaseRef.current.width * zoom * fitScale : 'auto',
                          height: pageBaseRef.current.height ? pageBaseRef.current.height * zoom * fitScale : 'auto'
                        }}
                        draggable={false}
                      />
                    </div>
                  </div>
                )}
                {!pageLoading && fileType === 'image-set' && imagePages.length > 0 && (
                  <div className="page-stack single-stack" style={{ '--pages-per-view': clampedPagesPerView }}>
                    {singlePageIndices.map((index) => {
                      const page = imagePages[index];
                      if (!page) return null;
                      return (
                        <div className="page-shell" key={`image-${page.path}-${index}`}>
                          <img
                            src={page.url}
                            alt={imageBundle?.title || t('readerImageAlt')}
                            className="image-page"
                            style={{
                              width: page.width ? page.width * zoom * fitScale : 'auto',
                              height: page.height ? page.height * zoom * fitScale : 'auto'
                            }}
                            draggable={false}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                className="nav nav-next"
                onClick={() =>
                  setSinglePageIndex((prev) => Math.min(prev + clampedPagesPerView, maxStartIndex))
                }
                disabled={isNextDisabled}
                aria-label={t('readerNextPage')}
                title={t('readerNextPage')}
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

function RecordingWindow() {
  const { t } = useI18n();
  const [recordTab, setRecordTab] = useState('audio');
  const [recordingKind, setRecordingKind] = useState(null);
  const [recordingError, setRecordingError] = useState('');
  const [recordingSaving, setRecordingSaving] = useState(false);
  const [audioFolder, setAudioFolder] = useState('');
  const [videoFolder, setVideoFolder] = useState('');
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState('');
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState('');
  const [selectedAudioFormat, setSelectedAudioFormat] = useState('');
  const [selectedVideoFormat, setSelectedVideoFormat] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const previewStreamRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordMimeRef = useRef('');
  const recordingMountedRef = useRef(true);
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const meterRafRef = useRef(null);
  const monitorStreamRef = useRef(null);

  useEffect(() => {
    recordingMountedRef.current = true;
    return () => {
      recordingMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!api?.settings) return undefined;
    let active = true;
    (async () => {
      try {
        const [savedAudio, savedVideo] = await Promise.all([
          api.settings.get('recording.audioFolder'),
          api.settings.get('recording.videoFolder')
        ]);
        if (!active) return;
        if (savedAudio) setAudioFolder(savedAudio);
        if (savedVideo) setVideoFolder(savedVideo);
      } catch (error) {
        // Ignore settings errors
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!api?.settings) return undefined;
    let active = true;
    (async () => {
      try {
        const [savedAudioFormat, savedVideoFormat] = await Promise.all([
          api.settings.get('recording.audioFormat'),
          api.settings.get('recording.videoFormat')
        ]);
        if (!active) return;
        if (savedAudioFormat) setSelectedAudioFormat(savedAudioFormat);
        if (savedVideoFormat) setSelectedVideoFormat(savedVideoFormat);
      } catch (error) {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!api?.settings) return;
    api.settings.set('recording.audioFormat', selectedAudioFormat);
    api.settings.set('recording.videoFormat', selectedVideoFormat);
  }, [selectedAudioFormat, selectedVideoFormat]);

  const audioFolderLabel = audioFolder ? basenameForPath(audioFolder) : t('defaultLabel');
  const videoFolderLabel = videoFolder ? basenameForPath(videoFolder) : t('defaultLabel');
  const audioFormatOptions = useMemo(() => getSupportedRecordingMimeTypes('audio'), []);
  const videoFormatOptions = useMemo(() => getSupportedRecordingMimeTypes('video'), []);
  const recordingStatus = recordingSaving
    ? t('recordingSaving')
    : recordingKind
      ? t('recordingStatus', { kind: recordingKind === 'video' ? t('recordingVideoKind') : t('recordingAudioKind') })
      : '';

  const attachPreviewStream = useCallback((stream) => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream || null;
    if (stream) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const stopAudioMeter = useCallback(() => {
    if (meterRafRef.current) {
      cancelAnimationFrame(meterRafRef.current);
      meterRafRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const startAudioMeter = useCallback((stream) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!stream || !AudioContext) return;
    stopAudioMeter();
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6;
    analyserRef.current = analyser;
    source.connect(analyser);
    const buffer = new Uint8Array(analyser.fftSize);
    const update = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const value = (buffer[i] - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / buffer.length);
      setAudioLevel(Math.min(1, rms * 3));
      meterRafRef.current = requestAnimationFrame(update);
    };
    meterRafRef.current = requestAnimationFrame(update);
  }, [stopAudioMeter]);

  const stopAudioMonitor = useCallback(() => {
    if (monitorStreamRef.current) {
      monitorStreamRef.current.getTracks().forEach((track) => track.stop());
      monitorStreamRef.current = null;
    }
  }, []);

  const startAudioMonitor = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || recordingKind) return;
    if (monitorStreamRef.current) return;
    setRecordingError('');
    try {
      const audioDeviceConstraint = selectedAudioDeviceId
        ? { deviceId: { exact: selectedAudioDeviceId } }
        : {};
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          ...audioDeviceConstraint
        }
      });
      monitorStreamRef.current = stream;
      startAudioMeter(stream);
    } catch (error) {
      setRecordingError(t('recordingMicUnavailable'));
    }
  }, [recordingKind, selectedAudioDeviceId, startAudioMeter, t]);

  const stopPreviewStream = useCallback(() => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = null;
    }
    attachPreviewStream(null);
  }, [attachPreviewStream]);

  const startPreviewStream = useCallback(async () => {
    if (previewStreamRef.current || !navigator.mediaDevices?.getUserMedia) return;
    setRecordingError('');
    try {
      const constraints = {
        video: selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      previewStreamRef.current = stream;
      attachPreviewStream(stream);
    } catch (error) {
      setRecordingError(t('recordingCameraUnavailable'));
    }
  }, [attachPreviewStream, selectedVideoDeviceId, t]);

  const cleanupRecording = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    stopAudioMeter();
    mediaRecorderRef.current = null;
    recordChunksRef.current = [];
    recordMimeRef.current = '';
  }, [stopAudioMeter]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      return;
    }
    cleanupRecording();
    setRecordingKind(null);
  }, [cleanupRecording]);

  const startRecording = useCallback(async (kind) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError(t('recordingNotSupported'));
      return;
    }
    setRecordingError('');
    try {
      if (kind === 'video') {
        stopPreviewStream();
      }
      stopAudioMonitor();
      const audioConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      };
      const audioDeviceConstraint = selectedAudioDeviceId
        ? { deviceId: { exact: selectedAudioDeviceId } }
        : {};
      const audioInput = { ...audioConstraints, ...audioDeviceConstraint };
      const videoDeviceConstraint = selectedVideoDeviceId
        ? { deviceId: { exact: selectedVideoDeviceId } }
        : {};
      const constraints = kind === 'video'
        ? {
            audio: audioInput,
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
              ...videoDeviceConstraint
            }
          }
        : { audio: audioInput };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      startAudioMeter(stream);
      if (kind === 'video') {
        attachPreviewStream(stream);
      }
      const preferred = kind === 'video' ? selectedVideoFormat : selectedAudioFormat;
      const mimeType = preferred && MediaRecorder.isTypeSupported(preferred)
        ? preferred
        : pickRecordingMimeType(kind);
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordChunksRef.current = [];
      recordMimeRef.current = recorder.mimeType || mimeType || '';
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordChunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        setRecordingError(t('recordingFailed'));
      };
      recorder.onstop = async () => {
        const canSetState = recordingMountedRef.current;
        if (canSetState) {
          setRecordingSaving(true);
        }
        try {
          const blob = new Blob(recordChunksRef.current, { type: recordMimeRef.current });
          if (blob.size > 0 && api?.media?.saveRecording) {
            const buffer = await blob.arrayBuffer();
            await api.media.saveRecording(kind, buffer, blob.type || recordMimeRef.current);
          }
        } catch (error) {
          if (recordingMountedRef.current) {
            setRecordingError(t('recordingFailed'));
          }
        }
        recordChunksRef.current = [];
        cleanupRecording();
        if (recordingMountedRef.current) {
          setRecordingKind(null);
          setRecordingSaving(false);
        }
        if (recordTab === 'video') {
          startPreviewStream();
        }
      };
      recorder.start(250);
      setRecordingKind(kind);
    } catch (error) {
      cleanupRecording();
      setRecordingKind(null);
      setRecordingError(t('recordingMicDenied'));
    }
  }, [
    attachPreviewStream,
    cleanupRecording,
    recordTab,
    selectedAudioDeviceId,
    selectedVideoDeviceId,
    selectedAudioFormat,
    selectedVideoFormat,
    startPreviewStream,
    stopPreviewStream,
    startAudioMeter,
    stopAudioMonitor,
    t
  ]);

  const handleToggleRecording = useCallback((kind) => {
    if (recordingKind) {
      stopRecording();
      return;
    }
    startRecording(kind);
  }, [recordingKind, startRecording, stopRecording]);

  const handleChooseRecordingFolder = useCallback(async (kind) => {
    if (!api?.media?.chooseFolder) return;
    const folder = await api.media.chooseFolder(kind);
    if (!folder) return;
    if (kind === 'video') {
      setVideoFolder(folder);
    } else {
      setAudioFolder(folder);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (!navigator.mediaDevices?.enumerateDevices) return undefined;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      if (!active) return;
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);
      if (!selectedAudioDeviceId && audioInputs[0]) {
        setSelectedAudioDeviceId(audioInputs[0].deviceId);
      }
      if (!selectedVideoDeviceId && videoInputs[0]) {
        setSelectedVideoDeviceId(videoInputs[0].deviceId);
      }
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedAudioDeviceId, selectedVideoDeviceId]);

  useEffect(() => {
    if (recordTab !== 'video' || recordingKind === 'video') {
      stopPreviewStream();
      return;
    }
    startPreviewStream();
    return () => {
      stopPreviewStream();
    };
  }, [recordTab, recordingKind, startPreviewStream, stopPreviewStream]);

  useEffect(() => {
    if (recordingKind) {
      stopAudioMonitor();
      return;
    }
    startAudioMonitor();
    return () => {
      stopAudioMonitor();
    };
  }, [recordingKind, selectedAudioDeviceId, startAudioMonitor, stopAudioMonitor]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      cleanupRecording();
      stopPreviewStream();
      stopAudioMonitor();
    };
  }, [cleanupRecording, stopPreviewStream, stopAudioMonitor]);

  return (
    <div className="recording-window">
      <div className="recording-drag" aria-hidden="true" />
      <header className="recording-head">
        <div>
          <div className="recording-title">{t('recordingTitle')}</div>
          <div className="recording-sub">{t('recordingSubtitle')}</div>
        </div>
        <div className="record-tabs">
          <button
            type="button"
            className={recordTab === 'audio' ? 'active' : ''}
            onClick={() => setRecordTab('audio')}
          >
            {t('recordingTabAudio')}
          </button>
          <button
            type="button"
            className={recordTab === 'video' ? 'active' : ''}
            onClick={() => setRecordTab('video')}
          >
            {t('recordingTabVideo')}
          </button>
        </div>
      </header>
      <div className="recording-body">
        {recordTab === 'audio' ? (
          <div className="record-panel">
            <div className="record-buttons">
              <button
                type="button"
                className={`record-btn ${recordingKind === 'audio' ? 'active' : ''}`}
                onClick={() => handleToggleRecording('audio')}
                aria-pressed={recordingKind === 'audio'}
                aria-label={recordingKind === 'audio' ? t('recordingStopAudio') : t('recordingRecordAudio')}
                title={recordingKind === 'audio' ? t('recordingStopAudio') : t('recordingRecordAudio')}
              >
                {recordingKind === 'audio' ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="7" y="7" width="10" height="10" rx="2" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="9" y="3" width="6" height="10" rx="3" />
                    <path d="M5 11v1a7 7 0 0 0 14 0v-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="8" y1="22" x2="16" y2="22" />
                  </svg>
                )}
              </button>
            </div>
            <div className={`record-meter ${recordingKind === 'audio' ? 'live' : ''}`}>
              {Array.from({ length: 12 }).map((_, index) => {
                const intensity = 0.2 + (index % 3) * 0.18;
                const height = Math.min(1, 0.15 + audioLevel * 1.6 * intensity);
                return (
                  <span
                    key={index}
                    style={{ transform: `scaleY(${height})` }}
                  />
                );
              })}
            </div>
            <div className="record-devices">
              <label className="record-device">
                <span>{t('recordingAudioLabel')}</span>
                <select
                  value={selectedAudioDeviceId}
                  onChange={(event) => setSelectedAudioDeviceId(event.target.value)}
                >
                  {audioDevices.length === 0 && <option value="">{t('defaultLabel')}</option>}
                  {audioDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || t('recordingMicrophone', { index: index + 1 })}
                    </option>
                  ))}
                </select>
              </label>
              <label className="record-device">
                <span>{t('recordingFormatLabel')}</span>
                <select
                  value={selectedAudioFormat}
                  onChange={(event) => setSelectedAudioFormat(event.target.value)}
                >
                  <option value="">{t('autoLabel')}</option>
                  {audioFormatOptions.map((format) => (
                    <option key={format} value={format}>
                      {labelForMimeType(format)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="record-folders">
              <button
                type="button"
                className="record-folder"
                onClick={() => handleChooseRecordingFolder('audio')}
                title={audioFolder || t('defaultLabel')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                </svg>
                <span>{t('recordingAudioFolder')} {audioFolderLabel}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="record-panel">
            <div className={`record-preview-panel ${recordingKind === 'video' ? 'live' : ''}`}>
              <video ref={videoRef} muted playsInline autoPlay />
            </div>
            <div className="record-buttons">
              <button
                type="button"
                className={`record-btn ${recordingKind === 'video' ? 'active' : ''}`}
                onClick={() => handleToggleRecording('video')}
                aria-pressed={recordingKind === 'video'}
                aria-label={recordingKind === 'video' ? t('recordingStopVideo') : t('recordingRecordVideo')}
                title={recordingKind === 'video' ? t('recordingStopVideo') : t('recordingRecordVideo')}
              >
                {recordingKind === 'video' ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="7" y="7" width="10" height="10" rx="2" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="7" width="12" height="10" rx="2" />
                    <path d="M15 9l6-3v12l-6-3z" />
                  </svg>
                )}
              </button>
            </div>
            <div className={`record-meter ${recordingKind === 'video' ? 'live' : ''}`}>
              {Array.from({ length: 12 }).map((_, index) => {
                const intensity = 0.2 + (index % 3) * 0.18;
                const height = Math.min(1, 0.15 + audioLevel * 1.6 * intensity);
                return (
                  <span
                    key={index}
                    style={{ transform: `scaleY(${height})` }}
                  />
                );
              })}
            </div>
            <div className="record-devices">
              <label className="record-device">
                <span>{t('recordingVideoLabel')}</span>
                <select
                  value={selectedVideoDeviceId}
                  onChange={(event) => setSelectedVideoDeviceId(event.target.value)}
                >
                  {videoDevices.length === 0 && <option value="">{t('defaultLabel')}</option>}
                  {videoDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || t('recordingCamera', { index: index + 1 })}
                    </option>
                  ))}
                </select>
              </label>
              <label className="record-device">
                <span>{t('recordingFormatLabel')}</span>
                <select
                  value={selectedVideoFormat}
                  onChange={(event) => setSelectedVideoFormat(event.target.value)}
                >
                  <option value="">{t('autoLabel')}</option>
                  {videoFormatOptions.map((format) => (
                    <option key={format} value={format}>
                      {labelForMimeType(format)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="record-device">
                <span>{t('recordingAudioLabel')}</span>
                <select
                  value={selectedAudioDeviceId}
                  onChange={(event) => setSelectedAudioDeviceId(event.target.value)}
                >
                  {audioDevices.length === 0 && <option value="">{t('defaultLabel')}</option>}
                  {audioDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || t('recordingMicrophone', { index: index + 1 })}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="record-folders">
              <button
                type="button"
                className="record-folder"
                onClick={() => handleChooseRecordingFolder('video')}
                title={videoFolder || t('defaultLabel')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                </svg>
                <span>{t('recordingVideoFolder')} {videoFolderLabel}</span>
              </button>
            </div>
          </div>
        )}
        {recordingStatus && <div className="record-status">{recordingStatus}</div>}
        {recordingError && <div className="record-error">{recordingError}</div>}
      </div>
    </div>
  );
}

function SettingsWindow() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div className="settings-window">
      <div className="settings-drag" aria-hidden="true" />
      <header className="settings-head">
        <div>
          <div className="settings-title">{t('settingsTitle')}</div>
          <div className="settings-sub">{t('settingsSubtitle')}</div>
        </div>
      </header>
      <div className="settings-body">
        <div className="settings-row">
          <div className="settings-label">{t('settingsLanguage')}</div>
          <div className="settings-options">
            <button
              type="button"
              className={language === 'en' ? 'active' : ''}
              onClick={() => setLanguage('en')}
            >
              {t('languageEnglish')}
            </button>
            <button
              type="button"
              className={language === 'zh' ? 'active' : ''}
              onClick={() => setLanguage('zh')}
            >
              {t('languageChinese')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppRoot() {
  const view = getAppView();
  if (view === 'metronome') return <MetronomeWindow />;
  if (view === 'tuner') return <TunerWindow />;
  if (view === 'library') return <LibraryWindow />;
  if (view === 'recording') return <RecordingWindow />;
  if (view === 'settings') return <SettingsWindow />;
  return <MainApp />;
}

export default AppRoot;
