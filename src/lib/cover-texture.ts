"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

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
      url,
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
