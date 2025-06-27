document.addEventListener('DOMContentLoaded', () => {
    // --- Configuración Global ---
    const CONFIG = {
        WHATSAPP_NUMBER: '5493512417121',
        PRICE_LOCALE: 'es-AR',
        CURRENCY: 'ARS',
        ITEMS_PER_PAGE: 72,

        // Valores por defecto para los precios de fotos (serán sobrescritos por localStorage)
        PHOTO_PRICE_INDIVIDUAL: 500,
        PHOTO_PRICE_20_PACK: 8000,

        // Alias de Mercado Pago (lo usaremos también para la transferencia bancaria)
        MERCADO_PAGO_ALIAS: 'cesar.dario.ph'
    };

    // Cargar precios de fotos guardados de localStorage al inicio
    function loadPhotoPricesFromLocalStorage() {
        const savedIndividualPrice = localStorage.getItem('individualPhotoPrice');
        const savedPackPrice = localStorage.getItem('pack20PhotosPrice');
        if (savedIndividualPrice !== null) {
            CONFIG.PHOTO_PRICE_INDIVIDUAL = parseFloat(savedIndividualPrice);
        }
        if (savedPackPrice !== null) {
            CONFIG.PHOTO_20_PACK = parseFloat(savedPackPrice);
        }
        console.log("DEBUG: Precios cargados del localStorage:", { individual: CONFIG.PHOTO_PRICE_INDIVIDUAL, pack: CONFIG.PHOTO_20_PACK });
    }
    loadPhotoPricesFromLocalStorage(); // Cargar los precios de fotos al inicio

    // --- Elementos del DOM ---
    const elements = {
        // Header
        menuToggle: document.querySelector('.menu-toggle'),
        mobileMenu: document.querySelector('.mobile-menu'),
        closeMenuBtn: document.querySelector('.close-menu-btn'),
        selectionIcon: document.querySelector('.selection-icon'),
        selectionCount: document.querySelector('.selection-count'),
        whatsappFloatBtn: document.getElementById('whatsapp-float-btn'),

        // Secciones
        featuredEventsContainer: document.getElementById('featured-events-container'),
        categoryFilter: document.getElementById('categoryFilter'),
        photoGrid: document.getElementById('photoGrid'),
        gallerySection: document.getElementById('gallery'),
        currentEventGalleryTitle: document.getElementById('current-event-gallery-title'),
        featuredProductsGrid: document.getElementById('featuredProductsGrid'),
        downloadSection: document.getElementById('download-section'),
        downloadLinksContainer: document.getElementById('download-links-container'),
        downloadAllBtn: document.getElementById('download-all-btn'),

        // Lightbox
        lightbox: document.getElementById('lightbox'),
        lightboxImage: document.getElementById('lightbox-image'),
        lightboxVideo: document.getElementById('lightbox-video'),
        lightboxCaption: document.getElementById('lightbox-caption'),
        lightboxClose: document.getElementById('lightbox-close'),
        lightboxPrev: document.getElementById('lightbox-prev'),
        lightboxNext: document.getElementById('lightbox-next'),
        addToSelectionBtn: document.getElementById('addToSelectionBtn'),

        // Panel de Selección (Carrito)
        selectionPanel: document.getElementById('selection-panel'),
        closeSelectionPanelBtn: document.getElementById('close-selection-panel-btn'),
        selectedItemsList: document.getElementById('selected-items-list'),
        totalPrice: document.getElementById('total-price'),
        whatsappBtn: document.getElementById('whatsapp-btn'),
        whatsappDownloadLinkBtn: document.getElementById('whatsapp-download-link-btn'), // Nuevo botón
        downloadLinkGeneratorBtn: document.getElementById('download-link-generator-btn'), // Botón para abrir el generador de enlaces
        clearSelectionBtn: document.getElementById('clear-selection-btn'),
        packSummaryMessage: document.getElementById('pack-summary-message'),

        // Modal de Pago
        paymentModal: document.getElementById('payment-modal'),
        closePaymentModalBtn: document.getElementById('close-payment-modal-btn'),
        paymentMethodToggle: document.getElementById('payment-method-toggle'),
        mercadoPagoDetails: document.getElementById('mercado-pago-details'),
        bankTransferDetails: document.getElementById('bank-transfer-details'),
        paymentTotalAmount: document.getElementById('payment-total-amount'),
        whatsappPaymentBtn: document.getElementById('whatsapp-payment-btn'),

        // Toast Notification
        toastNotification: document.getElementById('toastNotification'),

        // Admin Panel
        openAdminPanelBtn: document.getElementById('open-admin-panel-btn'),
        adminPanel: document.getElementById('admin-panel'),
        closeAdminPanelBtn: document.getElementById('close-admin-panel-btn'),
        individualPhotoPriceInput: document.getElementById('individual-photo-price'),
        pack20PhotosPriceInput: document.getElementById('pack-20-photos-price'),
        savePricesBtn: document.getElementById('save-prices-btn'),
        priceUpdateMessage: document.getElementById('price-update-message'),
        productSelect: document.getElementById('product-select'),
        selectedProductPriceInputContainer: document.getElementById('selected-product-price-input-container'),
        adminPhotoIdsInput: document.getElementById('admin-photo-ids-input'),
        generateAdminDownloadLinkBtn: document.getElementById('generate-admin-download-link-btn'),
        generatedDownloadLinkOutput: document.getElementById('generated-download-link-output'),
        copyAdminDownloadLinkBtn: document.getElementById('copy-admin-download-link-btn'),
        whatsappAdminDownloadLinkBtn: document.getElementById('whatsapp-admin-download-link-btn'),
    };

    // --- Variables de Estado ---
    let galleryData = [];
    let selectedItems = JSON.parse(localStorage.getItem('selectedItems')) || [];
    let currentLightboxMedia = null;
    let currentLightboxIndex = 0;
    let currentLightboxCategoryContent = [];
    let currentProductCategory = null; // Para saber qué categoría de producto se está mostrando
    let allProducts = []; // Para almacenar todos los productos de la tienda

    // --- Funciones de Utilidad ---

    // Función para mostrar notificaciones toast
    function showToast(message, type = 'info') {
        elements.toastNotification.textContent = message;
        elements.toastNotification.className = `toast show ${type}`; // Añade tipo para estilos (ej. 'success', 'error')
        setTimeout(() => {
            elements.toastNotification.className = elements.toastNotification.className.replace('show', '');
        }, 3000);
    }

    // Función para añadir/quitar scroll al body
    function addBodyNoScroll() {
        document.body.classList.add('no-scroll');
    }

    function removeBodyNoScroll() {
        document.body.classList.remove('no-scroll');
    }

    // Formatear precios
    function formatPrice(price) {
        return new Intl.NumberFormat(CONFIG.PRICE_LOCALE, {
            style: 'currency',
            currency: CONFIG.CURRENCY,
            minimumFractionDigits: 0, // No mostrar decimales para números enteros
            maximumFractionDigits: 0, // No mostrar decimales para números enteros
        }).format(price);
    }

    // --- Lógica del Carrito (Selección de Fotos/Productos) ---

    function updateSelectionCount() {
        elements.selectionCount.textContent = selectedItems.length;
        elements.selectionCount.style.display = selectedItems.length > 0 ? 'flex' : 'none';
        updateSelectionPanel();
    }

    function addToSelection(media) {
        // Evitar duplicados
        if (!selectedItems.some(item => item.id === media.id)) {
            selectedItems.push(media);
            localStorage.setItem('selectedItems', JSON.stringify(selectedItems));
            updateSelectionCount();
            showToast(`${media.name} añadido a la selección.`, 'success');
        } else {
            showToast(`${media.name} ya está en tu selección.`, 'info');
        }
    }

    function removeFromSelection(mediaId) {
        selectedItems = selectedItems.filter(item => item.id !== mediaId);
        localStorage.setItem('selectedItems', JSON.stringify(selectedItems));
        updateSelectionCount();
        showToast('Elemento eliminado de la selección.', 'info');
    }

    function clearSelection() {
        selectedItems = [];
        localStorage.removeItem('selectedItems');
        updateSelectionCount();
        showToast('Selección vaciada.', 'info');
        // Cerrar el panel de selección si está abierto
        if (elements.selectionPanel && elements.selectionPanel.classList.contains('open')) {
            elements.selectionPanel.classList.remove('open');
            elements.selectionPanel.style.display = 'none'; // Explicitly hide
            removeBodyNoScroll();
        }
    }

    function calculateTotalPrice() {
        let total = 0;
        let photoCount = 0;
        let productTotal = 0;

        selectedItems.forEach(item => {
            if (item.type === 'image' || item.type === 'video') { // Asumimos que videos también se cuentan como fotos para el pack
                photoCount++;
            } else if (item.type === 'product') {
                productTotal += item.price || 0; // Usar el precio del producto si está definido
            }
        });

        // Lógica para el paquete de 20 fotos
        if (photoCount > 0) {
            if (photoCount >= 20) {
                // Calcular cuántos packs de 20 y cuántas individuales quedan
                const numPacks = Math.floor(photoCount / 20);
                const remainingPhotos = photoCount % 20;
                total += numPacks * CONFIG.PHOTO_PRICE_20_PACK;
                total += remainingPhotos * CONFIG.PHOTO_PRICE_INDIVIDUAL;
                elements.packSummaryMessage.textContent = `Tienes ${photoCount} fotos seleccionadas. Incluye ${numPacks} pack(s) de 20 fotos y ${remainingPhotos} foto(s) individual(es).`;
                elements.packSummaryMessage.style.display = 'block';
            } else {
                total += photoCount * CONFIG.PHOTO_PRICE_INDIVIDUAL;
                elements.packSummaryMessage.textContent = `Tienes ${photoCount} fotos seleccionadas. El pack de 20 fotos se aplica a partir de 20 unidades.`;
                elements.packSummaryMessage.style.display = 'block';
            }
        } else {
            elements.packSummaryMessage.style.display = 'none';
        }

        total += productTotal; // Sumar el total de productos

        elements.totalPrice.textContent = `Total Estimado: ${formatPrice(total)}`;
        return total;
    }

    function updateSelectionPanel() {
        elements.selectedItemsList.innerHTML = '';
        if (selectedItems.length === 0) {
            elements.selectedItemsList.innerHTML = '<li class="empty-selection">Tu selección está vacía.</li>';
            elements.whatsappBtn.disabled = true;
            elements.whatsappDownloadLinkBtn.disabled = true; // Deshabilitar si no hay elementos
            elements.clearSelectionBtn.disabled = true;
        } else {
            selectedItems.forEach(item => {
                const li = document.createElement('li');
                li.className = 'selected-item-card';
                li.innerHTML = `
                    <div class="item-info">
                        <span class="item-name">${item.name}</span>
                        ${item.price ? `<span class="item-price">${formatPrice(item.price)}</span>` : ''}
                    </div>
                    <button class="remove-item-btn" data-id="${item.id}" aria-label="Eliminar ${item.name}">&times;</button>
                `;
                elements.selectedItemsList.appendChild(li);
            });
            elements.whatsappBtn.disabled = false;
            elements.whatsappDownloadLinkBtn.disabled = false; // Habilitar si hay elementos
            elements.clearSelectionBtn.disabled = false;
        }
        calculateTotalPrice();
    }

    // --- Lógica del Lightbox ---

    function openLightbox(media, categoryContent) {
        currentLightboxMedia = media;
        currentLightboxCategoryContent = categoryContent;
        currentLightboxIndex = currentLightboxCategoryContent.findIndex(item => item.id === media.id);

        elements.lightboxImage.style.display = 'none';
        elements.lightboxVideo.style.display = 'none';
        elements.lightboxVideo.pause(); // Pausar cualquier video anterior

        if (media.type === 'image') {
            elements.lightboxImage.src = media.src;
            elements.lightboxImage.alt = media.name; // Asegurar alt text
            elements.lightboxImage.style.display = 'block';
        } else if (media.type === 'video') {
            elements.lightboxVideo.src = media.src;
            elements.lightboxVideo.style.display = 'block';
            elements.lightboxVideo.play();
        }

        elements.lightboxCaption.textContent = media.name;

        // Ocultar/Mostrar botón de añadir a selección si es un producto
        if (media.type === 'product') {
            elements.addToSelectionBtn.style.display = 'none'; // Los productos se añaden desde la vista de productos
        } else {
            elements.addToSelectionBtn.style.display = 'block';
        }

        elements.lightbox.classList.add('open');
        addBodyNoScroll();
    }

    function closeLightbox() {
        elements.lightbox.classList.remove('open');
        elements.lightboxVideo.pause(); // Asegurarse de pausar el video al cerrar
        removeBodyNoScroll();
    }

    function navigateLightbox(direction) {
        if (!currentLightboxCategoryContent || currentLightboxCategoryContent.length === 0) return;

        currentLightboxIndex += direction;
        if (currentLightboxIndex < 0) {
            currentLightboxIndex = currentLightboxCategoryContent.length - 1;
        } else if (currentLightboxIndex >= currentLightboxCategoryContent.length) {
            currentLightboxIndex = 0;
        }
        openLightbox(currentLightboxCategoryContent[currentLightboxIndex], currentLightboxCategoryContent);
    }

    // --- Generación de Contenido Dinámico ---

    // Cargar datos desde data.json
    async function loadGalleryData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            galleryData = await response.json();
            console.log("DEBUG: Datos de galería cargados:", galleryData);
            populateFeaturedEvents();
            populateCategoryFilter();
            populateProductStore();
            populateAdminProductSelect(); // Llenar el select de productos en el admin
            checkDownloadLinkFromURL(); // Verificar si hay un enlace de descarga en la URL
        } catch (error) {
            console.error("Error al cargar los datos de la galería:", error);
            showToast('Error al cargar el contenido. Intenta de nuevo más tarde.', 'error');
        }
    }

    function populateFeaturedEvents() {
        elements.featuredEventsContainer.innerHTML = ''; // Limpiar contenido existente
        const eventCategories = galleryData.filter(cat => !cat.isProductCategory);

        if (eventCategories.length === 0) {
            elements.featuredEventsContainer.innerHTML = '<p class="event-placeholder">No hay eventos disponibles en este momento.</p>';
            return;
        }

        // Mostrar un máximo de 6 eventos destacados o todos si son menos
        const eventsToShow = eventCategories.slice(0, 6);

        eventsToShow.forEach(event => {
            const firstImage = event.content.find(item => item.type === 'image');
            const imageUrl = firstImage ? firstImage.src : 'https://placehold.co/400x250/1D3557/F1FAEE?text=No+Image'; // Placeholder si no hay imagen

            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.innerHTML = `
                <img src="${imageUrl}" alt="Portada de ${event.name}" class="event-card-img">
                <div class="event-card-info">
                    <h3>${event.name}</h3>
                    <p>${event.content.length} ${event.content.length === 1 ? 'elemento' : 'elementos'}</p>
                    <button class="btn btn-secondary view-event-btn" data-category="${event.path}">Ver Galería</button>
                </div>
            `;
            elements.featuredEventsContainer.appendChild(eventCard);
        });

        // Añadir event listeners a los botones "Ver Galería"
        document.querySelectorAll('.view-event-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const categoryPath = event.target.dataset.category;
                elements.categoryFilter.value = categoryPath; // Sincronizar el filtro
                displayCategoryContent(categoryPath);
                // Scroll a la sección de galería
                elements.gallerySection.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    function populateCategoryFilter() {
        elements.categoryFilter.innerHTML = '<option value="all">Todas las Fotos de Eventos</option>'; // Reset
        galleryData.filter(cat => !cat.isProductCategory).forEach(category => {
            const option = document.createElement('option');
            option.value = category.path;
            option.textContent = category.name;
            elements.categoryFilter.appendChild(option);
        });
    }

    function displayCategoryContent(categoryPath) {
        elements.photoGrid.innerHTML = ''; // Limpiar contenido existente
        let contentToDisplay = [];
        let title = 'Galería de Fotos';

        if (categoryPath === 'all') {
            galleryData.filter(cat => !cat.isProductCategory).forEach(category => {
                contentToDisplay = contentToDisplay.concat(category.content);
            });
        } else {
            const selectedCategory = galleryData.find(cat => cat.path === categoryPath);
            if (selectedCategory && !selectedCategory.isProductCategory) {
                contentToDisplay = selectedCategory.content;
                title = `Galería: ${selectedCategory.name}`;
            }
        }

        elements.currentEventGalleryTitle.textContent = title;
        elements.gallerySection.style.display = 'block'; // Asegurarse de que la sección de galería esté visible

        if (contentToDisplay.length === 0) {
            elements.photoGrid.innerHTML = '<p class="event-placeholder">No hay elementos en esta categoría.</p>';
            return;
        }

        contentToDisplay.forEach(media => {
            const mediaCard = document.createElement('div');
            mediaCard.className = 'photo-card';
            mediaCard.dataset.id = media.id; // Añadir ID para fácil referencia
            mediaCard.innerHTML = `
                <img src="${media.src}" alt="${media.name}" class="photo-card-img">
                <div class="photo-card-overlay">
                    <p class="photo-card-title">${media.name}</p>
                    <button class="btn btn-primary add-to-selection-btn" data-id="${media.id}" data-type="${media.type}" data-src="${media.src}" data-name="${media.name}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;
            elements.photoGrid.appendChild(mediaCard);

            // Event listener para abrir lightbox
            mediaCard.querySelector('.photo-card-img').addEventListener('click', () => {
                openLightbox(media, contentToDisplay);
            });
            // Event listener para añadir a selección desde el overlay
            mediaCard.querySelector('.add-to-selection-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar que el clic en el botón abra el lightbox
                addToSelection(media);
            });
        });
    }

    function populateProductStore() {
        elements.featuredProductsGrid.innerHTML = ''; // Limpiar contenido existente
        const productCategory = galleryData.find(cat => cat.isProductCategory);

        if (!productCategory || !productCategory.products || productCategory.products.length === 0) {
            elements.featuredProductsGrid.innerHTML = '<p class="event-placeholder">No hay productos disponibles en este momento.</p>';
            return;
        }

        allProducts = productCategory.products; // Almacenar todos los productos

        allProducts.forEach(product => {
            const firstImage = product.images[0]; // Usar la primera imagen como miniatura
            const imageUrl = firstImage ? firstImage.src : 'https://placehold.co/400x250/1D3557/F1FAEE?text=Producto'; // Placeholder

            const productCard = document.createElement('div');
            productCard.className = 'photo-card product-card'; // Reutilizar estilos de photo-card
            productCard.dataset.id = product.id; // Añadir ID del producto
            productCard.innerHTML = `
                <img src="${imageUrl}" alt="${product.name}" class="photo-card-img">
                <div class="photo-card-overlay">
                    <p class="photo-card-title">${product.name}</p>
                    <p class="product-price">${formatPrice(product.price || 0)}</p>
                    <button class="btn btn-primary add-to-selection-btn" data-id="${product.id}" data-type="product" data-name="${product.name}" data-price="${product.price || 0}">
                        <i class="fas fa-shopping-cart"></i> Añadir
                    </button>
                </div>
            `;
            elements.featuredProductsGrid.appendChild(productCard);

            // Event listener para añadir producto a selección
            productCard.querySelector('.add-to-selection-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                addToSelection({
                    id: product.id,
                    name: product.name,
                    type: 'product',
                    price: product.price || 0 // Asegurarse de pasar el precio
                });
            });

            // Event listener para abrir lightbox de producto (mostrar todas las variantes)
            productCard.querySelector('.photo-card-img').addEventListener('click', () => {
                openLightbox({
                    id: firstImage.id,
                    type: firstImage.type,
                    src: firstImage.src,
                    name: product.name // La descripción del producto
                }, product.images); // Pasar todas las imágenes del producto como "categoría" para navegar
            });
        });
    }

    // --- Lógica del Panel de Administración ---

    // Función para abrir el panel de administración
    function openAdminPanel() {
        elements.adminPanel.classList.add('open');
        elements.adminPanel.style.display = 'flex'; // Asegurarse de que sea flex para centrado
        addBodyNoScroll();
        loadAdminPrices();
        populateAdminProductSelect(); // Asegurarse de que el select de productos esté actualizado
    }

    // Función para cerrar el panel de administración
    function closeAdminPanel() {
        elements.adminPanel.classList.remove('open');
        // Usar un pequeño retraso antes de ocultar completamente para permitir la transición
        setTimeout(() => {
            elements.adminPanel.style.display = 'none';
            removeBodyNoScroll();
        }, 300); // Coincide con la velocidad de transición en CSS
    }

    // Cargar precios en el panel de administración
    function loadAdminPrices() {
        elements.individualPhotoPriceInput.value = CONFIG.PHOTO_PRICE_INDIVIDUAL;
        elements.pack20PhotosPriceInput.value = CONFIG.PHOTO_20_PACK;
        elements.priceUpdateMessage.textContent = ''; // Limpiar mensaje
    }

    // Guardar precios del panel de administración
    function saveAdminPrices() {
        const individualPrice = parseFloat(elements.individualPhotoPriceInput.value);
        const packPrice = parseFloat(elements.pack20PhotosPriceInput.value);

        if (isNaN(individualPrice) || individualPrice < 0 || isNaN(packPrice) || packPrice < 0) {
            showToast('Por favor, introduce precios válidos (números positivos).', 'error');
            return;
        }

        CONFIG.PHOTO_PRICE_INDIVIDUAL = individualPrice;
        CONFIG.PHOTO_20_PACK = packPrice;
        localStorage.setItem('individualPhotoPrice', individualPrice);
        localStorage.setItem('pack20PhotosPrice', packPrice);

        // Guardar precios de productos
        allProducts.forEach(product => {
            const input = document.getElementById(`product-price-${product.id}`);
            if (input) {
                const newPrice = parseFloat(input.value);
                if (!isNaN(newPrice) && newPrice >= 0) {
                    product.price = newPrice;
                } else {
                    console.warn(`Precio inválido para el producto ${product.name}: ${input.value}`);
                }
            }
        });
        // Actualizar los datos en localStorage (o en un futuro, en Firestore)
        // Por ahora, no hay un mecanismo para guardar 'allProducts' a data.json directamente desde el cliente.
        // Esto es una limitación del setup estático.
        // Si los precios de los productos se actualizan, la página necesitaría recargarse para reflejarlo en la tienda.
        // Para persistencia real de precios de productos, se necesitaría un backend o Firestore.

        elements.priceUpdateMessage.textContent = 'Precios guardados exitosamente.';
        elements.priceUpdateMessage.style.color = 'var(--whatsapp-color)';
        showToast('Precios guardados y actualizados.', 'success');
        updateSelectionPanel(); // Recalcular total del carrito con los nuevos precios
        // Recargar la tienda para que los precios de los productos se actualicen visualmente
        populateProductStore();
    }

    // Llenar el select de productos en el panel de administración
    function populateAdminProductSelect() {
        elements.productSelect.innerHTML = '<option value="">-- Selecciona un producto --</option>';
        const productCategory = galleryData.find(cat => cat.isProductCategory);

        if (productCategory && productCategory.products) {
            productCategory.products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                elements.productSelect.appendChild(option);
            });
        }
        // Limpiar el input de precio del producto seleccionado
        elements.selectedProductPriceInputContainer.innerHTML = '<p class="event-placeholder">Selecciona un producto para modificar su precio.</p>';
    }

    // Mostrar campo de precio para el producto seleccionado en el admin
    function displaySelectedProductPriceInput() {
        const selectedProductId = elements.productSelect.value;
        elements.selectedProductPriceInputContainer.innerHTML = ''; // Limpiar

        if (selectedProductId) {
            const product = allProducts.find(p => p.id === selectedProductId);
            if (product) {
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';
                formGroup.innerHTML = `
                    <label for="product-price-${product.id}">Precio de ${product.name}:</label>
                    <input type="number" id="product-price-${product.id}" min="0" step="100" value="${product.price || 0}">
                `;
                elements.selectedProductPriceInputContainer.appendChild(formGroup);
            }
        } else {
            elements.selectedProductPriceInputContainer.innerHTML = '<p class="event-placeholder">Selecciona un producto para modificar su precio.</p>';
        }
    }

    // --- Lógica de Enlace de Descarga (Admin y Cliente) ---

    // Generar enlace de descarga para el cliente (desde el carrito)
    function generateDownloadLinkForClient() {
        if (selectedItems.length === 0) {
            showToast('No hay elementos seleccionados para generar un enlace de descarga.', 'info');
            return '';
        }
        const photoIds = selectedItems.filter(item => item.type === 'image' || item.type === 'video').map(item => item.id);
        if (photoIds.length === 0) {
            showToast('No hay fotos o videos seleccionados para generar un enlace de descarga.', 'info');
            return '';
        }
        const baseUrl = window.location.origin + window.location.pathname;
        const downloadLink = `${baseUrl}?download=${photoIds.join(',')}`;
        return downloadLink;
    }

    // Generar enlace de descarga desde el panel de administración
    function generateAdminDownloadLink() {
        const inputIds = elements.adminPhotoIdsInput.value.trim();
        if (!inputIds) {
            showToast('Por favor, introduce IDs de fotos para generar el enlace.', 'error');
            elements.generatedDownloadLinkOutput.style.display = 'none';
            elements.copyAdminDownloadLinkBtn.style.display = 'none';
            elements.whatsappAdminDownloadLinkBtn.style.display = 'none';
            return;
        }
        const idsArray = inputIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
        if (idsArray.length === 0) {
            showToast('Por favor, introduce IDs de fotos válidos.', 'error');
            elements.generatedDownloadLinkOutput.style.display = 'none';
            elements.copyAdminDownloadLinkBtn.style.display = 'none';
            elements.whatsappAdminDownloadLinkBtn.style.display = 'none';
            return;
        }

        const baseUrl = window.location.origin + window.location.pathname;
        const downloadLink = `${baseUrl}?download=${idsArray.join(',')}`;

        elements.generatedDownloadLinkOutput.textContent = downloadLink;
        elements.generatedDownloadLinkOutput.style.display = 'block';
        elements.copyAdminDownloadLinkBtn.style.display = 'inline-block';
        elements.whatsappAdminDownloadLinkBtn.style.display = 'inline-block';
        showToast('Enlace de descarga generado.', 'success');
    }

    // Copiar enlace al portapapeles
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Enlace copiado al portapapeles.', 'success');
        } catch (err) {
            console.error('Error al copiar al portapapeles:', err);
            showToast('No se pudo copiar el enlace automáticamente. Por favor, cópialo manualmente.', 'error');
        }
        document.body.removeChild(textarea);
    }

    // Verificar si la URL tiene un parámetro de descarga al cargar la página
    function checkDownloadLinkFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const downloadIds = urlParams.get('download');

        if (downloadIds) {
            const idsArray = downloadIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
            const mediaToDownload = [];

            idsArray.forEach(id => {
                // Buscar en todas las categorías de eventos
                galleryData.filter(cat => !cat.isProductCategory).forEach(category => {
                    const foundMedia = category.content.find(media => media.id === id);
                    if (foundMedia && !mediaToDownload.some(m => m.id === foundMedia.id)) { // Evitar duplicados
                        mediaToDownload.push(foundMedia);
                    }
                });
            });

            if (mediaToDownload.length > 0) {
                displayDownloadableItems(mediaToDownload);
                elements.downloadSection.style.display = 'block';
                elements.downloadSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                showToast('No se encontraron fotos o videos para descargar con los IDs proporcionados.', 'info');
            }
        }
    }

    // Mostrar elementos descargables en la sección de descarga
    function displayDownloadableItems(mediaItems) {
        elements.downloadLinksContainer.innerHTML = ''; // Limpiar
        mediaItems.forEach(media => {
            const downloadCard = document.createElement('div');
            downloadCard.className = 'photo-card download-card'; // Reutilizar estilos
            downloadCard.innerHTML = `
                <a href="${media.src}" download="${media.name}" target="_blank">
                    <img src="${media.src}" alt="${media.name}" class="photo-card-img">
                    <div class="photo-card-overlay">
                        <p class="photo-card-title">${media.name}</p>
                        <i class="fas fa-download download-icon"></i>
                    </div>
                </a>
            `;
            elements.downloadLinksContainer.appendChild(downloadCard);
        });
    }

    // Descargar todas las fotos de la sección de descarga
    function downloadAllPhotos() {
        const downloadLinks = elements.downloadLinksContainer.querySelectorAll('.download-card a');
        if (downloadLinks.length === 0) {
            showToast('No hay fotos para descargar.', 'info');
            return;
        }

        showToast(`Iniciando descarga de ${downloadLinks.length} archivos.`, 'info');

        // Usar un pequeño retraso entre descargas para evitar bloqueos del navegador
        let delay = 0;
        downloadLinks.forEach((link, index) => {
            setTimeout(() => {
                link.click(); // Simula un clic en el enlace para iniciar la descarga
            }, delay);
            delay += 500; // 0.5 segundos de retraso por cada descarga
        });
    }

    // --- Lógica del Modal de Pago ---

    function openPaymentModal() {
        const total = calculateTotalPrice();
        if (total === 0) {
            showToast('Tu selección está vacía. Añade elementos antes de proceder al pago.', 'info');
            return;
        }
        elements.paymentTotalAmount.textContent = formatPrice(total);
        elements.paymentModal.classList.add('open');
        addBodyNoScroll();
        // Asegurarse de que Mercado Pago sea la opción por defecto al abrir
        elements.paymentMethodToggle.checked = false;
        elements.mercadoPagoDetails.style.display = 'block';
        elements.bankTransferDetails.style.display = 'none';
        updateWhatsappPaymentLink(); // Actualizar el enlace de WhatsApp para el pago
    }

    function closePaymentModal() {
        elements.paymentModal.classList.remove('open');
        removeBodyNoScroll();
    }

    function togglePaymentMethod() {
        if (elements.paymentMethodToggle.checked) { // Transferencia Bancaria
            elements.mercadoPagoDetails.style.display = 'none';
            elements.bankTransferDetails.style.display = 'block';
            elements.bankTransferDetails.innerHTML = `
                <h4>Paga con Transferencia Bancaria</h4>
                <div class="payment-details">
                    <p><strong>Banco:</strong> Banco Nación</p>
                    <p><strong>CBU:</strong> 0110000000000000000000</p>
                    <p><strong>Alias:</strong> ${CONFIG.MERCADO_PAGO_ALIAS}</p>
                    <p><strong>Titular:</strong> CESAR DARIO PEREZ</p>
                    <p><strong>CUIT/CUIL:</strong> XX-XXXXXXXX-X</p>
                </div>
                <p><strong>Monto Total:</strong> <span id="payment-total-amount-bank">${elements.paymentTotalAmount.textContent}</span></p>
                <p class="note">Por favor, realiza la transferencia y luego envía el comprobante por WhatsApp.</p>
            `;
        } else { // Mercado Pago
            elements.mercadoPagoDetails.style.display = 'block';
            elements.bankTransferDetails.style.display = 'none';
        }
        updateWhatsappPaymentLink();
    }

    function updateWhatsappPaymentLink() {
        const totalAmount = elements.paymentTotalAmount.textContent;
        let message = `Hola! Quiero confirmar mi pedido con un total de ${totalAmount}. `;

        if (elements.paymentMethodToggle.checked) { // Transferencia Bancaria
            message += `He realizado una transferencia bancaria. Adjunto el comprobante.`;
        } else { // Mercado Pago
            message += `Pagaré con Mercado Pago.`;
        }

        const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        elements.whatsappPaymentBtn.href = whatsappUrl;
    }

    // --- Inicialización y Event Listeners ---

    function init() {
        loadGalleryData(); // Cargar datos al inicio

        // --- Visibilidad del botón Admin ---
        // Comprobar si el parámetro '?admin=true' está en la URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('admin') === 'true') {
            elements.openAdminPanelBtn.style.display = 'block'; // Mostrar el botón Admin
            console.log("DEBUG: Parámetro admin=true detectado. Botón Admin visible.");
        } else {
            elements.openAdminPanelBtn.style.display = 'none'; // Ocultar el botón Admin por defecto
            console.log("DEBUG: Parámetro admin=true NO detectado. Botón Admin oculto.");
        }


        // Header y Mobile Menu
        if (elements.menuToggle) elements.menuToggle.addEventListener('click', () => {
            elements.mobileMenu.classList.add('open');
            addBodyNoScroll();
        });
        if (elements.closeMenuBtn) elements.closeMenuBtn.addEventListener('click', () => {
            elements.mobileMenu.classList.remove('open');
            removeBodyNoScroll();
        });
        document.querySelectorAll('.mobile-nav-list a').forEach(link => {
            link.addEventListener('click', () => {
                elements.mobileMenu.classList.remove('open');
                removeBodyNoScroll();
            });
        });
        if (elements.whatsappFloatBtn) elements.whatsappFloatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const defaultMessage = "Hola, me gustaría obtener más información sobre sus servicios de fotografía y productos.";
            window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(defaultMessage)}`, '_blank');
        });

        // Selección (Carrito)
        if (elements.selectionIcon) elements.selectionIcon.addEventListener('click', () => {
            elements.selectionPanel.classList.add('open');
            elements.selectionPanel.style.display = 'flex'; // Asegurarse de que sea flex para centrado
            addBodyNoScroll();
            updateSelectionPanel();
        });
        if (elements.closeSelectionPanelBtn) elements.closeSelectionPanelBtn.addEventListener('click', () => {
            elements.selectionPanel.classList.remove('open');
            // Usar un pequeño retraso antes de ocultar completamente para permitir la transición
            setTimeout(() => {
                elements.selectionPanel.style.display = 'none';
                removeBodyNoScroll();
            }, 300); // Coincide con la velocidad de transición en CSS
        });
        // Delegación de eventos para eliminar items del carrito
        if (elements.selectedItemsList) elements.selectedItemsList.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-item-btn')) {
                const itemId = event.target.dataset.id;
                removeFromSelection(itemId);
            }
        });
        if (elements.clearSelectionBtn) elements.clearSelectionBtn.addEventListener('click', clearSelection);

        // WhatsApp para pedido
        if (elements.whatsappBtn) elements.whatsappBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openPaymentModal(); // Abrir modal de pago antes de enviar a WhatsApp
        });

        // WhatsApp para enlace de descarga (desde el carrito)
        if (elements.whatsappDownloadLinkBtn) elements.whatsappDownloadLinkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const downloadLink = generateDownloadLinkForClient();
            if (downloadLink) {
                const message = `Hola! Aquí tienes el enlace para descargar tus fotos seleccionadas: ${downloadLink}`;
                window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
            }
        });

        // Botón para generar enlace de descarga (abre el panel admin)
        if (elements.downloadLinkGeneratorBtn) elements.downloadLinkGeneratorBtn.addEventListener('click', () => {
            openAdminPanel();
            // Scroll al generador de enlaces dentro del admin panel
            setTimeout(() => {
                if (elements.adminPhotoIdsInput) elements.adminPhotoIdsInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 400); // Pequeño retraso para que el panel se abra primero
        });


        // Lightbox
        if (elements.lightboxClose) elements.lightboxClose.addEventListener('click', closeLightbox);
        if (elements.lightboxPrev) elements.lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
        if (elements.lightboxNext) elements.lightboxNext.addEventListener('click', () => navigateLightbox(1));
        if (elements.addToSelectionBtn) elements.addToSelectionBtn.addEventListener('click', () => {
            if (currentLightboxMedia) {
                addToSelection(currentLightboxMedia);
            }
        });

        // Filtro de Categorías de Eventos
        if (elements.categoryFilter) elements.categoryFilter.addEventListener('change', (event) => {
            displayCategoryContent(event.target.value);
        });

        // Admin Panel
        if (elements.openAdminPanelBtn) elements.openAdminPanelBtn.addEventListener('click', openAdminPanel);
        if (elements.closeAdminPanelBtn) elements.closeAdminPanelBtn.addEventListener('click', closeAdminPanel);
        if (elements.savePricesBtn) elements.savePricesBtn.addEventListener('click', saveAdminPrices);
        if (elements.productSelect) elements.productSelect.addEventListener('change', displaySelectedProductPriceInput);
        if (elements.generateAdminDownloadLinkBtn) elements.generateAdminDownloadLinkBtn.addEventListener('click', generateAdminDownloadLink);
        if (elements.copyAdminDownloadLinkBtn) elements.copyAdminDownloadLinkBtn.addEventListener('click', () => {
            copyToClipboard(elements.generatedDownloadLinkOutput.textContent);
        });
        if (elements.whatsappAdminDownloadLinkBtn) elements.whatsappAdminDownloadLinkBtn.addEventListener('click', () => {
            const link = elements.generatedDownloadLinkOutput.textContent;
            if (link) {
                const message = `Hola! Aquí tienes el enlace de descarga que me pediste: ${link}`;
                window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
            } else {
                showToast('Primero genera un enlace de descarga.', 'info');
            }
        });

        // Modal de Pago
        if (elements.closePaymentModalBtn) elements.closePaymentModalBtn.addEventListener('click', closePaymentModal);
        if (elements.paymentMethodToggle) elements.paymentMethodToggle.addEventListener('change', togglePaymentMethod);
        if (elements.whatsappPaymentBtn) elements.whatsappPaymentBtn.addEventListener('click', (e) => {
            // El enlace ya se actualiza en togglePaymentMethod y openPaymentModal
            // Solo necesitamos asegurarnos de que el modal se cierre después de hacer clic
            // No hay necesidad de prevenir el default si el href ya está configurado
            closePaymentModal();
            clearSelection(); // Opcional: vaciar selección después de enviar el pedido
        });


        // Cerrar paneles/modales al hacer clic fuera
        document.addEventListener('click', (event) => {
            // Cierre del menú móvil
            const isClickInsideMobileMenu = elements.mobileMenu && elements.mobileMenu.contains(event.target);
            const isMenuToggle = elements.menuToggle && elements.menuToggle.contains(event.target);
            if (elements.mobileMenu && elements.mobileMenu.classList.contains('open') && !isClickInsideMobileMenu && !isMenuToggle) {
                elements.mobileMenu.classList.remove('open');
                removeBodyNoScroll();
            }

            // Cierre del panel de selección
            const isClickInsideSelectionPanel = elements.selectionPanel && elements.selectionPanel.contains(event.target);
            const isSelectionIcon = elements.selectionIcon && elements.selectionIcon.contains(event.target);
            const isDownloadLinkGeneratorBtn = elements.downloadLinkGeneratorBtn && elements.downloadLinkGeneratorBtn.contains(event.target); // Nuevo botón para abrir admin
            if (elements.selectionPanel && elements.selectionPanel.classList.contains('open') && !isClickInsideSelectionPanel && !isSelectionIcon && !isDownloadLinkGeneratorBtn) {
                elements.selectionPanel.classList.remove('open');
                elements.selectionPanel.style.display = 'none'; // Explicitly hide
                removeBodyNoScroll();
            }

            // Cierre del lightbox
            const isClickInsideLightboxContent = elements.lightboxContent && elements.lightboxContent.contains(event.target);
            const isLightboxNav = (elements.lightboxPrev && elements.lightboxPrev.contains(event.target)) || (elements.lightboxNext && elements.lightboxNext.contains(event.target));
            const isLightboxCloseBtn = elements.lightboxClose && elements.lightboxClose.contains(event.target);
            const isMediaCard = event.target.closest('.photo-card'); // Clic en una tarjeta de foto/producto
            if (elements.lightbox && elements.lightbox.classList.contains('open') && !isClickInsideLightboxContent && !isLightboxNav && !isLightboxCloseBtn && !isMediaCard) {
                // No cerrar si el clic es en la imagen/video dentro del lightbox o en los botones de navegación
                // Este manejo es más complejo, el botón de cerrar es el principal.
                // Para cerrar al hacer clic fuera del contenido, se puede añadir un listener al lightbox mismo que filtre clicks en el contenido
            }

            // Cierre del panel de administración
            const isClickInsideAdminPanel = elements.adminPanel && elements.adminPanel.contains(event.target);
            const isOpenAdminPanelBtn = elements.openAdminPanelBtn && elements.openAdminPanelBtn.contains(event.target);
            const isSavePricesBtn = elements.savePricesBtn && elements.savePricesBtn.contains(event.target);
            const isProductSelect = elements.productSelect && elements.productSelect.contains(event.target);

            if (elements.adminPanel && elements.adminPanel.classList.contains('open') && !isClickInsideAdminPanel && !isOpenAdminPanelBtn && !isSavePricesBtn && !isProductSelect) {
                console.log("DEBUG: Click outside admin panel, closing.");
                closeAdminPanel();
            }

            // Cierre del modal de pago
            const isClickInsidePaymentModal = elements.paymentModal && elements.paymentModal.contains(event.target);
            const isPaymentToggle = elements.paymentMethodToggle && elements.paymentMethodToggle.contains(event.target);
            const isWhatsappPaymentBtn = elements.whatsappPaymentBtn && elements.whatsappPaymentBtn.contains(event.target);
            if (elements.paymentModal && elements.paymentModal.classList.contains('open') && !isClickInsidePaymentModal && !isPaymentToggle && !isWhatsappPaymentBtn) {
                closePaymentModal();
            }
        });

        // Close panels/modals with right-click (contextmenu)
        document.addEventListener('contextmenu', (event) => {
            if (elements.selectionPanel && elements.selectionPanel.classList.contains('open')) {
                event.preventDefault(); // Prevent default browser context menu
                console.log("DEBUG: Right-click on open selection panel, closing.");
                if (elements.selectionPanel) elements.selectionPanel.classList.remove('open');
                elements.selectionPanel.style.display = 'none'; // Explicitly hide
                removeBodyNoScroll();
            }
            if (elements.adminPanel && elements.adminPanel.classList.contains('open')) {
                event.preventDefault(); // Prevent default browser context menu
                console.log("DEBUG: Right-click on open admin panel, closing.");
                closeAdminPanel();
            }
            if (elements.paymentModal && elements.paymentModal.classList.contains('open')) {
                event.preventDefault(); // Prevent default browser context menu
                console.log("DEBUG: Right-click on open payment modal, closing.");
                closePaymentModal();
            }
            if (elements.lightbox && elements.lightbox.classList.contains('open')) {
                event.preventDefault(); // Prevent default browser context menu
                console.log("DEBUG: Right-click on open lightbox, closing.");
                closeLightbox();
            }
        });
        
        // Event listener for the "Download All" button (always active, as it's part of the download section)
        if (elements.downloadAllBtn) elements.downloadAllBtn.addEventListener('click', downloadAllPhotos);
        
        console.log("DEBUG: init() completed and listeners configured.");
    }

    init();
});
