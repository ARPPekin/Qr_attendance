const SHEET_ID = '1hxsTLvulC5fXuvM6qIID4ofFRawecDgm7N2WiQhqWBw';
const SHEET_NAME = 'Arkusz1';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby6ObVFR8P9bEvQS7PMfAP8pwv-rBTOgbuvq-6jCcYL7i-IBT6WxQgzptJI0mAEZGLtYA/exec';

let currentStream = null;
let currentId = null;
let isScanning = false;

async function startScanning() {
    try {
        if (isScanning) return;
        isScanning = true;
        
        const video = document.getElementById('qr-video');
        video.style.display = 'block';

        // Reset poprzedniego strumienia
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        // Konfiguracja kamery
        const constraints = {
            video: {
                facingMode: "environment",
                width: { min: 640, ideal: 1280 },
                height: { min: 480, ideal: 720 }
            }
        };

        // Inicjalizacja kamery
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;

        // Oczekiwanie na gotowość wideo
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });

        // Rozpocznij pętlę skanowania
        const scanLoop = () => {
            if (!isScanning) return;
            scanFrame(video);
            requestAnimationFrame(scanLoop);
        };
        
        scanLoop();

    } catch (err) {
        isScanning = false;
        alert('Błąd kamery: ' + err.message);
    }
}

function scanFrame(video) {
    try {
        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
        });

        if (code) {
            handleQRScan(code.data);
            stopScanning();
        }
    } catch (error) {
        console.error('Błąd skanowania:', error);
    }
}

function stopScanning() {
    isScanning = false;
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('start-scan').disabled = false;
}

// Reszta funkcji pozostaje bez zmian (fetchSheetData, handleQRScan, showUserInfo, approveCheckIn)