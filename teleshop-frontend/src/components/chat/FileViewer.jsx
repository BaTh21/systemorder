import { Dialog, IconButton, Box, Typography, Button, Paper, Stack, CircularProgress } from '@mui/material';
import { Close, Download, ZoomIn, ZoomOut, InsertDriveFile, Description, PictureAsPdf, VideoFile, AudioFile, Code, Image, OpenInNew } from '@mui/icons-material';
import { useState, useEffect } from 'react';

const getFileIcon = (filename) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return <Image sx={{ fontSize: 64, color: '#0084ff' }} />;
  if (ext === 'pdf') return <PictureAsPdf sx={{ fontSize: 64, color: '#ef4444' }} />;
  if (['doc', 'docx'].includes(ext)) return <Description sx={{ fontSize: 64, color: '#3b82f6' }} />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <Description sx={{ fontSize: 64, color: '#22c55e' }} />;
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return <VideoFile sx={{ fontSize: 64, color: '#8b5cf6' }} />;
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return <AudioFile sx={{ fontSize: 64, color: '#f59e0b' }} />;
  if (['html', 'css', 'js', 'json', 'xml'].includes(ext)) return <Code sx={{ fontSize: 64, color: '#6366f1' }} />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <InsertDriveFile sx={{ fontSize: 64, color: '#8b5cf6' }} />;
  if (['txt', 'md', 'log'].includes(ext)) return <Description sx={{ fontSize: 64, color: '#6366f1' }} />;
  return <InsertDriveFile sx={{ fontSize: 64, color: '#64748b' }} />;
};

const getFileTypeLabel = (filename) => {
  const ext = filename?.split('.').pop()?.toUpperCase();
  return ext ? `${ext} File` : 'File';
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageFile = (imageUrl, fileData) => {
  if (imageUrl) return true;
  if (fileData?.url && /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(fileData?.url)) return true;
  return false;
};
const isVideoFile = (filename) => ['mp4', 'mov', 'avi', 'webm', 'ogg', 'mkv'].includes(filename?.split('.').pop()?.toLowerCase());
const isAudioFile = (filename) => ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(filename?.split('.').pop()?.toLowerCase());

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
};

