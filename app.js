const SHEET_ID = '1hxsTLvulC5fXuvM6qIID4ofFRawecDgm7N2WiQhqWBw';
const SHEET_NAME = 'Arkusz1';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby6ObVFR8P9bEvQS7PMfAP8pwv-rBTOgbuvq-6jCcYL7i-IBT6WxQgzptJI0mAEZGLtYA/exec'; // Zastąp URL skryptu

let currentStream = null;
let currentId = null;

document.getElementById('start-scan').addEventListener('click', startScanning);

// Funkcja pobierająca dane przez publiczny JSON
async function fetchSheetData() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
  
  const response = await fetch(url);
  const text = await response.text();
  const json = JSON.parse(text.replace(/.*google.visualization.Query.setResponse\({(.*)}\);/, '{$1}'));
  
  return json.table.rows.map(row => ({
    id: row.c[0]?.v || '',
    name: row.c[1]?.v || '',
    surname: row.c[2]?.v || '',
    checkInTime: row.c[3]?.v || null
  }));
}

async function startScanning() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment" } 
    });
    
    const video = document.getElementById('qr-video');
    video.srcObject = stream;
    video.play();
    currentStream = stream;

    document.getElementById('start-scan').disabled = true;
    scanFrame(video);
  } catch (err) {
    alert('Błąd dostępu do kamery: ' + err.message);
  }
}

function scanFrame(video) {
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
    video.srcObject.getTracks().forEach(track => track.stop());
  } else {
    requestAnimationFrame(() => scanFrame(video));
  }
}

async function handleQRScan(qrData) {
  try {
    const participants = await fetchSheetData();
    const record = participants.find(p => p.id === qrData);

    if (record) {
      currentId = qrData;
      showUserInfo(record);
    } else {
      alert('Nie znaleziono rekordu!');
      resetScanner();
    }
  } catch (error) {
    alert('Błąd połączenia z bazą danych');
    resetScanner();
  }
}

// Reszta kodu bez zmian (showUserInfo, approveCheckIn, resetScanner)
// ...