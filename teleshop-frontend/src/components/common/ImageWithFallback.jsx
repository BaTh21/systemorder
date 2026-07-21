// src/components/common/ImageWithFallback.jsx
import { useState } from 'react';
import { Box } from '@mui/material';

const PLACEHOLDER_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <rect width="300" height="300" fill="#E8E8E8"/>
  <rect x="4" y="4" width="292" height="292" fill="#F8F8F8" stroke="#DDD" stroke-width="1"/>
  <text x="150" y="145" font-family="Arial" font-size="14" fill="#AAA" text-anchor="middle">No Image</text>
  <text x="150" y="165" font-family="Arial" font-size="11" fill="#CCC" text-anchor="middle">Available</text>
</svg>
`)}`;

const ImageWithFallback = ({
  src,
  alt = '',
  width = '100%',
  height = '100%',
  objectFit = 'cover',
  sx = {},
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src || PLACEHOLDER_SVG);
  const [error, setError] = useState(false);

  const getProcessedUrl = (url) => {
    if (!url) return PLACEHOLDER_SVG;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
    return `${API_BASE_URL}/${url}`;
  };

  const handleError = (e) => {
    console.error('❌ Image failed to load:', imgSrc);
    if (!error) {
      setError(true);
      setImgSrc(PLACEHOLDER_SVG);
    }
  };

  const handleLoad = () => {
    console.log('✅ Image loaded:', imgSrc);
  };

  if (src !== imgSrc && !error) {
    const processedUrl = getProcessedUrl(src);
    if (processedUrl !== imgSrc) {
      setImgSrc(processedUrl);
      setError(false);
    }
  }

  return (
    <Box
      sx={{
        width,
        height,
        overflow: 'hidden',
        position: 'relative',
        bgcolor: '#f1f5f9',
        ...sx,
      }}
    >
      <Box
        component="img"
        src={imgSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: objectFit,
          display: 'block',
        }}
        {...props}
      />
    </Box>
  );
};

export default ImageWithFallback;