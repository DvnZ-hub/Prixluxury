// Girar tarjeta
function toggleCard(cardElement) {
    cardElement.classList.toggle('is-flipped');
}

// Mapa ampliado
function openFullMap(src) {
    const modal = document.getElementById("gps-modal");
    const modalImg = document.getElementById("full-map-img");
    modal.style.display = "flex";
    modalImg.src = src;
}

function closeFullMap() {
    document.getElementById("gps-modal").style.display = "none";
}

// Función: Notificación de Adquisición
function buyHouse() {
    const modal = document.getElementById("notification-modal");
    modal.style.display = "flex";
}

function closeNotification() {
    document.getElementById("notification-modal").style.display = "none";
}

// Cerrar todo con tecla Escape
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        closeFullMap();
        closeNotification();
    }
});