export function cleanupOAuthCodeFromUrl(): void {
  if (typeof window === 'undefined' || !window.location.search.includes('code=')) {
    return;
  }

  const url = new URL(window.location.href);
  if (!url.searchParams.has('code')) {
    return;
  }

  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState(
    window.history.state,
    document.title,
    `${url.pathname}${url.search}${url.hash}`,
  );
}
