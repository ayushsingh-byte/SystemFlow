// SystemFlow — icons & node type definitions (108 nodes across 19 categories)

const SVG = {
  hex: <svg viewBox="0 0 24 24" fill="none"><path d="M12 2L22 7.5V16.5L12 22L2 16.5V7.5L12 2Z" stroke="currentColor" strokeWidth="1.6" fill="rgba(14,165,233,0.08)"/></svg>,
  hexSolid: <svg viewBox="0 0 24 24"><defs><linearGradient id="hexg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#0ea5e9"/><stop offset="1" stopColor="#6366f1"/></linearGradient></defs><path d="M12 2L22 7.5V16.5L12 22L2 16.5V7.5L12 2Z" fill="url(#hexg)"/><path d="M12 7L17 9.8v5.4L12 18l-5-2.8V9.8L12 7z" fill="#0a0a0f" opacity="0.7"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  play: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8V4z"/></svg>,
  pause: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>,
  stop: <svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14"/></svg>,
  chevDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>,
  chevUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 15l6-6 6 6"/></svg>,
  chevLeft: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>,
  chevRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>,
  minus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>,
  fit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>,
  warn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.86l-8.94 15A2 2 0 003.06 22h17.88a2 2 0 001.7-3.14l-8.94-15a2 2 0 00-3.4 0z"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  help: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>,
  pencil: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  bolt: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>,
  sparkle: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2zM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14zM5 14l.5 1.5L7 16l-1.5.5L5 18l-.5-1.5L3 16l1.5-.5L5 14z"/></svg>,
  crown: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 8l4 8h12l4-8-5 3-5-7-5 7-5-3zm2 11h16v2H4z"/></svg>,
  rocket: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  share: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  zap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>,
  layers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,

  // tab icons
  config: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9 1.65 1.65 0 004.27 7.18l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6 1.65 1.65 0 0010 3.09V3a2 2 0 114 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09A1.65 1.65 0 0019.4 15z"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 15l4-4 4 4 5-7"/></svg>,
  log: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>,
  triangle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L4 20h16L12 4z"/><circle cx="12" cy="4" r="1.5" fill="currentColor"/><circle cx="4" cy="20" r="1.5" fill="currentColor"/><circle cx="20" cy="20" r="1.5" fill="currentColor"/></svg>,
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0112 0M15 20a4 4 0 016-3.5"/></svg>,

  // category icons (existing)
  network: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>,
  compute: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="M8 18v2M16 18v2M9 10h6M9 14h4"/></svg>,
  database: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>,
  storage: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><path d="M7 7h.01M7 17h.01"/></svg>,
  messaging: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a8 8 0 11-3.5-6.6L21 4v6h-6"/></svg>,
  aws: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12c3 2 6 3 9 3s6-1 9-3"/><circle cx="6" cy="8" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="8" r="2"/></svg>,
  gcp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L4 8v8l8 4 8-4V8l-8-4z"/><path d="M12 4v16M4 8l16 8M20 8L4 16"/></svg>,
  azure: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 19l6-14 4 8-10 6h16l-7-12"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/></svg>,
  eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  brain: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3a3 3 0 00-3 3v1a3 3 0 00-3 3v2a3 3 0 003 3v1a3 3 0 003 3M15 3a3 3 0 013 3v1a3 3 0 013 3v2a3 3 0 01-3 3v1a3 3 0 01-3 3M9 7v10M15 7v10M9 12h6"/></svg>,
  server: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="7" rx="1"/><rect x="3" y="13" width="18" height="7" rx="1"/><path d="M7 7.5h.01M7 16.5h.01M11 7.5h.01M11 16.5h.01"/></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18"/></svg>,
  router: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="13" width="18" height="7" rx="1"/><path d="M6.5 16.5h.01M10 16.5h.01M14 13v-3M14 10a3 3 0 016 0M14 10a3 3 0 00-3-3 4 4 0 00-4 4"/></svg>,
  container: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/></svg>,
  func: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3l-3 18M18 3l-3 18M4 9h16M3 15h16"/></svg>,
  flame: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12 0 0-3 2-5 6-2 4-4 5-4 7 0 4 3 6 7 6z"/></svg>,
  search2: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="6"/><path d="M21 21l-4-4M8 11h6M11 8v6"/></svg>,
  box: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>,
  queue: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="4" height="12" rx="0.5"/><rect x="9" y="6" width="4" height="12" rx="0.5"/><rect x="15" y="6" width="4" height="12" rx="0.5"/></svg>,
  rabbit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 7v6a5 5 0 005 5h2a5 5 0 005-5V7"/><path d="M9 5L7 8M15 5l2 3"/><circle cx="11" cy="13" r="0.6" fill="currentColor"/><circle cx="15" cy="13" r="0.6" fill="currentColor"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="1.5"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>,
  key: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="14" r="4"/><path d="M11 11l9-9M16 6l3 3"/></svg>,
  graph: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l5-5 4 4 8-8"/><path d="M14 8h6v6"/></svg>,
  gpu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="12" rx="1"/><rect x="7" y="9" width="4" height="6"/><rect x="13" y="9" width="4" height="6"/></svg>,
  vector: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h8M6 8v8M18 8v8M8 18h8"/></svg>,
  cdn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/><path d="M3 12c3-2 6-2 9 0s6 2 9 0"/></svg>,
  worker: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3"/><path d="M5 21c0-3.5 3.5-6 7-6s7 2.5 7 6"/><path d="M18 13l3 1.5M3 14.5l3-1"/></svg>,

  // new icons
  code: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  stream: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8c4 0 4 4 8 4s4-4 8-4M3 16c4 0 4 4 8 4s4-4 8-4"/></svg>,
  build: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 010 1.4l-1.6 1.6a1 1 0 01-1.4 0L9.3 7l-3.6 3.6a4 4 0 005.7 5.7L15 13.7l3 3a2 2 0 102.8-2.8l-3-3 2.4-2.4a4 4 0 00-5.7-5.7L14.7 6.3z"/></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.5 0l3-3a5 5 0 00-7-7l-2 2"/><path d="M14 11a5 5 0 00-7.5 0l-3 3a5 5 0 007 7l2-2"/></svg>,
  k8s: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l9 4v10l-9 6-9-6V6l9-4z"/><path d="M12 2v20M21 6l-9 6M3 6l9 6M21 16l-9-4M3 16l9-4"/></svg>,
  branch: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 8v8M8 8h7a3 3 0 013 3v1M14 17h-3a3 3 0 01-3-3v-2"/></svg>,
  dollar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 6h-7a3 3 0 100 6h4a3 3 0 110 6H6"/></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.34 1.79.66 2.63a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.45-1.45a2 2 0 012.11-.45c.84.32 1.73.54 2.63.66a2 2 0 011.72 2.05z"/></svg>,
  cube: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z"/><path d="M3 7l9 5 9-5M12 12v10"/></svg>,
  cog: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4 4l4 4M16 16l4 4M1 12h6M17 12h6M4 20l4-4M16 8l4-4"/></svg>,
  device: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 18h.01"/></svg>,
  tv: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8"/></svg>,
  iot: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 010 8.49M7.76 16.24a6 6 0 010-8.49M19.07 4.93a10 10 0 010 14.14M4.93 19.07a10 10 0 010-14.14"/></svg>,
  desktop: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  cloud: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>,
  fire: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12 0 0-3 2-5 6-2 4-4 5-4 7 0 4 3 6 7 6zM12 14c1 0 2-1 2-2 0-2-2-3-2-3s-2 1-2 3c0 1 1 2 2 2z"/></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.85-3.36L23 10M1 14l4.65 4.36A9 9 0 0020.5 15"/></svg>,
  scale: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18M3 12h18M3 17h18M7 3v18M12 3v18M17 3v18"/></svg>,
  pulse: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  diamond: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h12l3 6-9 12L3 9z"/></svg>,
  timer: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M12 5V3M10 3h4"/></svg>,
  trophy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4a2 2 0 01-2-2V5h4m14 4h2a2 2 0 002-2V5h-4m-8 12v4M8 21h8"/><path d="M9 9a3 3 0 006 0V3H9v6z"/></svg>,
  target: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>,
  incident: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/><circle cx="19" cy="5" r="3" fill="var(--red)" stroke="none"/></svg>,
  cpu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>,
  spark: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9z"/></svg>,
  bot: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="12" rx="3"/><circle cx="9" cy="14" r="1.2" fill="currentColor"/><circle cx="15" cy="14" r="1.2" fill="currentColor"/><path d="M12 4v4M9 4h6"/></svg>,
  segment: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M3 9h11M9 21V14M3 15h6"/></svg>,
};

