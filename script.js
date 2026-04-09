document.addEventListener('DOMContentLoaded', () => {
    cargarPropiedades();
    initScrollLogic();
    initScrollReveal();
    initFAQ();
});

async function cargarPropiedades() {
    const grid = document.getElementById('property-grid');
    if (!grid) return;
    
    try {
        // ✅ FIX #8: Caching de datos en SessionStorage para cargar instantáneamente recargas de la página
        let propiedades;
        const cachedData = sessionStorage.getItem('propiedades_v1');
        
        if (cachedData) {
            propiedades = JSON.parse(cachedData);
        } else {
            const response = await fetch('propiedades.json');
            if (!response.ok) throw new Error('Error en la red al intentar cargar propiedades.json');
            propiedades = await response.json();
            sessionStorage.setItem('propiedades_v1', JSON.stringify(propiedades));
        }
        
        const template = document.getElementById('card-template');
        const fragment = document.createDocumentFragment();

        propiedades.forEach(p => {
            // Clonamos el esquema de HTML que está en el <template>
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.card');
            
            const tagClass = p.estado.toUpperCase().includes("VENDIDA") ? "tag-vendida" : "tag-disponible";
            
            // ✅ FIX #10: Usar dataset.src en lugar de .src para forzar el lazy-loading manual estricto
            const img = clone.querySelector('.card-front img');
            img.dataset.src = `img/casas/casa${p.id}.webp`;
            img.alt = p.nombre;
            
            clone.querySelector('.card-title').textContent = p.nombre;
            clone.querySelector('.card-price').textContent = p.precio;
            
            const tag = clone.querySelector('.tag-common');
            tag.classList.add(tagClass);
            tag.textContent = p.estado;
            
            // Asignar ID al contenedor del GPS para cargar su previsualización al darle click
            const gpsBox = clone.querySelector('.gps-preview-box');
            gpsBox.dataset.gpsId = p.id;
            
            // Guardamos el nombre en el Dataset de la card para usarlo en el Event Delegation
            card.dataset.nombre = p.nombre;

            fragment.appendChild(clone);
        });
        
        grid.appendChild(fragment);
        
        // 🔥 OPTIMIZACIÓN EXTREMA: Lazy Loading Estricto con IntersectionObserver
        // El atributo loading="lazy" de HTML a veces pre-descarga imágenes si cree que tu internet es muy rápido.
        // Con esto obligamos al navegador a que SOLO descargue la imagen cuando esté a 150px de aparecer en pantalla.
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const imagen = entry.target;
                    imagen.src = imagen.dataset.src; // Aquí ocurre la magia de descarga real
                    observer.unobserve(imagen); // Dejamos de observar para ahorrar memoria
                }
            });
        }, { rootMargin: '150px 0px' });

        // Seleccionamos todas las imágenes inyectadas y las ponemos a observar
        grid.querySelectorAll('.card-front img').forEach(img => {
            imageObserver.observe(img);
        });
        
        // 🔥 OPTIMIZACIÓN DE MEMORIA RAM: EVENT DELEGATION
        // En vez de tener "N" cantidad de event listeners (1 por cada tarjeta de casa existente),
        // escuchamos los clicks globalmente en "grid" y filtramos en qué parte dio click el usuario.
        grid.addEventListener('click', manejarClicsTarjetas);
        
    } catch(error) {
        console.error("Error obteniendo propiedades:", error);
        grid.innerHTML = `
            <div style="text-align:center; padding: 3rem; grid-column: 1 / -1; border-radius: 15px; border: 1px solid #d4af37;">
                <h3 style="color:#d4af37; font-size: 1.5rem; margin-bottom: 20px;">⚠️ CATÁLOGO NO DISPONIBLE</h3>
                <p style="color:red; font-size:1rem; margin-bottom: 15px;">No fue posible obtener la lista de propiedades actual.</p>
                <p style="font-size:0.9rem; color:#aaa; max-width: 600px; margin: auto;">Hubo un problema de conexión. Por favor, verifica tu internet o recarga la página más tarde.</p>
            </div>`;
    }
}

// Embudos de Eventos (Event Delegation)
function manejarClicsTarjetas(e) {
    const card = e.target.closest('.card');
    if (!card) return; // Si se dio click al grid vacío, no hacer nada
    
    // 1. Click en la vista previa del GPS (abre imagen GPS grande)
    const gpsBox = e.target.closest('.gps-preview-box');
    if (gpsBox) {
        const gpsId = gpsBox.dataset.gpsId;
        openFullMap(`img/gps/gps${gpsId}.webp`);
        return;
    }
    
    // 2. Click en botón de comprar (abre el modal de comprar)
    const buyBtn = e.target.closest('[data-action="buy"]');
    if (buyBtn) {
        buyHouse();
        return;
    }
    
    // 3. Click normal a la tarjeta para voltearla y cargar el mini mapa
    if (!card.classList.contains('is-flipped')) {
        const gpsContainer = card.querySelector('.gps-preview-box');
        
        // Lazy-load dinámico: Inyectar la foto del mapita GPS solo al voltear la primera vez
        if (!gpsContainer.querySelector('img')) {
            const gpsId = gpsContainer.dataset.gpsId;
            const pNombre = card.dataset.nombre;
            gpsContainer.innerHTML = `<img src="img/gps/gps${gpsId}.webp" loading="eager" decoding="async" alt="GPS de ${pNombre}">`;
        }
    }
    // Efecto CSS Flip
    card.classList.toggle('is-flipped');
}

function initScrollLogic() {
    const navbar = document.getElementById('navbar');
    let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    let ticking = false;

    // 🔥 OPTIMIZACIÓN DE GPU: requestAnimationFrame para el Scroll
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                // ✅ FIX: currentScroll se lee DENTRO del rAF para que el valor
                // sea el real en el momento exacto que el navegador pinta el frame,
                // no el del momento en que ocurrió el evento scroll (pueden diferir ms)
                const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                if (currentScroll > lastScrollTop && currentScroll > 150) {
                    navbar.classList.add('header-hidden');
                } else {
                    navbar.classList.remove('header-hidden');
                }
                lastScrollTop = Math.max(0, currentScroll); // Evitar valores negativos
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.willChange = 'transform, opacity';
                entry.target.classList.add('active');
                
                entry.target.addEventListener('transitionend', () => {
                    entry.target.style.willChange = 'auto'; // Limpiar variable costosa de CSS
                }, { once: true });
                
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function buyHouse() { document.getElementById("notificationModal").style.display = "flex"; }
function closeNotification() { document.getElementById("notificationModal").style.display = "none"; }

function openFullMap(src) {
    const modal = document.getElementById("imageModal");
    const img = document.getElementById("img01");
    if (modal && img) { img.src = src; modal.style.display = "flex"; }
}

// Cierre de modal seguro con EventListener
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) e.target.style.display = "none";
});

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-question');
    faqItems.forEach(item => {
        item.addEventListener('click', () => {
            const parent = item.parentElement;
            const answer = item.nextElementSibling;
            const icon = item.querySelector('.faq-icon');
            
            // Cerrar otras preguntas activas (experiencia premium tipo acordeón)
            document.querySelectorAll('.faq-item').forEach(otherItem => {
                if (otherItem !== parent && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.faq-answer').style.maxHeight = null;
                    otherItem.querySelector('.faq-icon').style.transform = "rotate(0deg)";
                }
            });

            // Alternar la actual
            parent.classList.toggle('active');
            
            if (parent.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + "px";
                icon.style.transform = "rotate(45deg)";
            } else {
                answer.style.maxHeight = null;
                icon.style.transform = "rotate(0deg)";
            }
        });
    });
}
