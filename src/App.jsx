import React, { useState, useRef } from 'react';
import { useSpeechSynthesis } from 'react-speech-kit';
import Compressor from 'compressorjs';
import { ErrorBoundary } from 'react-error-boundary';
import './App.css';

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkanVwZ3JhZGU4OEBnbWFpbC5jb20iLCJpYXQiOjE3MzY0Njc5MDl9.nWjLGL20i6K7jKH-1ZmysKxesivycLqo3UVXRx1w1PY";
const API_URL = "https://api.hyperbolic.xyz/v1/chat/completions";

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert" className="error-container">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [highContrast, setHighContrast] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { speak, cancel } = useSpeechSynthesis();
  const fileInputRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    processImage(file);
  };

  const processImage = (file) => {
    new Compressor(file, {
      quality: 0.6,
      maxWidth: 1024,
      maxHeight: 1024,
      success(result) {
        setImage(result);
        sendToAPI(result);
      },
      error(err) {
        // Removed the error message
      },
    });
  };

  const handlePlayPause = (text) => {
    if (isSpeaking) {
      cancel();
      setIsSpeaking(false);
    } else {
      speak({ text });
      setIsSpeaking(true);
    }
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      alert('Text copied to clipboard!');
    } catch (err) {
      setError('Failed to copy text');
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const sendToAPI = async (imageFile) => {
    setLoading(true);
    setError(null);
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Image = reader.result.split(',')[1];
        
        const payload = {
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Describe this image in detail" },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                },
              ],
            }
          ],
          model: "Qwen/Qwen2-VL-72B-Instruct",
          max_tokens: 2048,
          temperature: 0.7,
          top_p: 0.9,
        };

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error('API request failed');
        
        const data = await response.json();
        const description = data.choices[0].message.content;
        setDescription(description);
        addMessage(description);
        speak({ text: description });
        setIsSpeaking(true);
      };
      
      reader.readAsDataURL(imageFile);
    } catch (err) {
      setError('Failed to analyze image');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addMessage = (text) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        text,
        timestamp: new Date().toLocaleTimeString(),
      }
    ]);
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className={`app-container ${highContrast ? 'high-contrast' : ''}`}>
        <h1>Accessible AI Vision</h1>
        
        <div className="input-container">
          <button
            onClick={() => fileInputRef.current.click()}
            aria-label="Upload image"
          >
            Upload Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg, image/png"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
        </div>

        <div className="chat-container" role="log" aria-live="polite">
          {messages.map(msg => (
            <div key={msg.id} className="message">
              <span className="timestamp">{msg.timestamp}</span>
              <p>{msg.text}</p>
              <div className="message-controls">
                <button
                  onClick={() => handlePlayPause(msg.text)}
                  aria-label={`${isSpeaking ? 'Pause' : 'Play'} description from ${msg.timestamp}`}
                >
                  {isSpeaking ? '⏸️' : '▶️'}
                </button>
                <button
                  onClick={() => copyToClipboard(msg.text)}
                  aria-label="Copy text to clipboard"
                >
                  📋
                </button>
              </div>
            </div>
          ))}
        </div>

        {loading && <p>Analyzing image...</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </ErrorBoundary>
  );
}

export default App;