window.SVG = SVG;

// Category metadata
const CATEGORIES = {
  clients:       { label: "Clients",       color: "#a855f7", dim: "rgba(168,85,247,0.14)", glow: "rgba(168,85,247,0.4)", icon: "users" },
  frontend:      { label: "Frontend",      color: "#ec4899", dim: "rgba(236,72,153,0.14)", glow: "rgba(236,72,153,0.4)", icon: "code" },
  network:       { label: "Network",       color: "#0ea5e9", dim: "rgba(14,165,233,0.14)", glow: "rgba(14,165,233,0.4)", icon: "network" },
  compute:       { label: "Compute",       color: "#6366f1", dim: "rgba(99,102,241,0.14)", glow: "rgba(99,102,241,0.4)", icon: "compute" },
  containers:    { label: "Containers",    color: "#2563eb", dim: "rgba(37,99,235,0.14)",  glow: "rgba(37,99,235,0.4)",  icon: "k8s" },
  database:      { label: "Database",      color: "#10b981", dim: "rgba(16,185,129,0.14)", glow: "rgba(16,185,129,0.4)", icon: "database" },
  cache:         { label: "Cache",         color: "#f97316", dim: "rgba(249,115,22,0.14)", glow: "rgba(249,115,22,0.4)", icon: "flame" },
  storage:       { label: "Storage",       color: "#f59e0b", dim: "rgba(245,158,11,0.14)", glow: "rgba(245,158,11,0.4)", icon: "storage" },
  messaging:     { label: "Messaging",     color: "#d946ef", dim: "rgba(217,70,239,0.14)", glow: "rgba(217,70,239,0.4)", icon: "messaging" },
  streaming:     { label: "Streaming",     color: "#14b8a6", dim: "rgba(20,184,166,0.14)", glow: "rgba(20,184,166,0.4)", icon: "stream" },
  "ai-ml":       { label: "AI / ML",       color: "#06b6d4", dim: "rgba(6,182,212,0.14)",  glow: "rgba(6,182,212,0.4)",  icon: "brain" },
  observability: { label: "Observability", color: "#84cc16", dim: "rgba(132,204,22,0.14)", glow: "rgba(132,204,22,0.4)", icon: "eye" },
  security:      { label: "Security",      color: "#ef4444", dim: "rgba(239,68,68,0.14)",  glow: "rgba(239,68,68,0.4)",  icon: "shield" },
  cicd:          { label: "CI / CD",       color: "#facc15", dim: "rgba(250,204,21,0.14)", glow: "rgba(250,204,21,0.4)", icon: "build" },
  aws:           { label: "AWS",           color: "#ff9900", dim: "rgba(255,153,0,0.12)",  glow: "rgba(255,153,0,0.4)",  icon: "aws" },
  gcp:           { label: "GCP",           color: "#4285f4", dim: "rgba(66,133,244,0.14)", glow: "rgba(66,133,244,0.4)", icon: "gcp" },
  azure:         { label: "Azure",         color: "#0078d4", dim: "rgba(0,120,212,0.14)",  glow: "rgba(0,120,212,0.4)",  icon: "azure" },
  saas:          { label: "SaaS",          color: "#8b5cf6", dim: "rgba(139,92,246,0.14)", glow: "rgba(139,92,246,0.4)", icon: "link" },
  servers:       { label: "Servers",       color: "#94a3b8", dim: "rgba(148,163,184,0.14)",glow: "rgba(148,163,184,0.4)",icon: "server" },
};
window.CATEGORIES = CATEGORIES;

