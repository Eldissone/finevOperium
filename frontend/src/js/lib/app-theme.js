export const FONT_FAMILIES = {
  everett: '"TWK Everett", system-ui, sans-serif',
  system: 'system-ui, -apple-system, sans-serif',
  inter: '"Inter", system-ui, sans-serif',
};

const DARK_THEME = {
  background: '#0f172a',
  surface: '#1e293b',
  'surface-highlight': '#334155',
  text: '#f1f5f9',
  'text-muted': '#94a3b8',
  border: '#334155',
};

const LIGHT_THEME = {
  background: '#f8fafc',
  surface: '#ffffff',
  'surface-highlight': '#f1f5f9',
  text: '#0f172a',
  'text-muted': '#64748b',
  border: '#e2e8f0',
};

export function applyAppTheme(themeSetup = {}) {
  const root = document.documentElement;
  const primary = themeSetup.primaryColor || '#FF7A00';
  const mode = themeSetup.mode || 'light';
  const fontKey = themeSetup.fontFamily || 'everett';
  const palette = mode === 'dark' ? DARK_THEME : LIGHT_THEME;

  root.style.setProperty('--app-primary', primary);
  root.style.setProperty('--app-primary-glow', `${primary}40`);
  root.dataset.appTheme = mode;

  Object.entries(palette).forEach(([key, value]) => {
    root.style.setProperty(`--app-${key}`, value);
  });

  const font = FONT_FAMILIES[fontKey] || FONT_FAMILIES.everett;
  root.style.setProperty('--app-font', font);
  document.body.style.fontFamily = font;

  let styleEl = document.getElementById('app-dynamic-theme');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'app-dynamic-theme';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    :root {
      --app-primary: ${primary};
    }
    html[data-app-theme] body {
      background-color: var(--app-background) !important;
      color: var(--app-text) !important;
    }
    html[data-app-theme] .bg-background { background-color: var(--app-background) !important; }
    html[data-app-theme] .bg-surface { background-color: var(--app-surface) !important; }
    html[data-app-theme] .bg-surface-highlight { background-color: var(--app-surface-highlight) !important; }
    html[data-app-theme] .text-text { color: var(--app-text) !important; }
    html[data-app-theme] .text-text-muted { color: var(--app-text-muted) !important; }
    html[data-app-theme] .border-border { border-color: var(--app-border) !important; }
    html[data-app-theme] .bg-primary { background-color: var(--app-primary) !important; }
    html[data-app-theme] .text-primary { color: var(--app-primary) !important; }
    html[data-app-theme] .border-primary { border-color: var(--app-primary) !important; }
    html[data-app-theme] .bg-primary\\/10 { background-color: color-mix(in srgb, var(--app-primary) 10%, transparent) !important; }
    html[data-app-theme] .hover\\:bg-primary\\/90:hover { background-color: color-mix(in srgb, var(--app-primary) 90%, black) !important; }
    html[data-app-theme] .hover\\:border-primary\\/50:hover { border-color: color-mix(in srgb, var(--app-primary) 50%, transparent) !important; }
    html[data-app-theme] .glass-card { background-color: var(--app-surface) !important; border-color: var(--app-border) !important; }
    html[data-app-theme] .font-display { font-family: var(--app-font) !important; }
  `;
}

export async function loadAndApplyTheme(spreadsheetId) {
  const { apiFetch } = await import('../api.js');
  try {
    const { config } = await apiFetch(`/api/spreadsheets/${spreadsheetId}/config`);
    if (config?.themeSetup) applyAppTheme(config.themeSetup);
    return config;
  } catch {
    return null;
  }
}
