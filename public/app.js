let ws;
let video = document.getElementById('video');
let streaming = false;
let captureInterval;

document.getElementById('startBtn').onclick = startStreaming;
document.getElementById('stopBtn').onclick = stopStreaming;

async function startStreaming() {
  // Pick correct WebSocket protocol
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    console.log('Connected to WebSocket');
    startCamera();
  };
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }, // back camera
      audio: false
    });
    video.srcObject = stream;
    streaming = true;

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
          });
        }
      }, 'image/jpeg', 0.5); // quality 0.5 for speed
    }, 200); // every 200ms (~5 FPS)
  } catch (err) {
    console.error('Camera error:', err);
  }
}

function stopStreaming() {
  streaming = false;
  clearInterval(captureInterval);
  if (ws) ws.close();
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
}