// ── Invalid connection rules ──────────────────────────────────────────────────
// Returns { severity, reason, fix } or null (valid connection)
window.checkEdgeValidity = function(fromNode, toNode) {
  if (!fromNode || !toNode) return null;
  const fromCat = window.findNodeType(fromNode.type)?.cat || '';
  const toCat   = window.findNodeType(toNode.type)?.cat   || '';
  const clientCats = ['clients', 'frontend'];
  const dataCats   = ['database', 'cache', 'storage'];
  const queueCats  = ['messaging', 'streaming'];

  // Client → Database / Cache / Storage
  if (clientCats.includes(fromCat) && dataCats.includes(toCat)) {
    return {
      severity: 'critical',
      reason: `${fromNode.label} → ${toNode.label}: Clients must never directly access data stores. This exposes ${toNode.label} to the public internet, bypasses all authentication and input validation, and is a critical security violation.`,
      fix: 'Route via: Client → API Gateway → App Server → ' + toNode.label,
    };
  }
  // Client → Message queue / Stream (unauthenticated producer)
  if (clientCats.includes(fromCat) && queueCats.includes(toCat)) {
    return {
      severity: 'warn',
      reason: `${fromNode.label} → ${toNode.label}: Clients directly producing to message queues — no auth, no schema enforcement, no rate limiting on messages.`,
      fix: 'Add an API Server between client and ' + toNode.label + ' to validate and authorize messages.',
    };
  }
  // Database / Cache → Client (databases never initiate to clients)
  if (dataCats.includes(fromCat) && clientCats.includes(toCat)) {
    return {
      severity: 'critical',
      reason: `${fromNode.label} → ${toNode.label}: Databases are passive — they never initiate connections or push data to clients. This direction violates the request/response model.`,
      fix: 'Remove this edge. Data flows: Client → Server → Database (not the reverse).',
    };
  }
  // Cache → Cache (distributed state mess)
  if (fromCat === 'cache' && toCat === 'cache' && fromNode.type !== toNode.type) {
    return {
      severity: 'warn',
      reason: `${fromNode.label} → ${toNode.label}: Cache-to-cache connections create distributed invalidation nightmares and split-brain cache inconsistency.`,
      fix: 'Let app servers write to each cache independently, or use a single authoritative cache.',
    };
  }
  // Security/WAF receiving FROM internal services (wrong direction)
  if (toCat === 'security' && (fromCat === 'database' || fromCat === 'compute' || fromCat === 'cache')) {
    return {
      severity: 'warn',
      reason: `${fromNode.label} → ${toNode.label}: Internal services routing through WAF/security layer in the wrong direction. Security nodes sit at the perimeter, not in the internal path.`,
      fix: 'WAFs and firewalls protect ingress. Route: Client → WAF → Gateway → Internal services.',
    };
  }
  // Client / Frontend → AI/ML directly (no API gateway, auth, or rate-limiting)
  if (clientCats.includes(fromCat) && toCat === 'ai-ml') {
    return {
      severity: 'warn',
      reason: `${fromNode.label} → ${toNode.label}: Clients hitting ML inference directly — no authentication, no rate limiting, no cost control, and model internals are exposed.`,
      fix: 'Add an API Gateway in front of ' + toNode.label + ' to enforce auth, rate limits, and input validation.',
    };
  }
  // CI/CD → Database / Cache / Storage (direct pipeline → production data)
  if (fromCat === 'cicd' && dataCats.includes(toCat)) {
    return {
      severity: 'critical',
      reason: `${fromNode.label} → ${toNode.label}: CI/CD pipelines must never connect directly to production data stores. This risks accidental data mutation or deletion during a deploy.`,
      fix: 'Use a dedicated migration job (e.g. Flyway, Alembic) that runs in a controlled step — never wire the pipeline directly to ' + toNode.label + '.',
    };
  }
  // Database / Cache → Database / Cache (cross-datastore direct link without compute)
  if (dataCats.includes(fromCat) && dataCats.includes(toCat) && fromNode.id !== toNode.id) {
    return {
      severity: 'warn',
      reason: `${fromNode.label} → ${toNode.label}: Data stores shouldn't talk directly to each other. This creates tight coupling, bypasses business logic, and makes consistency guarantees impossible to reason about.`,
      fix: 'Route through an application service or use a CDC tool (Debezium, DynamoDB Streams) if you need cross-store sync.',
    };
  }
  // Observability → Client (monitoring systems don't push to end-users)
  if (fromCat === 'observability' && clientCats.includes(toCat)) {
    return {
      severity: 'warn',
      reason: `${fromNode.label} → ${toNode.label}: Observability tools (metrics, logs, traces) are internal systems — they don't send data to end-user clients.`,
      fix: 'Remove this edge. Observability data flows to dashboards and alerting systems, not to user-facing clients.',
    };
  }
  return null; // valid connection
};

