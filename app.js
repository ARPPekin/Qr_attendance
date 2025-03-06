// Konfiguracja Supabase
const supabaseUrl = 'https://twyruqtqvxsnqctwkswg.supabase.co'; // Zamień na swój URL Supabase
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3eXJ1cXRxdnhzbnFjdHdrc3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNzM2NjksImV4cCI6MjA1Njg0OTY2OX0.K5esJlkidj-JlnR3StGQre3YtnCfVwV1ypB8qibeIHo'; // Zamień na swój anon-key
// Inicjalizowanie klienta Supabase
const supabase = createClient(supabaseUrl, supabaseKey);


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
            },
            audio: false  // Dodaj to, aby wykluczyć dostęp do mikrofonu
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


// ✅ Pobieranie danych z Supabase
async function fetchAttendanceData() {
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('*'); // Pobiera wszystkie kolumny

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('❌ Błąd pobierania danych:', error);
        return [];
    }
}

// ✅ Obsługa zeskanowanego kodu QR
async function handleQRScan(qrData) {
    const records = await fetchAttendanceData();
    const record = records.find(row => row.id === qrData);

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
    document.getElementById('user-id').textContent = record.id;
    document.getElementById('user-name').textContent = record.name;
    document.getElementById('user-surname').textContent = record.surname;
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
        const { data, error } = await supabase
            .from('attendance')
            .update({ checkInTime: new Date().toISOString() }) // Zatwierdzamy obecność
            .eq('id', currentId); // Filtrujemy po ID

        if (error) throw error;

        alert('✅ Obecność zatwierdzona!');
        resetScanner();
    } catch (error) {
        console.error('❌ Błąd zapisu obecności:', error);
        alert('❌ Błąd połączenia z serwerem');
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
