const SHEET_ID = '1hxsTLvulC5fXuvM6qIID4ofFRawecDgm7N2WiQhqWBw';
const SHEET_NAME = 'Arkusz1';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby6ObVFR8P9bEvQS7PMfAP8pwv-rBTOgbuvq-6jCcYL7i-IBT6WxQgzptJI0mAEZGLtYA/exec'; // Zastąp URL skryptu

let currentStream = null;
let currentId = null;

document.getElementById('start-scan').addEventListener('click', startScanning);

async function startScanning() {
    try {
        const video = document.getElementById('qr-video');
        
        // Najpierw zatrzymaj istniejący strumień
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        // Nowe ustawienia kamery z obsługą błędów dla iOS
        const constraints = {
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            }
        };

        // Alternatywne ustawienia dla Firefox
        if (navigator.userAgent.includes('Firefox')) {
            constraints.video = {
                facingMode: "environment",
                width: { min: 640, ideal: 1280 },
                height: { min: 480, ideal: 720 }
            };
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
            .catch(err => {
                if (err.name === 'NotFoundError') {
                    throw new Error('Nie znaleziono kamery tylnej');
                }
                throw err;
            });

        video.srcObject = stream;
        currentStream = stream;
        
        // Specjalna obsługa dla Safari
        if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
            video.setAttribute('playsinline', true);
            video.setAttribute('muted', true);
            video.setAttribute('autoplay', true);
        }

        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });

        document.getElementById('start-scan').disabled = true;
        scanFrame(video);
    } catch (err) {
        alert('Błąd dostępu do kamery: ' + err.message);
        resetScanner();
    }
}

// Reszta funkcji bez zmian (scanFrame, handleQRScan, showUserInfo, approveCheckIn, resetScanner)