// 108 node types
const NODE_TYPES = [
  // clients (5)
  { id: "client-web",    cat: "clients", label: "Web Browser",    tag: "Desktop & mobile web", icon: "users", pro: false },
  { id: "client-mobile", cat: "clients", label: "Mobile App",     tag: "iOS / Android native", icon: "device", pro: false },
  { id: "client-api",    cat: "clients", label: "API Consumer",   tag: "External service caller", icon: "globe", pro: false },
  { id: "client-desktop",cat: "clients", label: "Desktop App",    tag: "Electron / native",     icon: "desktop", pro: false },
  { id: "client-iot",    cat: "clients", label: "IoT Device",     tag: "Sensor / embedded",     icon: "iot", pro: true },

  // frontend (6)
  { id: "fe-react",      cat: "frontend", label: "React SPA",     tag: "Single-page app",       icon: "code", pro: false },
  { id: "fe-next",       cat: "frontend", label: "Next.js",       tag: "SSR + ISR + edge",      icon: "code", pro: false },
  { id: "fe-vue",        cat: "frontend", label: "Vue App",       tag: "Vue / Nuxt",            icon: "code", pro: true },
  { id: "fe-svelte",     cat: "frontend", label: "Svelte / Kit",  tag: "Compiled reactive UI",  icon: "code", pro: true },
  { id: "fe-sw",         cat: "frontend", label: "Service Worker",tag: "Offline + push",        icon: "refresh", pro: true },
  { id: "fe-pwa",        cat: "frontend", label: "PWA Shell",     tag: "Installable web app",   icon: "tv", pro: true },

  // network (8)
  { id: "lb",            cat: "network", label: "Load Balancer", tag: "Round-robin / least-conn", icon: "network", pro: false },
  { id: "cdn",           cat: "network", label: "CDN",           tag: "Edge cache, global",     icon: "cdn", pro: false },
  { id: "gateway",       cat: "network", label: "API Gateway",   tag: "Routing + rate limiting", icon: "router", pro: false },
  { id: "dns",           cat: "network", label: "DNS",           tag: "Resolution, weighted",   icon: "globe", pro: false },
  { id: "proxy",         cat: "network", label: "Reverse Proxy", tag: "Nginx / Caddy / Envoy",  icon: "router", pro: false },
  { id: "mesh",          cat: "network", label: "Service Mesh",  tag: "Istio / Linkerd sidecar",icon: "vector", pro: true },
  { id: "ingress",       cat: "network", label: "Ingress",       tag: "K8s ingress controller", icon: "router", pro: true },
  { id: "vpn",           cat: "network", label: "VPN / Tunnel",  tag: "Private network",        icon: "lock", pro: true },

  // compute (8)
  { id: "server",        cat: "compute", label: "App Server",    tag: "HTTP service, stateless", icon: "server", pro: false },
  { id: "vm",            cat: "compute", label: "Virtual Machine",tag: "Hypervisor instance",   icon: "compute", pro: false },
  { id: "function",      cat: "compute", label: "Function",      tag: "Serverless, ephemeral",  icon: "func", pro: false },
  { id: "edge-fn",       cat: "compute", label: "Edge Function", tag: "Run at the CDN edge",    icon: "zap", pro: true },
  { id: "cron",          cat: "compute", label: "Cron Job",      tag: "Scheduled task runner",  icon: "refresh", pro: false },
  { id: "batch",         cat: "compute", label: "Batch Worker",  tag: "Long-running job",       icon: "worker", pro: false },
  { id: "bastion",       cat: "compute", label: "Bastion Host",  tag: "Jump box, SSH gateway",  icon: "lock", pro: true },
  { id: "web-server",    cat: "compute", label: "Web Server",    tag: "Nginx / Apache",         icon: "server", pro: false },

  // containers (5)
  { id: "docker",        cat: "containers", label: "Docker",       tag: "Container runtime",      icon: "container", pro: false },
  { id: "k8s",           cat: "containers", label: "Kubernetes",   tag: "Orchestration cluster",  icon: "k8s", pro: false },
  { id: "pod",           cat: "containers", label: "K8s Pod",      tag: "Smallest deploy unit",   icon: "cube", pro: false },
  { id: "helm",          cat: "containers", label: "Helm Chart",   tag: "Package manager",        icon: "container", pro: true },
  { id: "sidecar",       cat: "containers", label: "Sidecar",      tag: "Auxiliary container",    icon: "cube", pro: true },

  // database (10)
  { id: "sql",           cat: "database", label: "SQL Database", tag: "Postgres primary",       icon: "database", pro: false },
  { id: "nosql",         cat: "database", label: "NoSQL",        tag: "Document store",         icon: "database", pro: false },
  { id: "mongo",         cat: "database", label: "MongoDB",      tag: "Document, replica set",  icon: "database", pro: false },
  { id: "cassandra",     cat: "database", label: "Cassandra",    tag: "Wide-column, AP",        icon: "database", pro: true },
  { id: "dynamo",        cat: "database", label: "DynamoDB",     tag: "Key-value, managed",     icon: "database", pro: true },
  { id: "cockroach",     cat: "database", label: "CockroachDB",  tag: "Distributed SQL",        icon: "database", pro: true },
  { id: "neo4j",         cat: "database", label: "Neo4j",        tag: "Graph database",         icon: "vector", pro: true },
  { id: "influx",        cat: "database", label: "InfluxDB",     tag: "Time-series",            icon: "graph", pro: true },
  { id: "clickhouse",    cat: "database", label: "ClickHouse",   tag: "Columnar OLAP",          icon: "graph", pro: true },
  { id: "bigquery",      cat: "database", label: "BigQuery",     tag: "Serverless warehouse",   icon: "database", pro: true },

  // cache (4)
  { id: "redis",         cat: "cache", label: "Redis",         tag: "In-memory KV",           icon: "flame", pro: false },
  { id: "memcached",     cat: "cache", label: "Memcached",     tag: "Distributed cache",      icon: "flame", pro: false },
  { id: "varnish",       cat: "cache", label: "Varnish",       tag: "HTTP accelerator",       icon: "zap", pro: true },
  { id: "hazelcast",     cat: "cache", label: "Hazelcast",     tag: "In-memory grid",         icon: "flame", pro: true },

  // storage (6)
  { id: "s3",            cat: "storage", label: "S3 Bucket",    tag: "Object storage",         icon: "box", pro: false },
  { id: "blob",          cat: "storage", label: "Blob Store",   tag: "Azure / GCS / Wasabi",   icon: "box", pro: false },
  { id: "nfs",           cat: "storage", label: "NFS Volume",   tag: "Shared filesystem",      icon: "storage", pro: false },
  { id: "glacier",       cat: "storage", label: "Glacier",      tag: "Cold archival",          icon: "storage", pro: true },
  { id: "object",        cat: "storage", label: "Object Store", tag: "Self-hosted, MinIO",     icon: "box", pro: true },
  { id: "file",          cat: "storage", label: "File Storage", tag: "EFS / FSx",              icon: "storage", pro: true },

  // messaging (6)
  { id: "kafka",         cat: "messaging", label: "Kafka",        tag: "Event log, partitioned", icon: "queue", pro: false },
  { id: "rabbitmq",      cat: "messaging", label: "RabbitMQ",     tag: "AMQP queue",            icon: "rabbit", pro: false },
  { id: "sqs",           cat: "messaging", label: "SQS",          tag: "Managed queue",         icon: "queue", pro: true },
  { id: "nats",          cat: "messaging", label: "NATS",         tag: "Lightweight pub/sub",   icon: "queue", pro: true },
  { id: "pulsar",        cat: "messaging", label: "Pulsar",       tag: "Multi-tenant streams",  icon: "queue", pro: true },
  { id: "eventbridge",   cat: "messaging", label: "EventBridge",  tag: "Event bus",             icon: "messaging", pro: true },

  // streaming (4)
  { id: "kinesis",       cat: "streaming", label: "Kinesis",      tag: "AWS data streams",       icon: "stream", pro: true },
  { id: "flink",         cat: "streaming", label: "Apache Flink", tag: "Stateful processing",    icon: "stream", pro: true },
  { id: "spark",         cat: "streaming", label: "Spark",        tag: "Batch + stream",         icon: "spark", pro: true },
  { id: "storm",         cat: "streaming", label: "Storm",        tag: "Realtime computation",   icon: "stream", pro: true },

  // ai-ml (8)
  { id: "gpu",           cat: "ai-ml", label: "GPU Cluster",  tag: "A100 / H100 fleet",      icon: "gpu", pro: true },
  { id: "inference",     cat: "ai-ml", label: "Inference",    tag: "Model serving",          icon: "brain", pro: true },
  { id: "vectordb",      cat: "ai-ml", label: "Vector DB",    tag: "Embeddings, pgvector",   icon: "vector", pro: true },
  { id: "rag",           cat: "ai-ml", label: "RAG Pipeline", tag: "Retrieval + generation", icon: "layers", pro: true },
  { id: "embed",         cat: "ai-ml", label: "Embedding",    tag: "Encoder service",        icon: "vector", pro: true },
  { id: "llm",           cat: "ai-ml", label: "LLM",          tag: "Foundation model",       icon: "brain", pro: true },
  { id: "finetune",      cat: "ai-ml", label: "Fine-tune",    tag: "Training pipeline",      icon: "cpu", pro: true },
  { id: "agent",         cat: "ai-ml", label: "Agent",        tag: "Tool-using AI",          icon: "bot", pro: true },

  // observability (6)
  { id: "prom",          cat: "observability", label: "Prometheus",  tag: "Metrics + alerting",    icon: "graph", pro: false },
  { id: "grafana",       cat: "observability", label: "Grafana",     tag: "Dashboards",           icon: "chart", pro: true },
  { id: "datadog",       cat: "observability", label: "DataDog",     tag: "APM + tracing",        icon: "eye", pro: true },
  { id: "sentry",        cat: "observability", label: "Sentry",      tag: "Error tracking",       icon: "warn", pro: true },
  { id: "jaeger",        cat: "observability", label: "Jaeger",      tag: "Distributed tracing",  icon: "vector", pro: true },
  { id: "loki",          cat: "observability", label: "Loki",        tag: "Log aggregation",      icon: "log", pro: true },

  // security (6)
  { id: "waf",           cat: "security", label: "WAF",         tag: "Web app firewall",       icon: "shield", pro: false },
  { id: "auth",          cat: "security", label: "Auth Service",tag: "OAuth / OIDC",           icon: "lock", pro: false },
  { id: "secrets",       cat: "security", label: "Secrets Mgr", tag: "Vault, rotation",        icon: "key", pro: true },
  { id: "iam",           cat: "security", label: "IAM",         tag: "Identity + roles",       icon: "users", pro: true },
  { id: "kms",           cat: "security", label: "KMS",         tag: "Key management",         icon: "key", pro: true },
  { id: "mtls",          cat: "security", label: "mTLS",        tag: "Mutual certificates",    icon: "shield", pro: true },

  // cicd (5)
  { id: "gha",           cat: "cicd", label: "GitHub Actions",tag: "CI pipeline",            icon: "build", pro: false },
  { id: "jenkins",       cat: "cicd", label: "Jenkins",       tag: "Self-hosted CI",         icon: "build", pro: true },
  { id: "argocd",        cat: "cicd", label: "ArgoCD",        tag: "GitOps deploys",         icon: "refresh", pro: true },
  { id: "terraform",     cat: "cicd", label: "Terraform",     tag: "Infra as code",          icon: "cube", pro: true },
  { id: "git",           cat: "cicd", label: "Git Repo",      tag: "Source of truth",        icon: "branch", pro: false },

  // aws (6)
  { id: "aws-ec2",       cat: "aws", label: "EC2",          tag: "Virtual machine",        icon: "server", pro: false },
  { id: "aws-lambda",    cat: "aws", label: "Lambda",       tag: "Serverless function",    icon: "func", pro: false },
  { id: "aws-rds",       cat: "aws", label: "RDS",          tag: "Managed SQL",            icon: "database", pro: true },
  { id: "aws-s3",        cat: "aws", label: "S3",           tag: "Object storage",         icon: "box", pro: false },
  { id: "aws-dynamo",    cat: "aws", label: "DynamoDB",     tag: "Managed NoSQL",          icon: "database", pro: true },
  { id: "aws-cf",        cat: "aws", label: "CloudFront",   tag: "AWS CDN",                icon: "cdn", pro: true },

  // gcp (4)
  { id: "gcp-run",       cat: "gcp", label: "Cloud Run",    tag: "Managed containers",     icon: "container", pro: true },
  { id: "gcp-bq",        cat: "gcp", label: "BigQuery",     tag: "Serverless warehouse",   icon: "database", pro: true },
  { id: "gcp-fire",      cat: "gcp", label: "Firestore",    tag: "Realtime NoSQL",         icon: "database", pro: true },
  { id: "gcp-pub",       cat: "gcp", label: "Pub/Sub",      tag: "Global messaging",       icon: "messaging", pro: true },

  // azure (4)
  { id: "az-vm",         cat: "azure", label: "Azure VM",   tag: "Compute, Hyper-V",       icon: "server", pro: true },
  { id: "az-func",       cat: "azure", label: "Functions",  tag: "Serverless",             icon: "func", pro: true },
  { id: "az-cosmos",     cat: "azure", label: "Cosmos DB",  tag: "Multi-model",            icon: "database", pro: true },
  { id: "az-bus",        cat: "azure", label: "Service Bus",tag: "Enterprise messaging",   icon: "queue", pro: true },

  // saas (5)
  { id: "stripe",        cat: "saas", label: "Stripe",     tag: "Payments",               icon: "dollar", pro: true },
  { id: "twilio",        cat: "saas", label: "Twilio",     tag: "SMS / voice",            icon: "phone", pro: true },
  { id: "sendgrid",      cat: "saas", label: "SendGrid",   tag: "Transactional email",    icon: "mail", pro: true },
  { id: "segment",       cat: "saas", label: "Segment",    tag: "Analytics router",       icon: "segment", pro: true },
  { id: "slack",         cat: "saas", label: "Slack",      tag: "Alerts + chatops",       icon: "chat", pro: true },

  // servers (2)
  { id: "worker",        cat: "servers", label: "Worker",     tag: "Background jobs",        icon: "worker", pro: false },
  { id: "backend",       cat: "servers", label: "Backend",    tag: "Generic service",        icon: "server", pro: false },
];
window.NODE_TYPES = NODE_TYPES;
window.findNodeType = (id) => NODE_TYPES.find(t => t.id === id);

