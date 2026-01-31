const WINDOW_TITLES = {
  library: { en: 'Library', zh: '乐谱库' },
  tuner: { en: 'Tuner', zh: '调音器' },
  metronome: { en: 'Metronome', zh: '节拍器' },
  recording: { en: 'Recording', zh: '录制' },
  settings: { en: 'Settings', zh: '设置' }
};

function getWindowTitle(kind, language = 'en') {
  const entry = WINDOW_TITLES[kind] || {};
  return entry[language] || entry.en || '';
}

module.exports = { getWindowTitle };
