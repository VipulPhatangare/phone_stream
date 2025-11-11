let ws;
let video = document.getElementById('video');
let streaming = false;
let captureInterval;
let frameCount = 0;
let fpsCounter = 0;
let lastFpsUpdate = Date.now();

// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
const statusText = status.querySelector('.status-text');
const videoOverlay = document.getElementById('videoOverlay');
const fpsValue = document.getElementById('fpsValue');
const frameCountEl = document.getElementById('frameCount');
const socketIdEl = document.getElementById('socketId');

startBtn.onclick = startStreaming;
stopBtn.onclick = stopStreaming;

function updateStatus(text, className) {
  statusText.textContent = text;
  status.className = 'status ' + className;
}

function updateFPS() {
  const now = Date.now();
  const elapsed = (now - lastFpsUpdate) / 1000;
  if (elapsed >= 1) {
    const fps = Math.round(fpsCounter / elapsed);
    fpsValue.textContent = fps;
    fpsCounter = 0;
    lastFpsUpdate = now;
  }
}

async function startStreaming() {
  startBtn.disabled = true;
  updateStatus('Connecting...', 'connecting');
  
  // Pick correct WebSocket protocol
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    console.log('Connected to WebSocket');
    console.log('WebSocket URL:', ws.url);
    console.log('WebSocket extensions:', ws.extensions);
    
    // Display socket information
    const socketInfo = `${ws.url} (${ws.readyState})`;
    socketIdEl.textContent = socketInfo;
    console.log('Socket ID:', socketInfo);
    
    updateStatus('Connected', 'connected');
    startCamera();
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateStatus('Connection Error', 'error');
    startBtn.disabled = false;
  };

  ws.onclose = () => {
    updateStatus('Disconnected', '');
    stopStreaming();
  };
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: 'environment', // back camera
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    
    video.srcObject = stream;
    streaming = true;
    frameCount = 0;
    fpsCounter = 0;
    lastFpsUpdate = Date.now();

    // Hide overlay and enable controls
    videoOverlay.classList.add('hidden');
    stopBtn.disabled = false;
    updateStatus('Streaming', 'streaming');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    captureInterval = setInterval(() => {
      if (!streaming || ws.readyState !== WebSocket.OPEN) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          blob.arrayBuffer().then((buffer) => {
            ws.send(buffer); // send binary JPEG
            frameCount++;
            fpsCounter++;
            frameCountEl.textContent = frameCount;
            updateFPS();
          });
        }
      }, 'image/jpeg', 0.5); // quality 0.5 for speed
    }, 200); // every 200ms (~5 FPS)
  } catch (err) {
    console.error('Camera error:', err);
    alert('Unable to access camera. Please grant camera permissions.');
    updateStatus('Camera Error', 'error');
    startBtn.disabled = false;
  }
}

function stopStreaming() {
  streaming = false;
  clearInterval(captureInterval);
  
  if (ws) {
    ws.close();
    ws = null;
  }
  
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }

  // Reset UI
  videoOverlay.classList.remove('hidden');
  startBtn.disabled = false;
  stopBtn.disabled = true;
  updateStatus('Ready', '');
  fpsValue.textContent = '0';
  socketIdEl.textContent = 'Not connected';
}