// Architecture templates
const TEMPLATES = [
  { id: "tmpl-3tier", name: "3-Tier Web", cat: "Classic", catColor: "#6366f1", desc: "LB → app servers → SQL DB.",
    nodes: [
      { type: "client-web", x: 60,  y: 220 },
      { type: "lb",         x: 240, y: 220 },
      { type: "server",     x: 420, y: 140 },
      { type: "server",     x: 420, y: 300 },
      { type: "sql",        x: 620, y: 220 },
    ],
    edges: [[0,1],[1,2],[1,3],[2,4],[3,4]]
  },
  { id: "tmpl-micro", name: "Microservices", cat: "Distributed", catColor: "#0ea5e9", desc: "Gateway + 3 services + Redis.",
    nodes: [
      { type: "client-mobile", x: 60,  y: 220 },
      { type: "gateway",       x: 220, y: 220 },
      { type: "server",        x: 400, y: 100 },
      { type: "server",        x: 400, y: 220 },
      { type: "server",        x: 400, y: 340 },
      { type: "sql",           x: 580, y: 100 },
      { type: "mongo",         x: 580, y: 220 },
      { type: "redis",         x: 580, y: 340 },
    ],
    edges: [[0,1],[1,2],[1,3],[1,4],[2,5],[3,6],[4,7]]
  },
  { id: "tmpl-event", name: "Event-Driven", cat: "Async", catColor: "#d946ef", desc: "Producers → Kafka → workers.",
    nodes: [
      { type: "client-api", x: 60,  y: 200 },
      { type: "server",     x: 220, y: 200 },
      { type: "kafka",      x: 400, y: 200 },
      { type: "worker",     x: 580, y: 120 },
      { type: "worker",     x: 580, y: 280 },
      { type: "mongo",      x: 760, y: 200 },
    ],
    edges: [[0,1],[1,2],[2,3],[2,4],[3,5],[4,5]]
  },
  { id: "tmpl-cqrs", name: "CQRS", cat: "Pattern", catColor: "#10b981", desc: "Write side → event log → read replicas.",
    nodes: [
      { type: "client-web", x: 60, y: 220 },
      { type: "gateway",    x: 220, y: 220 },
      { type: "server",     x: 400, y: 120 },
      { type: "server",     x: 400, y: 320 },
      { type: "kafka",      x: 580, y: 120 },
      { type: "mongo",      x: 760, y: 120 },
      { type: "sql",        x: 760, y: 320 },
    ],
    edges: [[0,1],[1,2],[1,3],[2,4],[4,5],[3,6]]
  },
  { id: "tmpl-cdn",  name: "CDN + Origin", cat: "Edge", catColor: "#f59e0b", desc: "Edge cache fronting origin.",
    nodes: [
      { type: "client-web", x: 60, y: 220 },
      { type: "cdn",        x: 220, y: 220 },
      { type: "lb",         x: 400, y: 220 },
      { type: "server",     x: 580, y: 220 },
      { type: "sql",        x: 760, y: 220 },
    ],
    edges: [[0,1],[1,2],[2,3],[3,4]]
  },
  { id: "tmpl-ai", name: "AI / RAG", cat: "ML", catColor: "#06b6d4", desc: "Gateway → LLM + vector lookup.",
    nodes: [
      { type: "client-api", x: 60,  y: 220 },
      { type: "gateway",    x: 220, y: 220 },
      { type: "rag",        x: 400, y: 220 },
      { type: "vectordb",   x: 580, y: 120 },
      { type: "llm",        x: 580, y: 320 },
      { type: "redis",      x: 760, y: 220 },
    ],
    edges: [[0,1],[1,2],[2,3],[2,4],[3,5],[4,5]]
  },
  { id: "tmpl-k8s", name: "Kubernetes", cat: "Cloud Native", catColor: "#2563eb", desc: "Ingress → K8s pods + service mesh.",
    nodes: [
      { type: "client-web", x: 60,  y: 220 },
      { type: "ingress",    x: 220, y: 220 },
      { type: "mesh",       x: 380, y: 220 },
      { type: "pod",        x: 540, y: 120 },
      { type: "pod",        x: 540, y: 220 },
      { type: "pod",        x: 540, y: 320 },
      { type: "sql",        x: 720, y: 220 },
    ],
    edges: [[0,1],[1,2],[2,3],[2,4],[2,5],[3,6],[4,6],[5,6]]
  },
  { id: "tmpl-serverless", name: "Serverless", cat: "FaaS", catColor: "#ff9900", desc: "API GW → Lambda → DynamoDB.",
    nodes: [
      { type: "client-mobile", x: 60,  y: 220 },
      { type: "gateway",       x: 220, y: 220 },
      { type: "aws-lambda",    x: 400, y: 140 },
      { type: "aws-lambda",    x: 400, y: 300 },
      { type: "aws-dynamo",    x: 580, y: 220 },
      { type: "aws-s3",        x: 760, y: 220 },
    ],
    edges: [[0,1],[1,2],[1,3],[2,4],[3,4],[2,5]]
  },

  // --- Bigger templates ---
  { id: "tmpl-ecommerce", name: "E-Commerce Platform", cat: "Fullstack", catColor: "#10b981", desc: "Full storefront with CDN, auth, payments, search, and async orders.",
    nodes: [
      { type: "client-web",    x: 40,  y: 300 },
      { type: "client-mobile", x: 40,  y: 460 },
      { type: "cdn",           x: 220, y: 300 },
      { type: "waf",           x: 220, y: 460 },
      { type: "lb",            x: 400, y: 380 },
      { type: "gateway",       x: 580, y: 380 },
      { type: "auth",          x: 760, y: 180 },
      { type: "server",        x: 760, y: 300 },
      { type: "server",        x: 760, y: 420 },
      { type: "server",        x: 760, y: 540 },
      { type: "sql",           x: 960, y: 260 },
      { type: "redis",         x: 960, y: 380 },
      { type: "kafka",         x: 960, y: 500 },
      { type: "worker",        x: 1140,y: 420 },
      { type: "stripe",        x: 1140,y: 540 },
    ],
    edges: [[0,2],[1,3],[2,4],[3,4],[4,5],[5,6],[5,7],[5,8],[5,9],[7,10],[7,11],[8,11],[9,12],[12,13],[13,14]]
  },

  { id: "tmpl-saas-global", name: "Global SaaS", cat: "Multi-region", catColor: "#a855f7", desc: "Multi-region LB, microservices mesh, polyglot persistence, observability.",
    nodes: [
      { type: "client-web",    x: 40,  y: 340 },
      { type: "dns",           x: 200, y: 340 },
      { type: "cdn",           x: 380, y: 220 },
      { type: "lb",            x: 380, y: 340 },
      { type: "lb",            x: 380, y: 460 },
      { type: "gateway",       x: 560, y: 340 },
      { type: "mesh",          x: 740, y: 340 },
      { type: "server",        x: 920, y: 180 },
      { type: "server",        x: 920, y: 300 },
      { type: "server",        x: 920, y: 420 },
      { type: "server",        x: 920, y: 540 },
      { type: "sql",           x: 1100,y: 180 },
      { type: "mongo",         x: 1100,y: 300 },
      { type: "redis",         x: 1100,y: 420 },
      { type: "kafka",         x: 1100,y: 540 },
      { type: "prom",          x: 1280,y: 340 },
    ],
    edges: [[0,1],[1,2],[1,3],[1,4],[2,5],[3,5],[4,5],[5,6],[6,7],[6,8],[6,9],[6,10],[7,11],[8,12],[9,13],[10,14],[7,15],[8,15],[9,15],[10,15]]
  },

  { id: "tmpl-data-pipeline", name: "Data Lakehouse", cat: "Analytics", catColor: "#14b8a6", desc: "Streaming ingest → lake → warehouse → BI dashboards.",
    nodes: [
      { type: "client-api",    x: 40,  y: 180 },
      { type: "client-iot",    x: 40,  y: 340 },
      { type: "client-mobile", x: 40,  y: 500 },
      { type: "kafka",         x: 220, y: 340 },
      { type: "flink",         x: 400, y: 260 },
      { type: "spark",         x: 400, y: 420 },
      { type: "s3",            x: 600, y: 180 },
      { type: "s3",            x: 600, y: 340 },
      { type: "clickhouse",    x: 600, y: 500 },
      { type: "bigquery",      x: 800, y: 340 },
      { type: "grafana",       x: 1000,y: 260 },
      { type: "prom",          x: 1000,y: 420 },
    ],
    edges: [[0,3],[1,3],[2,3],[3,4],[3,5],[4,6],[4,7],[5,7],[5,8],[7,9],[8,9],[9,10],[9,11]]
  },

  { id: "tmpl-rag-ai", name: "Production RAG System", cat: "AI/ML", catColor: "#06b6d4", desc: "Full RAG pipeline: embedding, vector search, LLM, caching, observability.",
    nodes: [
      { type: "client-web",    x: 40,  y: 340 },
      { type: "gateway",       x: 220, y: 340 },
      { type: "auth",          x: 220, y: 200 },
      { type: "redis",         x: 400, y: 200 },
      { type: "server",        x: 400, y: 340 },
      { type: "embed",         x: 600, y: 260 },
      { type: "vectordb",      x: 600, y: 420 },
      { type: "rag",           x: 800, y: 340 },
      { type: "llm",           x: 1000,y: 260 },
      { type: "gpu",           x: 1000,y: 420 },
      { type: "s3",            x: 1180,y: 340 },
      { type: "prom",          x: 600, y: 580 },
    ],
    edges: [[0,1],[1,2],[2,3],[1,4],[4,3],[4,5],[5,6],[4,7],[7,6],[7,8],[8,9],[8,10],[4,11],[7,11]]
  },

  { id: "tmpl-k8s-prod", name: "K8s Production Cluster", cat: "Cloud Native", catColor: "#2563eb", desc: "Full K8s stack: ingress, service mesh, pods, HPA, observability.",
    nodes: [
      { type: "client-web",    x: 40,  y: 340 },
      { type: "cdn",           x: 200, y: 340 },
      { type: "waf",           x: 360, y: 340 },
      { type: "ingress",       x: 520, y: 340 },
      { type: "mesh",          x: 700, y: 340 },
      { type: "pod",           x: 880, y: 180 },
      { type: "pod",           x: 880, y: 300 },
      { type: "pod",           x: 880, y: 420 },
      { type: "pod",           x: 880, y: 540 },
      { type: "redis",         x: 1060,y: 240 },
      { type: "sql",           x: 1060,y: 380 },
      { type: "kafka",         x: 1060,y: 500 },
      { type: "prom",          x: 1240,y: 340 },
      { type: "grafana",       x: 1420,y: 340 },
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[4,6],[4,7],[4,8],[5,9],[6,9],[7,10],[8,11],[5,12],[6,12],[7,12],[8,12],[12,13]]
  },

  { id: "tmpl-social", name: "Social Media Platform", cat: "Fullstack", catColor: "#ec4899", desc: "Feed, notifications, media uploads, search, real-time WebSocket.",
    nodes: [
      { type: "client-mobile", x: 40,  y: 220 },
      { type: "client-web",    x: 40,  y: 380 },
      { type: "cdn",           x: 220, y: 220 },
      { type: "gateway",       x: 220, y: 380 },
      { type: "auth",          x: 400, y: 140 },
      { type: "server",        x: 400, y: 280 },
      { type: "server",        x: 400, y: 420 },
      { type: "server",        x: 400, y: 560 },
      { type: "redis",         x: 600, y: 180 },
      { type: "sql",           x: 600, y: 300 },
      { type: "mongo",         x: 600, y: 420 },
      { type: "s3",            x: 600, y: 540 },
      { type: "kafka",         x: 800, y: 360 },
      { type: "worker",        x: 980, y: 280 },
      { type: "worker",        x: 980, y: 440 },
      { type: "sendgrid",      x: 1160,y: 360 },
    ],
    edges: [[0,2],[0,3],[1,2],[1,3],[2,5],[3,4],[3,5],[3,6],[3,7],[4,9],[5,8],[5,9],[6,10],[7,11],[5,12],[6,12],[12,13],[12,14],[13,15],[14,15]]
  },

  { id: "tmpl-fintech", name: "Fintech / Banking", cat: "Regulated", catColor: "#f59e0b", desc: "Fraud detection, ledger, compliance, event sourcing, audit trail.",
    nodes: [
      { type: "client-mobile", x: 40,  y: 260 },
      { type: "client-web",    x: 40,  y: 420 },
      { type: "waf",           x: 220, y: 340 },
      { type: "gateway",       x: 400, y: 340 },
      { type: "auth",          x: 580, y: 180 },
      { type: "server",        x: 580, y: 300 },
      { type: "server",        x: 580, y: 420 },
      { type: "server",        x: 580, y: 540 },
      { type: "kafka",         x: 780, y: 340 },
      { type: "sql",           x: 960, y: 220 },
      { type: "sql",           x: 960, y: 380 },
      { type: "redis",         x: 960, y: 520 },
      { type: "worker",        x: 1140,y: 300 },
      { type: "worker",        x: 1140,y: 440 },
      { type: "stripe",        x: 1320,y: 360 },
    ],
    edges: [[0,2],[1,2],[2,3],[3,4],[3,5],[3,6],[3,7],[4,9],[5,8],[6,8],[7,8],[8,9],[8,10],[8,11],[9,12],[10,12],[11,13],[12,14],[13,14]]
  },

  { id: "tmpl-devops", name: "DevSecOps Pipeline", cat: "CI/CD", catColor: "#facc15", desc: "Source → build → test → scan → deploy → monitor → alert.",
    nodes: [
      { type: "git",           x: 40,  y: 300 },
      { type: "gha",           x: 220, y: 200 },
      { type: "jenkins",       x: 220, y: 400 },
      { type: "docker",        x: 400, y: 200 },
      { type: "secrets",       x: 400, y: 400 },
      { type: "argocd",        x: 580, y: 300 },
      { type: "k8s",           x: 760, y: 180 },
      { type: "k8s",           x: 760, y: 420 },
      { type: "prom",          x: 940, y: 180 },
      { type: "grafana",       x: 940, y: 300 },
      { type: "sentry",        x: 940, y: 420 },
      { type: "slack",         x: 1120,y: 300 },
    ],
    edges: [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,5],[5,6],[5,7],[6,8],[7,8],[8,9],[9,11],[10,11],[7,10]]
  },

  { id: "tmpl-realtime", name: "Real-time Gaming", cat: "Low-latency", catColor: "#ef4444", desc: "WebSocket servers, matchmaking, state sync, leaderboard, pub/sub.",
    nodes: [
      { type: "client-mobile", x: 40,  y: 200 },
      { type: "client-web",    x: 40,  y: 340 },
      { type: "client-desktop",x: 40,  y: 480 },
      { type: "lb",            x: 220, y: 340 },
      { type: "gateway",       x: 400, y: 340 },
      { type: "server",        x: 580, y: 200 },
      { type: "server",        x: 580, y: 340 },
      { type: "server",        x: 580, y: 480 },
      { type: "redis",         x: 760, y: 260 },
      { type: "redis",         x: 760, y: 420 },
      { type: "kafka",         x: 940, y: 340 },
      { type: "sql",           x: 1120,y: 260 },
      { type: "worker",        x: 1120,y: 420 },
    ],
    edges: [[0,3],[1,3],[2,3],[3,4],[4,5],[4,6],[4,7],[5,8],[6,8],[6,9],[7,9],[8,10],[9,10],[10,11],[10,12]]
  },
];
window.TEMPLATES = TEMPLATES;

