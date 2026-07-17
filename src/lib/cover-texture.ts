"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

const ALLOWED_HOSTS = ["covers.openlibrary.org", "archive.org"];

/**
 * Rewrites a known cover-image URL to go through our own `/api/cover-proxy`
 * route instead of hitting the external host directly. Some Open Library
 * cover IDs redirect to an archive.org URL that lacks CORS headers, which
 * silently breaks WebGL texture loading (crossOrigin="anonymous" requests
 * fail with no visible error other than the texture never appearing).
 * Routing through our own origin sidesteps CORS entirely.
 */
function toProxiedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const isKnownHost = ALLOWED_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
    if (!isKnownHost) return url;
    return `/api/cover-proxy?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

/**
 * Loads an external image (e.g. an Open Library book cover) into a
 * THREE.Texture for use as a mesh material map.
 *
 * Returns `null` while the image is loading, if no url was given, or if the
 * load failed — callers should render a placeholder in that case and swap to
 * the real texture once it resolves.
 */
export function useCoverTexture(url: string | null | undefined): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }

    let cancelled = false;
    setTexture(null); // reset while the new image loads, so callers can show a placeholder

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      toProxiedUrl(url),
      (loadedTexture) => {
        if (cancelled) {
          loadedTexture.dispose();
          return;
        }
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.needsUpdate = true;
        setTexture(loadedTexture);
      },
      undefined,
      () => {
        // Image failed to load (404, CORS, offline, etc.) — stay null so the
        // caller's placeholder/fallback keeps showing instead of a broken mesh.
        if (!cancelled) setTexture(null);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [url]);

  return texture;
}

