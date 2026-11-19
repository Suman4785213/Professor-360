import React, { useEffect, useState } from 'react';
import { apiClient, API_BASE } from './client';

export function privateFileURL(value?: string): string | null {
  if (!value) return null;
  const origin = new URL(API_BASE, window.location.origin).origin;
  let url: URL;
  try { url = new URL(value, origin); } catch { return null; }
  if (url.origin !== origin) return null;
  return url.pathname.startsWith('/media/') || /^\/api\/(v1\/)?(documents|reports)\//.test(url.pathname) ? url.href : null;
}

export async function openPrivateFile(value: string) {
  const url = privateFileURL(value);
  if (!url) return; // Never forward credentials to arbitrary origins.
  const tab = window.open('', '_blank');
  if (tab) tab.opener = null;
  try {
    const response = await apiClient.get(url, { responseType: 'blob' });
    const blob = URL.createObjectURL(response.data);
    if (tab) tab.location.href = blob;
    else { const a = document.createElement('a'); a.href = blob; a.download = 'document'; a.click(); }
    setTimeout(() => URL.revokeObjectURL(blob), 60000);
  } catch {
    tab?.close();
    window.alert('This file could not be opened. Check your access or try again.');
  }
}

export function SecureLink(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} onClick={event => {
    props.onClick?.(event);
    if (!event.defaultPrevented && privateFileURL(props.href)) {
      event.preventDefault(); void openPrivateFile(props.href!);
    }
  }} />;
}

export function SecureImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [blob, setBlob] = useState<string>();
  const privateURL = privateFileURL(props.src);
  useEffect(() => {
    let cancelled = false; let objectURL: string | undefined;
    setBlob(undefined);
    if (privateURL) apiClient.get(privateURL, { responseType: 'blob' }).then(res => {
      if (!cancelled) { objectURL = URL.createObjectURL(res.data); setBlob(objectURL); }
    }).catch(() => {});
    return () => { cancelled = true; if (objectURL) URL.revokeObjectURL(objectURL); };
  }, [privateURL]);
  return <img {...props} src={privateURL ? blob : props.src} />;
}