// Traffic profiles
const PROFILES = [
  { id: "p-dev",      name: "Dev",          rate: 10,    pattern: "constant", color: "#10b981", dim: "rgba(16,185,129,0.14)" },
  { id: "p-stage",    name: "Staging",      rate: 100,   pattern: "constant", color: "#3b82f6", dim: "rgba(59,130,246,0.14)" },
  { id: "p-prod",     name: "Production",   rate: 500,   pattern: "wave",     color: "#0ea5e9", dim: "rgba(14,165,233,0.14)" },
  { id: "p-bf",       name: "Black Friday", rate: 5000,  pattern: "spike",    color: "#f59e0b", dim: "rgba(245,158,11,0.14)" },
  { id: "p-launch",   name: "Launch Day",   rate: 12000, pattern: "ramp",     color: "#ef4444", dim: "rgba(239,68,68,0.14)" },
  { id: "p-incident", name: "Incident",     rate: 8000,  pattern: "spike",    color: "#ef4444", dim: "rgba(239,68,68,0.14)", chaos: true },
  { id: "p-viral",    name: "Viral",        rate: 25000, pattern: "ramp",     color: "#a855f7", dim: "rgba(168,85,247,0.14)" },
  { id: "p-ddos",     name: "DDoS",         rate: 45000, pattern: "spike",    color: "#991b1b", dim: "rgba(153,27,27,0.16)", chaos: true },
];
window.PROFILES = PROFILES;

