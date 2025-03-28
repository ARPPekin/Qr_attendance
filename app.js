document.addEventListener("DOMContentLoaded", function () {
    if (!window.supabase) {
        console.error("Supabase nie jest dostępne. Sprawdź, czy CDN się załadował.");
        return;
    }

    // Konfiguracja Supabase
    const supabaseUrl = 'https://twyruqtqvxsnqctwkswg.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3eXJ1cXRxdnhzbnFjdHdrc3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNzM2NjksImV4cCI6MjA1Njg0OTY2OX0.K5esJlkidj-JlnR3StGQre3YtnCfVwV1ypB8qibeIHo';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized:", supabase);

    // Pobranie elementów z DOM
    const startScanButton = document.getElementById("start-scan");
    const video = document.getElementById("qr-video");
    const canvasElement = document.createElement("canvas"); // Tworzymy dynamicznie ukryty canvas
    const canvas = canvasElement.getContext("2d");
    const userInfo = document.getElementById("user-info");
    const userIdSpan = document.getElementById("user-id");
    const userNameSpan = document.getElementById("user-name");
    const userSurnameSpan = document.getElementById("user-surname");
    const checkinStatus = document.createElement("span");
    const approveButton = document.getElementById("approve-btn");

    userInfo.appendChild(checkinStatus); // Dodanie statusu check-in do interfejsu
    userInfo.style.display = 'none';
    approveButton.classList.add("hidden");

    let scanning = false;

    if (!startScanButton) {
        console.error("Przycisk start-scan nie został znaleziony w DOM. Sprawdź HTML.");
        return;
    }

    // Funkcja uruchamiająca kamerę
    async function startCamera() {
        try {
            const constraints = {
                video: {
                    zoom: 2,
                    facingMode: "environment", // Tylna kamera
                    width: { ideal: 1280 }, // Zwiększamy szerokość obrazu
                    height: { ideal: 720 }, // Zwiększamy wysokość obrazu
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            video.setAttribute("playsinline", true);
            video.setAttribute("muted", ""); // iOS wymaga mutowania wideo
            video.setAttribute("autoplay", "");
            video.style.height = "200px";
            video.style.objectFit = "cover"; // Wymuszenie startu wideo
            video.removeAttribute("controls"); // Usunięcie kontrolek

            // Czekamy, aż wideo się załaduje
            video.onloadedmetadata = () => {
                video.play();
                scanning = true;
                requestAnimationFrame(scanQRCode);
            };
        } catch (err) {
            handleCameraError(err);
        }
    }

    function scanQRCode() {
        if (!scanning || video.readyState !== video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(scanQRCode);
            return;
        }

        canvasElement.width = 300;  
        canvasElement.height = 300;
        canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

        const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

        if (code) {
            scanning = false;
            video.pause();
            console.log("Zeskanowano kod:", code.data);
            fetchUserData(code.data);
        } else {
            requestAnimationFrame(scanQRCode);
        }
    }

    async function fetchUserData(id) {
        const { data, error } = await supabase.from('attendance').select('name, surname, checkintime').eq('id', id).single();

        if (error || !data) {
            showErrorMessage("Nie znaleziono użytkownika!");
            return;
        }

        // Wyświetlenie danych użytkownika
        userIdSpan.textContent = id;
        userNameSpan.textContent = data.name;
        userSurnameSpan.textContent = data.surname;
        userInfo.style.display = 'block';
        approveButton.classList.remove("hidden");

        // Sprawdzenie statusu check-in
        if (data.checkintime) {
            checkinStatus.innerHTML = ` | <span style="color: orange; font-weight: bold; font-size: 3em;">⚠️</span>`;
        } else {
            checkinStatus.innerHTML = " | ---";
        }

        // Obsługa zatwierdzenia obecności
        approveButton.onclick = () => {
            confirmCheckIn(id);
            userInfo.style.display = 'none'; // Ukrycie po zatwierdzeniu
            userInfo.classList.add("hidden"); // Ukrycie po zatwierdzeniu
            startCamera(); // Ponowne uruchomienie skanowania
        };
    }

    async function confirmCheckIn(id) {
        // Pobranie aktualnego czasu w chińskiej strefie czasowej (UTC+8)
        const now = new Date();
        const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)).toISOString();
    
        const { error } = await supabase.from('attendance').update({ checkintime: chinaTime }).eq('id', id);
    
        if (!error) {
            showSuccessMessage("Zapisano!");
        }
    }

    function showErrorMessage(message) {
        const errorBox = document.createElement("div");
        errorBox.id = "error-box";
        errorBox.innerHTML = "<div style='display: flex; align-items: center; gap: 10px; background: #d32f2f; color: white; padding: 15px; border-radius: 5px; font-size: 20px;'><img src='libs/error.gif' alt='Błąd' style='width: 40px; height: 40px;'><span>" + message + "</span></div>";
        document.body.appendChild(errorBox);
        setTimeout(() => { errorBox.remove(); scanning = true; requestAnimationFrame(scanQRCode); }, 1500);
    }

    function showSuccessMessage(message) {
        const confirmationBox = document.createElement("div");
        confirmationBox.id = "confirmation-box";
        confirmationBox.innerHTML = "<div style='display: flex; align-items: center; gap: 10px;'><img src='libs/okay.gif' alt='Zapisano!' style='width: 40px; height: 40px;'><span>" + message + "</span></div>";
        document.body.appendChild(confirmationBox);
        setTimeout(() => { confirmationBox.remove(); }, 1500);
    }

    startScanButton.addEventListener("click", startCamera);
    startCamera();
});
