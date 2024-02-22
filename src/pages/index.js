import React, { useState, useEffect } from 'react';
import SelfieSegmentationApp from '../components/SelfieSegmentation';
import BodyPix from '../components/BodyPix';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';

const Index = () => {
  const [selectedOption, setSelectedOption] = useState('SelfieSegmentationApp');

  const handleChange = (event) => {
    setSelectedOption(event.target.value);
  };

  useEffect(() => {
    async function initializeTensorFlow() {
      await tf.ready();
      console.log('TensorFlow.js is ready.');
    }
    initializeTensorFlow();
  }, []);
  
  return (
    <div>
      <div>
        <label htmlFor="component-select">Select Component: </label>
        <select id="component-select" value={selectedOption} onChange={handleChange}>
          <option value="SelfieSegmentationApp">SelfieSegmentation</option>
          <option value="BodyPix">BodyPix</option>
        </select>
      </div>
      <div>
        {selectedOption === 'SelfieSegmentationApp' && <SelfieSegmentationApp />}
        {selectedOption === 'BodyPix' && <BodyPix />}
      </div>
    </div>
  );
};

export default Index;
