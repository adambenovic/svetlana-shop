// Inline <head> script (contract C-f). It runs synchronously while the HTML is
// parsed — before first paint and before React hydrates — so client-only state
// is reflected in the DOM without a flash:
//  - theme: html.light when localStorage 'theme' is 'light', or when nothing is
//    stored and the OS prefers a light scheme (dark is the default).
//  - announcement: html[data-ann-dismissed] when the visitor dismissed the bar
//    this session; globals.css then hides [data-announcement].
// <html> carries suppressHydrationWarning because this changes its attributes.
// Storage access is wrapped: it throws when cookies/storage are blocked.
export const THEME_BOOTSTRAP_SCRIPT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('theme');if(t==='light'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches))d.classList.add('light')}catch(e){}try{if(sessionStorage.getItem('sv_announcement_dismissed'))d.dataset.annDismissed='1'}catch(e){}})()`
