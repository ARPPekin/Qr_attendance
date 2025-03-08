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
    const approveButton = document.getElementById("approve-btn");

    let scanning = false;

    // Funkcja uruchamiająca kamerę
    async function startCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: "environment", // Tylna kamera
                    width: { ideal: 1280 }, // Zwiększamy szerokość obrazu
                    height: { ideal: 720 }, // Zwiększamy wysokość obrazu
                    zoom: 2 // Wstępny zoom (większe wartości mogą być obsługiwane przez niektóre kamery)
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            video.setAttribute("playsinline", true);

            // Czekamy, aż wideo się załaduje
            video.onloadedmetadata = () => {
                video.play();
                scanning = true;
                requestAnimationFrame(scanQRCode); // Rozpoczynamy skanowanie dopiero po załadowaniu
                setCameraZoom(stream); // Ustawienie zoomu jeśli możliwe
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
        const { data, error } = await supabase.from('attendance').select('name, surname').eq('id', id).single();

        if (error || !data) {
            alert("Nie znaleziono użytkownika w bazie.");
            video.play();
            scanning = true;
            requestAnimationFrame(scanQRCode);
            return;
        }

        // Wyświetlenie danych użytkownika
        userIdSpan.textContent = id;
        userNameSpan.textContent = data.name;
        userSurnameSpan.textContent = data.surname;
        userInfo.classList.remove("hidden");
        approveButton.classList.remove("hidden");

        // Obsługa zatwierdzenia obecności
        approveButton.onclick = () => confirmCheckIn(id);
    }

    async function setCameraZoom(stream) {
        const [track] = stream.getVideoTracks();
        const capabilities = track.getCapabilities();

        if (capabilities.zoom) {
            try {
                await track.applyConstraints({ advanced: [{ zoom: 2 }] }); // 🔍 Ustawienie zoomu na 2x
                console.log("Zoom ustawiony na 2x");
            } catch (error) {
                console.error("Nie udało się ustawić zoomu:", error);
            }
        } else {
            console.log("Zoom nie jest obsługiwany przez kamerę.");
        }
    }

    // Obsługa błędów kamery
    function handleCameraError(err) {
        if (err.name === "NotAllowedError") {
            alert("Brak uprawnień do kamery. Zezwól na dostęp w ustawieniach przeglądarki.");
        } else if (err.name === "NotFoundError") {
            alert("Nie znaleziono kamery na urządzeniu.");
        } else if (err.name === "NotReadableError") {
            alert("Kamera jest używana przez inną aplikację. Zamknij inne aplikacje korzystające z kamery.");
        } else {
            alert("Błąd kamery: " + err.message);
        }
        console.error("Błąd podczas uruchamiania kamery:", err);
    }

    // Event listener do uruchamiania skanowania po kliknięciu przycisku
    startScanButton.addEventListener("click", startCamera);
});
