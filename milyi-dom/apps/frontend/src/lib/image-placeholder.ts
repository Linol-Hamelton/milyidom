const shimmerSvg = (w: number, h: number) =>
  `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="#f1ece4"/>
    <rect width="${w}" height="${h}" fill="url(#g)" filter="url(#b)" opacity="0.6"/>
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="#f1ece4"/>
        <stop offset="50%" stop-color="#e8e0d8"/>
        <stop offset="100%" stop-color="#f1ece4"/>
      </linearGradient>
      <filter id="b">
        <feGaussianBlur stdDeviation="20"/>
      </filter>
    </defs>
  </svg>`;

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);

export const listingBlurDataURL = `data:image/svg+xml;base64,${toBase64(shimmerSvg(800, 600))}`;
