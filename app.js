import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://twyruqtqvxsnqctwkswg.supabase.co'; // Zmień na swój URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3eXJ1cXRxdnhzbnFjdHdrc3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNzM2NjksImV4cCI6MjA1Njg0OTY2OX0.K5esJlkidj-JlnR3StGQre3YtnCfVwV1ypB8qibeIHo'; // Zmień na swój klucz
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", function () {
    const video = document.createElement("video");
    const canvasElement = document.getElementById("qr-canvas");
    const canvas = canvasElement.getContext("2d");
    const resultContainer = document.getElementById("result");
    const confirmButton = document.getElementById("confirm");
    
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            video.srcObject = stream;
            video.setAttribute("playsinline", true);
            video.play();
            requestAnimationFrame(scanQRCode);
        } catch (err) {
            console.error("Błąd podczas uruchamiania kamery:", err);
        }
    }
    
    async function scanQRCode() {
        canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
        const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        
        if (code) {
            video.pause();
            fetchUserData(code.data);
        } else {
            requestAnimationFrame(scanQRCode);
        }
    }
    
    async function fetchUserData(id) {
        const { data, error } = await supabase.from('users').select('name, surname').eq('id', id).single();
        
        if (error || !data) {
            resultContainer.innerText = "Nie znaleziono użytkownika";
            video.play();
            requestAnimationFrame(scanQRCode);
            return;
        }
        
        resultContainer.innerHTML = `<p>${data.name} ${data.surname}</p>`;
        confirmButton.style.display = "block";
        confirmButton.onclick = () => confirmCheckIn(id);
    }
    
    async function confirmCheckIn(id) {
        const { error } = await supabase.from('users').update({ checkintime: new Date().toISOString() }).eq('id', id);
        
        if (error) {
            alert("Błąd podczas zapisu");
        } else {
            alert("Potwierdzono obecność!");
        }
        location.reload();
    }
    
    startCamera();
});
