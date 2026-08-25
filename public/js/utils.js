// ===== Nexora CheckSheet — Shared Utilities =====

/**
 * XSS-safe HTML escaping — escapes &, <, >, ", and '
 */
function esc(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get value by element ID
 */
function gv(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

/**
 * Get value by selector within a parent element
 */
function gq(parent, sel) {
  const el = parent.querySelector(sel);
  return el ? el.value : '';
}

/**
 * Sanitize a string value — returns escaped value or fallback
 */
function safeStr(val, fallback) {
  if (val === undefined || val === null || val === '') return fallback || '—';
  return esc(val);
}

/**
 * Format a date string for display
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch (e) {
    return esc(dateStr);
  }
}

/**
 * Format a date+time string for display
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch (e) {
    return esc(dateStr);
  }
}
