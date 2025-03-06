const SHEET_ID = '1hxsTLvulC5fXuvM6qIID4ofFRawecDgm7N2WiQhqWBw';
const SHEET_NAME = 'Arkusz1';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby6ObVFR8P9bEvQS7PMfAP8pwv-rBTOgbuvq-6jCcYL7i-IBT6WxQgzptJI0mAEZGLtYA/exec';

let currentStream = null;
let currentId = null;

// Najpierw deklarujemy wszystkie funkcje
function scanFrame(video) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
        });

        if (code) {
            handleQRScan(code.data);
            video.srcObject.getTracks().forEach(track => track.stop());
        } else {
            requestAnimationFrame(() => scanFrame(video));
        }
    } catch (error) {
        console.error('Błąd analizy klatki:', error);
        resetScanner();
    }
}

async function startScanning() {
    try {
        const video = document.getElementById('qr-video');
        
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
            .catch(err => {
                if (err.name === 'NotFoundError') {
                    throw new Error('Nie znaleziono kamery tylnej');
                }
                throw err;
            });

        video.srcObject = stream;
        currentStream = stream;

        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play().then(resolve).catch(err => {
                    console.error('Błąd uruchamiania wideo:', err);
                    resetScanner();
                });
            };
        });

        document.getElementById('start-scan').disabled = true;
        scanFrame(video);
    } catch (err) {
        alert('Błąd dostępu do kamery: ' + err.message);
        resetScanner();
    }
}

// Reszta funkcji pozostaje bez zmian
async function fetchSheetData() { /* ... */ }
async function handleQRScan(qrData) { /* ... */ }
function showUserInfo(record) { /* ... */ }
async function approveCheckIn() { /* ... */ }
function resetScanner() { /* ... */ }

// Inicjalizacja na końcu pliku
document.getElementById('start-scan').addEventListener('click', startScanning);
document.getElementById('approve-btn').addEventListener('click', approveCheckIn);

// Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js');
    });
}