// Test scenarios
const TESTS = [
  { id: "smoke",      name: "Smoke Test",     badge: "QUICK",   color: "#10b981", dim: "rgba(16,185,129,0.14)", desc: "10s at 10 req/s — health check." },
  { id: "baseline",   name: "Baseline",       badge: "30s",     color: "#3b82f6", dim: "rgba(59,130,246,0.14)", desc: "50 req/s constant — capture nominal." },
  { id: "load",       name: "Load Test",      badge: "60s",     color: "#3b82f6", dim: "rgba(59,130,246,0.14)", desc: "500 req/s — sustained expected load." },
  { id: "stress",     name: "Stress Test",    badge: "RAMP",    color: "#f59e0b", dim: "rgba(245,158,11,0.14)", desc: "Ramp 1 → 5k req/s over 90s." },
  { id: "spike",      name: "Spike Test",     badge: "BURST",   color: "#f59e0b", dim: "rgba(245,158,11,0.14)", desc: "1k req/s bursts every 15s." },
  { id: "soak",       name: "Soak Test",      badge: "120s",    color: "#a855f7", dim: "rgba(168,85,247,0.14)", desc: "200 req/s endurance — memory leak hunt." },
  { id: "breakpoint", name: "Breakpoint",     badge: "STEP",    color: "#f59e0b", dim: "rgba(245,158,11,0.14)", desc: "10k step ramp — find the cliff." },
  { id: "chaos",      name: "Chaos Test",     badge: "CHAOS",   color: "#ef4444", dim: "rgba(239,68,68,0.14)",  desc: "Failures injected mid-flight." },
  { id: "failover",   name: "Failover Test",  badge: "FAIL",    color: "#ef4444", dim: "rgba(239,68,68,0.14)",  desc: "Kill primary; verify takeover." },
  { id: "sla",        name: "SLA Validation", badge: "SLA",     color: "#10b981", dim: "rgba(16,185,129,0.14)", desc: "Assert p95 < 200ms, err < 0.5%." },
  { id: "cascade",    name: "Cascade Failure",badge: "EXTREME", color: "#991b1b", dim: "rgba(153,27,27,0.18)",  desc: "One node falls → watch blast radius." },
  { id: "recovery",   name: "Recovery Test",  badge: "MTTR",    color: "#a855f7", dim: "rgba(168,85,247,0.14)", desc: "Measure time-to-recover after fault." },
];
window.TESTS = TESTS;
