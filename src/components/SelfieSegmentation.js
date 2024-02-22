import React, { useState, useEffect, useRef } from 'react';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import '@tensorflow/tfjs-core';
import '@mediapipe/selfie_segmentation';

function SelfieSegmentationApp() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [segmenter, setSegmenter] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [runningSegmentation, setRunningSegmentation] = useState(true);

  useEffect(() => {
    async function loadSegmenter() {
      const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;

      const segmenterConfig = {
        modelType: 'general',
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation'
      }
      const segmenter = await bodySegmentation.createSegmenter(model, segmenterConfig);
      setSegmenter(segmenter);
    }

    loadSegmenter();
  }, []);

  useEffect(() => {
    if (!segmenter || !runningSegmentation) return;

    const runSegmentation = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      video.srcObject = stream;

      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const drawVideoWithSegmentation = async () => {
        try {
          const segmentationConfig = { flipHorizontal: false };
          const segmentation = await segmenter.segmentPeople(video, segmentationConfig);

          const foregroundColor = { r: 0, g: 0, b: 0, a: 0 };
          const backgroundColor = { r: 255, g: 255, b: 255, a: 255 };
          const drawContour = false
          const foregroundThreshold = 0.40
          const maskImage = await bodySegmentation.toBinaryMask(segmentation, foregroundColor, backgroundColor, drawContour, foregroundThreshold);
          const maskOpacity = 1;
          const maskBlurAmount = 1;
          const flipHorizontal = true;
          bodySegmentation.drawMask(canvas, video, maskImage, maskOpacity, maskBlurAmount, flipHorizontal);

          if (runningSegmentation) {
            requestAnimationFrame(drawVideoWithSegmentation);
          }
        } catch (error) {
          console.error('Error during segmentation:', error);
        }
      };

      try {
        drawVideoWithSegmentation();
        video.play();
      } catch (error) {
        console.error('Error during video playback:', error);
      }
    };

    runSegmentation();

    return () => {
      setRunningSegmentation(false);
    };
  }, [segmenter, runningSegmentation]);

  const convertCanvasToImage = () => {
    if (canvasRef.current) {
      const image = new Image();
      image.src = canvasRef.current.toDataURL();
      setCapturedImage(image.src);
    }
  };

  const toggleSegmentation = () => {
    setRunningSegmentation(prevState => !prevState);
    const tracks = videoRef.current.srcObject?.getTracks();
    tracks?.forEach(track => track.stop());
  };

  return (
    <div style={{ position: 'relative', marginTop: '20px' }}>
      <video ref={videoRef} playsInline style={{ transform: 'scaleX(-1)' }} />
      <canvas ref={canvasRef} id="canvas" />
      <div style={{ position: 'relative', top: '10px', left: '10px' }}>
        <button onClick={convertCanvasToImage}>Convert Canvas to Image</button>
        <button onClick={toggleSegmentation}>{runningSegmentation ? 'End' : 'Start'}</button>
      </div>
      {capturedImage && (
        <div>
          <h2>Captured Image:</h2>
          <img src={capturedImage} alt="Captured Frame" />
        </div>
      )}
    </div>
  );
}

export default SelfieSegmentationApp;
