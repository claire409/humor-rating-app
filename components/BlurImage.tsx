'use client'

import { useCallback, useState } from 'react'

type BlurImageProps = {
  src: string
  alt: string
  className?: string
  imgClassName?: string
}

/** Simple blur-up / skeleton: pulse placeholder until image loads, then fade in. */
export default function BlurImage({ src, alt, className = '', imgClassName = 'object-cover' }: BlurImageProps) {
  const [loaded, setLoaded] = useState(false)

  const onLoad = useCallback(() => setLoaded(true), [])

  return (
    <div className={`relative overflow-hidden bg-slate-200 ${className}`}>
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200"
          aria-hidden
        />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={onLoad}
        loading="lazy"
        decoding="async"
        className={`h-full w-full ${imgClassName} transition-[opacity,filter] duration-500 ${
          loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md scale-[1.02]'
        }`}
      />
    </div>
  )
}
