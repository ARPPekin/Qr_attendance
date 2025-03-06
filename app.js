const SHEET_ID = '1hxsTLvulC5fXuvM6qIID4ofFRawecDgm7N2WiQhqWBw';
const SHEET_NAME = 'Arkusz1';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby6ObVFR8P9bEvQS7PMfAP8pwv-rBTOgbuvq-6jCcYL7i-IBT6WxQgzptJI0mAEZGLtYA/exec';

let currentStream = null;
let currentId = null;

// ✅ Funkcja skanowania QR
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
            console.log("✅ Kod QR wykryty:", code.data);
            handleQRScan(code.data);
        } else {
            requestAnimationFrame(() => scanFrame(video));
        }
    } catch (error) {
        console.error('❌ Błąd analizy klatki:', error);
    }
}

// ✅ Uruchamianie skanera
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

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        currentStream = stream;

        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play().then(resolve).catch(err => {
                    console.error('❌ Błąd uruchamiania wideo:', err);
                    resetScanner();
                });
            };
        });

        document.getElementById('start-scan').disabled = true;
        scanFrame(video);
    } catch (err) {
        alert('❌ Błąd dostępu do kamery: ' + err.message);
        resetScanner();
    }
}

// ✅ Pobieranie danych z Google Sheets
async function fetchSheetData() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=get`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Błąd pobierania danych:', error);
        return [];
    }
}

// ✅ Obsługa zeskanowanego kodu QR
async function handleQRScan(qrData) {
    const records = await fetchSheetData();
    const record = records.find(row => row.ID === qrData);

    if (record) {
        currentId = qrData;
        showUserInfo(record);
    } else {
        alert('❌ Brak użytkownika w bazie!');
        resetScanner();
    }
}

// ✅ Wyświetlanie informacji o użytkowniku
function showUserInfo(record) {
    document.getElementById('user-id').textContent = record.ID;
    document.getElementById('user-name').textContent = record.Imię;
    document.getElementById('user-surname').textContent = record.Nazwisko;
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('approve-btn').classList.remove('hidden');
}

// ✅ Zatwierdzenie obecności
async function approveCheckIn() {
    if (!currentId) {
        alert('❌ Nie znaleziono użytkownika.');
        return;
    }

    try {
        const timestamp = new Date().toISOString();
        const response = await fetch(`${SCRIPT_URL}?action=update&id=${currentId}&timestamp=${timestamp}`);

        const result = await response.json();
        if (result.status === 'success') {
            alert('✅ Obecność zatwierdzona!');
            resetScanner();
        } else {
            alert('❌ Błąd zatwierdzania obecności.');
        }
    } catch (error) {
        console.error('❌ Błąd zapisu obecności:', error);
    }
}

// ✅ Resetowanie skanera
function resetScanner() {
    document.getElementById('start-scan').disabled = false;
    document.getElementById('user-info').classList.add('hidden');
    document.getElementById('approve-btn').classList.add('hidden');
    currentId = null;
}

// ✅ Obsługa przycisków
document.getElementById('start-scan').addEventListener('click', startScanning);
document.getElementById('approve-btn').addEventListener('click', approveCheckIn);

// ✅ Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js');
    });
}
