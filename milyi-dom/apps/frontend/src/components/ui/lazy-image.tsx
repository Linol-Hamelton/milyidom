'use client';

import Image from 'next/image';
import { useState } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = '/images/listing-1.jpg',
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const imageSrc = hasError ? placeholder : src;
  const usesFill = width === undefined || height === undefined;
  const imageClassName = `${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`.trim();

  return (
    <div className="relative overflow-hidden">
      <Image
        key={imageSrc}
        src={imageSrc}
        alt={alt}
        {...(usesFill
          ? { fill: true as const, sizes: '100vw' }
          : { width, height })}
        className={imageClassName}
        onLoadingComplete={() => handleLoad()}
        onError={() => handleError()}
        loading="lazy"
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
}

export function ProgressiveImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder,
  lowQualitySrc,
}: LazyImageProps & { lowQualitySrc?: string }) {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || placeholder || src);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = () => {
    if (src !== currentSrc) {
      setCurrentSrc(src);
    }
    setIsLoaded(true);
  };

  const handleError = () => {
    if (placeholder && currentSrc !== placeholder) {
      setCurrentSrc(placeholder);
    }
  };
  const usesFill = width === undefined || height === undefined;
  const imageClassName = `${className} ${isLoaded ? 'opacity-100' : 'opacity-50'} transition-all duration-500`.trim();

  return (
    <div className="relative overflow-hidden">
      <Image
        key={currentSrc}
        src={currentSrc}
        alt={alt}
        {...(usesFill
          ? { fill: true as const, sizes: '100vw' }
          : { width, height })}
        className={imageClassName}
        onLoadingComplete={() => handleLoad()}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}