const FileViewer = ({ open, imageUrl, fileData, messageId, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));

  const displayUrl = imageUrl || fileData?.url;
  const displayName = fileData?.name || 'Image';
  const displaySize = fileData?.size;
  const isImage = isImageFile(imageUrl, fileData);
  const isVideo = isVideoFile(displayName);
  const isAudio = isAudioFile(displayName);

  useEffect(() => {
    if (open) setZoom(1);
  }, [open]);

  const handleDownload = () => {
    setDownloading(true);
    
    if (messageId) {
      const apiBaseUrl = getApiBaseUrl();
      const downloadUrl = `${apiBaseUrl}/chat/download/${messageId}`;
      window.location.href = downloadUrl;
    } else if (displayUrl) {
      window.location.href = displayUrl;
    }
    
    setTimeout(() => setDownloading(false), 1000);
  };

  const handleOpenInNewTab = () => {
    if (displayUrl) window.open(displayUrl, '_blank');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullScreen
      sx={{
        zIndex: 9999,
        '& .MuiDialog-container': {
          alignItems: 'center',
          justifyContent: 'center',
        },
        '& .MuiBackdrop-root': {
          backgroundColor: (isImage || isVideo) ? 'rgba(0,0,0,0.95) !important' : 'rgba(0,0,0,0.5) !important',
        }
      }}
      PaperProps={{
        sx: {
          bgcolor: (isImage || isVideo) ? 'rgba(0,0,0,0.95)' : '#ffffff',
          boxShadow: 'none',
          backgroundImage: 'none',
          maxHeight: '100vh',
          height: '100vh',
          width: '100vw',
          maxWidth: '100vw',
          m: 0,
          borderRadius: 0,
          position: 'relative',
          zIndex: 9999,
        }
      }}
    >
      <Box sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        flexDirection: 'column',
      }}>
        
        {/* TOP BAR */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          zIndex: 10,
          background: (isImage || isVideo) 
            ? 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)' 
            : 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)',
        }}>
          {!(isImage || isVideo) && (
            <Typography variant="body2" fontWeight={600} sx={{ color: '#333', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </Typography>
          )}
          {(isImage || isVideo) && <Box />}
          
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <Download />}
              onClick={handleDownload}
              disabled={downloading}
              sx={{
                bgcolor: (isImage || isVideo) ? 'rgba(255,255,255,0.2)' : '#0084ff',
                color: 'white',
                borderRadius: 50,
                px: 2.5,
                py: 1,
                fontWeight: 600,
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  bgcolor: (isImage || isVideo) ? 'rgba(255,255,255,0.3)' : '#0066cc',
                }
              }}
            >
              {downloading ? 'Downloading...' : `Download${isImage ? ' JPG' : ''}`}
            </Button>
            
            <IconButton
              onClick={onClose}
              sx={{
                color: (isImage || isVideo) ? 'white' : '#333',
                bgcolor: (isImage || isVideo) ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
                '&:hover': { bgcolor: (isImage || isVideo) ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)' }
              }}
            >
              <Close sx={{ fontSize: 24 }} />
            </IconButton>
          </Stack>
        </Box>

        {/* IMAGE VIEWER */}
        {isImage && (
          <>
            <img
              src={displayUrl}
              alt={displayName}
              style={{
                maxWidth: '90%',
                maxHeight: '80vh',
                objectFit: 'contain',
                transform: `scale(${zoom})`,
                transition: 'transform 0.3s ease',
                cursor: zoom > 1 ? 'grab' : 'zoom-in',
                borderRadius: 4,
                marginTop: 40,
              }}
            />
            
            <Box sx={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 1,
              bgcolor: 'rgba(0,0,0,0.5)',
              borderRadius: 50,
              p: 1,
              zIndex: 10,
              backdropFilter: 'blur(10px)',
            }}>
              <IconButton onClick={handleZoomOut} sx={{ color: 'white' }}>
                <ZoomOut />
              </IconButton>
              <Button onClick={() => setZoom(1)} sx={{ color: 'white', minWidth: 50, fontWeight: 600 }}>
                {Math.round(zoom * 100)}%
              </Button>
              <IconButton onClick={handleZoomIn} sx={{ color: 'white' }}>
                <ZoomIn />
              </IconButton>
            </Box>
          </>
        )}

        {/* VIDEO VIEWER */}
        {isVideo && (
          <Box sx={{ width: '90%', maxWidth: 900, mt: 4 }}>
            <video controls autoPlay style={{ width: '100%', maxHeight: '80vh', borderRadius: 8 }}>
              <source src={displayUrl} type={`video/${displayName.split('.').pop()}`} />
            </video>
            <Typography variant="caption" sx={{ color: 'white', mt: 1, display: 'block', textAlign: 'center' }}>
              {displayName}
            </Typography>
          </Box>
        )}

        {/* AUDIO VIEWER */}
        {isAudio && (
          <Box sx={{ width: '90%', maxWidth: 500, mt: 4, textAlign: 'center' }}>
            <Paper sx={{ p: 4, borderRadius: 4, mb: 2 }}>
              <AudioFile sx={{ fontSize: 80, color: '#f59e0b', mb: 2 }} />
              <Typography variant="h6" fontWeight={600} gutterBottom>{displayName}</Typography>
              {displaySize && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {formatFileSize(displaySize)}
                </Typography>
              )}
              <audio controls style={{ width: '100%', marginTop: 16 }}>
                <source src={displayUrl} type={`audio/${displayName.split('.').pop()}`} />
              </audio>
            </Paper>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownload}
              sx={{ borderRadius: 50, px: 4 }}
            >
              Download Audio
            </Button>
          </Box>
        )}

        {/* FILE VIEWER (PDF, DOC, ZIP, etc.) */}
        {!isImage && !isVideo && !isAudio && (
          <Box sx={{ textAlign: 'center', p: 4, maxWidth: 450, width: '100%', mt: 4 }}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 5, 
                borderRadius: 4, 
                bgcolor: '#f1f5f9', 
                mb: 3,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getFileIcon(displayName)}
            </Paper>
            
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5, wordBreak: 'break-all' }}>
              {displayName}
            </Typography>
            
            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ bgcolor: '#e2e8f0', px: 1.5, py: 0.3, borderRadius: 1, fontWeight: 600 }}>
                {getFileTypeLabel(displayName)}
              </Typography>
              {displaySize && (
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(displaySize)}
                </Typography>
              )}
            </Stack>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, px: 2 }}>
              Preview not available for this file type. You can download the file or open it in a new browser tab.
            </Typography>
            
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <Download />}
                onClick={handleDownload}
                disabled={downloading}
                sx={{ 
                  borderRadius: 50, 
                  px: 4, 
                  py: 1.5,
                  bgcolor: '#0084ff', 
                  '&:hover': { bgcolor: '#0066cc' },
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              >
                {downloading ? 'Downloading...' : 'Download'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<OpenInNew />}
                onClick={handleOpenInNewTab}
                sx={{ 
                  borderRadius: 50, 
                  px: 3, 
                  py: 1.5,
                  borderColor: '#cbd5e1',
                  color: '#475569',
                  fontWeight: 600,
                  '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' }
                }}
              >
                Open in Browser
              </Button>
            </Stack>
          </Box>
        )}
      </Box>
    </Dialog>
  );
};

export default FileViewer;