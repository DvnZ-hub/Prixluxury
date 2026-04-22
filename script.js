// PRELOADER
(function() {
    document.body.classList.add('is-loading');
    window.addEventListener('load', () => {
        const pre = document.getElementById('preloader');
        if (!pre) return;
        const elapsed = performance.now();
        const delay = Math.max(0, 2800 - elapsed);
        setTimeout(() => {
            pre.classList.add('pre-exit');
            document.body.classList.remove('is-loading');
            pre.addEventListener('transitionend', () => pre.remove(), { once: true });
        }, delay);
    });
})();

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
        let propiedades;
        let cachedData = null;

        try {
            cachedData = sessionStorage.getItem('propiedades_v1');
        } catch (e) { /* Modo incógnito o storage bloqueado */ }

        if (cachedData) {
            propiedades = JSON.parse(cachedData);
        } else {
            const response = await fetch('propiedades.json');
            if (!response.ok) throw new Error('No se pudo cargar propiedades.json');
            propiedades = await response.json();
            try {
                sessionStorage.setItem('propiedades_v1', JSON.stringify(propiedades));
            } catch (e) { /* Ignorar si el dispositivo bloquea el guardado */ }
        }

        const template = document.getElementById('card-template');
        const fragment = document.createDocumentFragment();

        propiedades.forEach(p => {
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.card');
            const tagClass = p.estado.toUpperCase().includes('VENDIDA') ? 'tag-vendida' : 'tag-disponible';

            const img = clone.querySelector('.card-front img');
            img.dataset.src = `img/casas/casa${p.id}.webp`;
            img.alt = p.nombre;

            clone.querySelector('.card-title').textContent = p.nombre;

            const tag = clone.querySelector('.tag-common');
            tag.classList.add(tagClass);
            tag.textContent = p.estado;

            clone.querySelector('.gps-preview-box').dataset.gpsId = p.id;
            card.dataset.nombre = p.nombre;

            fragment.appendChild(clone);
        });

        grid.appendChild(fragment);

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '150px 0px' });

        grid.querySelectorAll('.card-front img').forEach(img => imageObserver.observe(img));
        grid.addEventListener('click', manejarClicsTarjetas);

    } catch (error) {
        console.error('Error cargando propiedades:', error);
        grid.innerHTML = `
            <div style="text-align:center; padding:3rem; grid-column:1/-1; border-radius:15px; border:1px solid #d4af37;">
                <h3 style="color:#d4af37; font-size:1.5rem; margin-bottom:20px;">⚠️ CATÁLOGO NO DISPONIBLE</h3>
                <p style="color:#e74c3c; font-size:1rem; margin-bottom:15px;">No fue posible obtener la lista de propiedades.</p>
                <p style="font-size:0.9rem; color:#aaa; max-width:600px; margin:auto;">Verifica tu conexión a internet o recarga la página más tarde.</p>
            </div>`;
    }
}

function manejarClicsTarjetas(e) {
    const card = e.target.closest('.card');
    if (!card) return;

    const gpsBox = e.target.closest('.gps-preview-box');
    if (gpsBox) {
        openFullMap(`img/gps/gps${gpsBox.dataset.gpsId}.webp`);
        return;
    }

    if (e.target.closest('[data-action="buy"]')) {
        buyHouse();
        return;
    }

    if (!card.classList.contains('is-flipped')) {
        const gpsContainer = card.querySelector('.gps-preview-box');
        if (!gpsContainer.querySelector('img')) {
            const gpsId = gpsContainer.dataset.gpsId;
            gpsContainer.innerHTML = `<img src="img/gps/gps${gpsId}.webp" loading="eager" decoding="async" alt="GPS de ${card.dataset.nombre}">`;
        }
    }

    card.classList.toggle('is-flipped');
}

function initScrollLogic() {
    const navbar = document.getElementById('navbar');
    let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                navbar.classList.toggle('header-hidden', currentScroll > lastScrollTop && currentScroll > 150);
                lastScrollTop = Math.max(0, currentScroll);
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

function initScrollReveal() {
    const esMobil = window.innerWidth <= 768;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!esMobil) entry.target.style.willChange = 'transform, opacity';

                entry.target.classList.add('active');

                if (!esMobil) {
                    entry.target.addEventListener('transitionend', () => {
                        entry.target.style.willChange = 'auto';
                    }, { once: true });
                }

                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function buyHouse() { document.getElementById('notificationModal').style.display = 'flex'; }
function closeNotification() { document.getElementById('notificationModal').style.display = 'none'; }

function openFullMap(src) {
    const modal = document.getElementById('imageModal');
    const img = document.getElementById('img01');
    if (modal && img) { img.src = src; modal.style.display = 'flex'; }
}

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
});

function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(item => {
        item.addEventListener('click', () => {
            const parent = item.parentElement;
            const answer = item.nextElementSibling;
            const icon = item.querySelector('.faq-icon');

            document.querySelectorAll('.faq-item.active').forEach(other => {
                if (other !== parent) {
                    other.classList.remove('active');
                    other.querySelector('.faq-answer').style.maxHeight = null;
                    other.querySelector('.faq-icon').style.transform = 'rotate(0deg)';
                }
            });

            parent.classList.toggle('active');
            const isActive = parent.classList.contains('active');
            answer.style.maxHeight = isActive ? answer.scrollHeight + 'px' : null;
            icon.style.transform = isActive ? 'rotate(45deg)' : 'rotate(0deg)';
        });
    });
}
