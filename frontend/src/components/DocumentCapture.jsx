import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

const DocumentCapture = ({ onCapture }) => {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Compress image to handle different webcam file sizes
  const compressImage = async (base64Image, maxSizeKB = 500) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate scaling to keep under max size while maintaining aspect ratio
        const maxDimension = 1920;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels until under size limit
        let quality = 0.9;
        let compressed = canvas.toDataURL('image/jpeg', quality);

        while (compressed.length > maxSizeKB * 1024 && quality > 0.1) {
          quality -= 0.1;
          compressed = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(compressed);
      };
      img.src = base64Image;
    });
  };

  const capture = useCallback(async () => {
    setIsProcessing(true);
    const imageSrc = webcamRef.current.getScreenshot();

    if (imageSrc) {
      // Compress the image
      const compressed = await compressImage(imageSrc);
      setCapturedImage(compressed);
      setIsProcessing(false);
    }
  }, [webcamRef]);

  const retake = () => {
    setCapturedImage(null);
  };

  const confirmCapture = () => {
    onCapture(capturedImage);
    setShowWebcam(false);
  };

  const handleUserMedia = () => {
    setCameraError(null);
  };

  const handleUserMediaError = (error) => {
    console.error('Camera error:', error);
    setCameraError('Unable to access camera. Please ensure camera permissions are granted.');
  };

  if (!showWebcam && !capturedImage) {
    return (
      <div className="document-capture-prompt">
        <div className="capture-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </div>
        <h3>Document Verification Required</h3>
        <p>Please prepare your government-issued ID or passport</p>
        <button
          onClick={() => setShowWebcam(true)}
          className="btn-primary-large"
        >
          Start Camera
        </button>
      </div>
    );
  }

  return (
    <div className="document-capture-container">
      <div className="capture-header">
        <h3>
          {capturedImage ? 'Review Your Document' : 'Capture Your Document'}
        </h3>
        <p className="capture-instructions">
          {capturedImage
            ? 'Please ensure your document is clearly visible and readable'
            : 'Position your ID or passport within the frame and ensure good lighting'
          }
        </p>
      </div>

      <div className="capture-frame">
        {!capturedImage ? (
          <>
            {cameraError ? (
              <div className="camera-error">
                <p>{cameraError}</p>
                <button onClick={() => setShowWebcam(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    width: 1280,
                    height: 720,
                    facingMode: "user"
                  }}
                  onUserMedia={handleUserMedia}
                  onUserMediaError={handleUserMediaError}
                  className="webcam-feed"
                />
                <div className="capture-overlay">
                  <div className="frame-guide">
                    <div className="corner corner-tl"></div>
                    <div className="corner corner-tr"></div>
                    <div className="corner corner-bl"></div>
                    <div className="corner corner-br"></div>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="captured-preview">
            <img src={capturedImage} alt="Captured document" />
          </div>
        )}
      </div>

      <div className="capture-actions">
        {!capturedImage ? (
          <>
            <button
              onClick={() => setShowWebcam(false)}
              className="btn-secondary"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={capture}
              className="btn-capture"
              disabled={isProcessing || cameraError}
            >
              {isProcessing ? 'Processing...' : 'Capture Photo'}
            </button>
          </>
        ) : (
          <>
            <button onClick={retake} className="btn-secondary">
              Retake Photo
            </button>
            <button onClick={confirmCapture} className="btn-primary">
              Confirm & Continue
            </button>
          </>
        )}
      </div>

      <div className="capture-tips">
        <div className="tip">✓ Ensure good lighting</div>
        <div className="tip">✓ Keep document flat and visible</div>
        <div className="tip">✓ Avoid glare and shadows</div>
      </div>

      <style jsx>{`
        .document-capture-prompt {
          text-align: center;
          padding: 3rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          color: white;
          margin: 2rem 0;
        }

        .capture-icon {
          margin: 0 auto 1.5rem;
          width: 64px;
          height: 64px;
          opacity: 0.9;
        }

        .document-capture-prompt h3 {
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .document-capture-prompt p {
          margin: 0 0 2rem;
          opacity: 0.9;
        }

        .btn-primary-large {
          background: white;
          color: #667eea;
          border: none;
          padding: 1rem 3rem;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-primary-large:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .document-capture-container {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          margin: 2rem 0;
        }

        .capture-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .capture-header h3 {
          margin: 0 0 0.5rem;
          color: #2d3748;
          font-size: 1.5rem;
        }

        .capture-instructions {
          color: #718096;
          margin: 0;
          font-size: 0.95rem;
        }

        .capture-frame {
          position: relative;
          background: #1a202c;
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 16/9;
          max-height: 500px;
        }

        .webcam-feed {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .capture-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .frame-guide {
          position: absolute;
          top: 10%;
          left: 10%;
          right: 10%;
          bottom: 10%;
          border: 2px solid rgba(255, 255, 255, 0.5);
          border-radius: 8px;
        }

        .corner {
          position: absolute;
          width: 30px;
          height: 30px;
          border: 3px solid #48bb78;
        }

        .corner-tl {
          top: -2px;
          left: -2px;
          border-right: none;
          border-bottom: none;
          border-top-left-radius: 8px;
        }

        .corner-tr {
          top: -2px;
          right: -2px;
          border-left: none;
          border-bottom: none;
          border-top-right-radius: 8px;
        }

        .corner-bl {
          bottom: -2px;
          left: -2px;
          border-right: none;
          border-top: none;
          border-bottom-left-radius: 8px;
        }

        .corner-br {
          bottom: -2px;
          right: -2px;
          border-left: none;
          border-top: none;
          border-bottom-right-radius: 8px;
        }

        .captured-preview {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .captured-preview img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .camera-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #fc8181;
          padding: 2rem;
          text-align: center;
        }

        .capture-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1.5rem;
        }

        .btn-primary, .btn-secondary, .btn-capture {
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          font-size: 1rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-capture {
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          color: white;
          padding: 1rem 3rem;
        }

        .btn-capture:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
        }

        .btn-secondary {
          background: #e2e8f0;
          color: #4a5568;
        }

        .btn-secondary:hover {
          background: #cbd5e0;
        }

        .btn-primary:disabled, .btn-capture:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .capture-tips {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }

        .tip {
          color: #718096;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default DocumentCapture;
