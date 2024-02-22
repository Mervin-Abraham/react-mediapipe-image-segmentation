import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as bodyPix from '@tensorflow-models/body-pix';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-wasm';
import { BounceLoader } from "react-spinners";

const BodyPix = () => {
  const webcamRef = useRef(null);
  const bodyPixCanvasRef = useRef(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [captureInProgress, setCaptureInProgress] = useState(false);
  const [disableButtons, setDisableButtons] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const width = document.getElementById('image-container').offsetWidth;
      setContainerWidth(width);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const capture = async () => {
    if (!captureInProgress) {
      setCaptureInProgress(true);
      setDisableButtons(true);
      try {
        if (webcamRef.current) {
          await loadTensorFlowAndBodyPix();

          const imageSrc = webcamRef.current.getScreenshot();
          const segmentation = await removeBackground(imageSrc);
          const processedImageSrc = await visualizeSegmentation(segmentation, imageSrc);
          setProcessedImage(processedImageSrc);
        }
      } catch (error) {
        console.error('Error capturing image:', error);
      } finally {
        setCaptureInProgress(false);
        setDisableButtons(false);
      }
    }
  };


  // useEffect(() => {
  //   let animationFrameId;

  //   const processFrame = async () => {
  //     if (webcamRef.current) {
  //       const imageSrc = webcamRef.current.getScreenshot();
  //       if (imageSrc) {
  //         const segmentation = await removeBackground(imageSrc);
  //         const processedImageSrc = await visualizeSegmentation(segmentation, imageSrc);
  //         setProcessedImage(processedImageSrc);
  //       }
  //     }
  //     animationFrameId = requestAnimationFrame(processFrame);
  //   };

  //   const startProcessing = () => {
  //     if (!animationFrameId) {
  //       animationFrameId = requestAnimationFrame(processFrame);
  //     }
  //   };

  //   const stopProcessing = () => {
  //     if (animationFrameId) {
  //       cancelAnimationFrame(animationFrameId);
  //       animationFrameId = undefined;
  //     }
  //   };

  //   if (cameraOn) {
  //     startProcessing();
  //   } else {
  //     stopProcessing();
  //   }

  //   return () => {
  //     stopProcessing();
  //   };
  // }, [cameraOn]);

  // const removeBackground = async (imageSrc) => {
  //   const net = await bodyPix.load({
  //     architecture: 'MobileNetV1',
  //     outputStride: 16,
  //     multiplier: 0.75,
  //     quantBytes: 2,
  //   });

  //   const image = new Image();
  //   image.src = imageSrc;
  //   await new Promise((resolve) => {
  //     image.onload = resolve;
  //   });

  //   const segmentation = await net.segmentPerson(image, {
  //     flipHorizontal: false,
  //     internalResolution: 'high',
  //     segmentationThreshold: 0.6,
  //     maxDetections: 1,
  //     scoreThreshold: 0.3,
  //     nmsRadius: 20,
  //   });

  //   net.dispose();

  //   return segmentation;
  // };


  const loadTensorFlowAndBodyPix = async () => {
    try {
      const isWebGLAvailable = tf.ENV.get('WEBGL_VERSION') !== 0;

      if (isWebGLAvailable) {
        await tf.setBackend('webgl');
      } else {
        await tf.setBackend('wasm');
      }

      await tf.ready();
      console.log('TensorFlow.js is ready.');
    } catch (error) {
      console.error('Error during TensorFlow.js initialization:', error);
    }
  };

  const removeBackground = async (imageSrc) => {
    const net = await bodyPix.load({
      architecture: 'ResNet50',
      outputStride: 16,
      multiplier: 1,
      quantBytes: 4,
    });

    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    const segmentation = await net.segmentPerson(image, {
      flipHorizontal: false,
      internalResolution: 'medium',
      segmentationThreshold: 0.32,
      maxDetections: 1,
      scoreThreshold: 0.3,
    });

    net.dispose();

    return segmentation;
  };

  const visualizeSegmentation = async (segmentation, imageSrc) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    const canvas = bodyPixCanvasRef.current;
    if (!canvas) {
      console.error("Canvas element not found.");
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("Canvas context not obtained.");
      return;
    }
    const width = containerWidth / 3;
    const height = (width / image.width) * image.height;
    canvas.width = width;
    canvas.height = height;

    const maskData = new Uint8ClampedArray(segmentation.width * segmentation.height * 4);
    for (let i = 0; i < segmentation.data.length; i++) {
      if (segmentation.data[i]) {
        maskData[i * 4 + 3] = 0;
      } else {
        maskData[i * 4] = 255;
        maskData[i * 4 + 1] = 255;
        maskData[i * 4 + 2] = 255;
        maskData[i * 4 + 3] = 255;
      }
    }
    const mask = new ImageData(maskData, segmentation.width, segmentation.height);
    console.log("segment")
    ctx.putImageData(mask, 0, 0);

    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(image, 0, 0, width, height);

    const finalImage = new Image();
    finalImage.src = canvas.toDataURL('image/png');

    return {
      originalImage: image,
      processedImage: finalImage,
    };
  };

  const toggleFlip = () => {
    setFlipped(!flipped);
  };

  const toggleCamera = () => {
    setCameraOn(!cameraOn);
  };

  const clearImages = () => {
    setProcessedImage(null);
  };

  return (
    <div id="image-container" style={{ border: '1px solid #D3D3D3', borderRadius: '10px', padding: '10px', maxWidth: '100vw', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {cameraOn && <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          mirrored={flipped}
          style={{ maxWidth: containerWidth / 3, maxHeight: 'calc(100vh - 20px)', height: 'auto' }}
        />}

        {/* Render original image */}
        {processedImage && (
          <img
            style={{ marginLeft: '20px', maxWidth: containerWidth / 3, maxHeight: 'calc(100vh - 20px)', height: 'auto' }}
            src={flipped ? flipImage(processedImage.originalImage) : processedImage.originalImage.src}
            alt="Original"
          />
        )}

        <canvas
          ref={bodyPixCanvasRef}
          style={{ display: "none"}}
        />

        {/* Render processed image with mask applied */}
        {processedImage && (
          <img
            style={{ marginLeft: '20px', maxWidth: containerWidth / 3, maxHeight: 'calc(100vh - 20px)', height: 'auto' }}
            src={flipped ? flipImage(processedImage.processedImage) : processedImage.processedImage.src}
            alt="Processed"
          />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
        <button style={{ width: '22%', height: '10vh', justifyContent: "center", alignContent: 'center', margin: '0.5vh', position: 'relative' }} disabled={disableButtons} onClick={capture}>
          {captureInProgress ?
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BounceLoader color="#36d7b7" />
              <p style={{ marginLeft: '5px' }}>Loading...</p>
            </div>
            : 'Capture'}
        </button>

        <button style={{ width: '22%', height: '10vh', justifyContent: "center", alignContent: 'center', margin: '0.5vh' }} disabled={disableButtons} onClick={toggleFlip}>Toggle Flip</button>
        <button style={{ width: '22%', height: '10vh', justifyContent: "center", alignContent: 'center', margin: '0.5vh' }} disabled={disableButtons} onClick={toggleCamera}>{cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}</button>
        <button style={{ width: '22%', height: '10vh', justifyContent: "center", alignContent: 'center', margin: '0.5vh' }} disabled={disableButtons} onClick={clearImages}>Clear</button>
      </div>
    </div>
  );
};

const flipImage = (image) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
};

export default BodyPix;