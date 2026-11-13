"use client";

import Image from "next/image";
import { useState } from "react";
import type { CubePreviewImage } from "@/data/cube-config";

/** A failed preview leaves the existing glass and wireframe intact. */
export function CubeFaceArtwork({ image }: { image: CubePreviewImage }) {
  const [unavailable, setUnavailable] = useState(false);
  if (unavailable) return null;
  return (
    <div className="cube-face-artwork pointer-events-none select-none">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="320px"
        unoptimized
        draggable={false}
        onError={() => setUnavailable(true)}
      />
    </div>
  );
}
