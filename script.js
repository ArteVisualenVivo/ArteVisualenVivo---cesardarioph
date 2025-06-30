document.addEventListener('DOMContentLoaded', () => {
    // --- Configuración Global ---
    const CONFIG = {
        WHATSAPP_NUMBER: '5493512417121',
        PRICE_LOCALE: 'es-AR',
        CURRENCY: 'ARS',
        ITEMS_PER_PAGE: 72,

        // Valores por defecto para los precios de fotos (serán sobrescritos por localStorage)
        // AHORA SON PRECIOS POR TRAMOS (ACTUALIZADOS SEGÚN TU INDICACIÓN)
        PHOTO_PRICE_TIER_1: 3000, // 1 unidad
        PHOTO_PRICE_TIER_2: 2500,  // 2 a 10 unidades
        PHOTO_PRICE_TIER_3: 2225,  // 11 a 20 unidades
        PHOTO_PRICE_TIER_4: 2000,  // 21 o más unidades

        // Alias de Mercado Pago (lo usaremos también para la transferencia bancaria)
        MERCADO_PAGO_ALIAS: 'cesar.dario.ph'
    };

    // Cargar precios de fotos guardados de localStorage al inicio
    function loadPhotoPricesFromLocalStorage() {
        // Cargar los precios de los nuevos tramos
        const savedTier1Price = localStorage.getItem('photoPriceTier1');
        const savedTier2Price = localStorage.getItem('photoPriceTier2');
        const savedTier3Price = localStorage.getItem('photoPriceTier3');
        const savedTier4Price = localStorage.getItem('photoPriceTier4');
        
        // Función auxiliar para parsear y validar precios
        const parseAndValidatePrice = (savedPrice, defaultValue) => {
            const parsedPrice = parseFloat(savedPrice);
            return (!isNaN(parsedPrice) && parsedPrice >= 0) ? parsedPrice : defaultValue;
        };

        CONFIG.PHOTO_PRICE_TIER_1 = parseAndValidatePrice(savedTier1Price, 3000);
        CONFIG.PHOTO_PRICE_TIER_2 = parseAndValidatePrice(savedTier2Price, 2500);
        CONFIG.PHOTO_PRICE_TIER_3 = parseAndValidatePrice(savedTier3Price, 2225);
        CONFIG.PHOTO_PRICE_TIER_4 = parseAndValidatePrice(savedTier4Price, 2000);

        console.log("DEBUG: Precios de fotos por tramos cargados del localStorage:", { 
            tier1: CONFIG.PHOTO_PRICE_TIER_1, 
            tier2: CONFIG.PHOTO_PRICE_TIER_2, 
            tier3: CONFIG.PHOTO_PRICE_TIER_3, 
            tier4: CONFIG.PHOTO_PRICE_TIER_4 
        });
    }
    loadPhotoPricesFromLocalStorage(); // Cargar los precios de fotos al inicio

    // Función para guardar la selección en localStorage
    function saveSelectionToLocalStorage() {
        // Convertir el Map a un Array de pares [key, value] para guardar
        const selectedItemsArray = Array.from(selectedItems.entries());
        localStorage.setItem('selectedItems', JSON.stringify(selectedItemsArray));
        console.log("DEBUG: Selección guardada en localStorage.");
    }

    // Función para cargar la selección de localStorage al inicio
    function loadSelectionFromLocalStorage() {
        const savedItems = localStorage.getItem('selectedItems');
        if (savedItems) {
            try {
                // Convertir el Array de pares [key, value] de nuevo a un Map
                selectedItems = new Map(JSON.parse(savedItems));
                console.log("DEBUG: Selección cargada de localStorage.", selectedItems);
            } catch (e) {
                console.error("ERROR: Fallo al parsear la selección de localStorage. Iniciando con carrito vacío.", e);
                selectedItems = new Map();
            }
        } else {
            selectedItems = new Map();
            console.log("DEBUG: No hay selección guardada en localStorage. Iniciando con carrito vacío.");
        }
    }

    let allPhotos = [];             // Almacena todas las fotos y videos individuales de todos los eventos (con prefijo 'galeria/')
    let galleryFilterOptions = [];  // Almacena las rutas únicas de categorías y subcategorías para el filtro
    let eventPreviews = [];         // Almacena eventos para la sección "Eventos Destacados"
    let allProducts = [];           // Almacena todos los productos de la tienda (de data.json, isProductCategory: true)
    let currentFilteredPhotos = []; // Las fotos/videos actualmente mostrados en la galería (filtrados por evento/subcategoría)
    let currentLightboxItems = [];  // Los ítems (fotos o imágenes de productos) actualmente vistos en el lightbox
    let currentPhotoIndex = 0;      // Índice del ítem actual en el lightbox
    let currentLightboxContext = ''; // 'gallery' o 'product'

    // *** NUEVO: Para la Sección de Descarga del Cliente ***
    let clientDownloadPhotos = []; // Almacena fotos para mostrar en la sección de descarga
    let lastGeneratedDownloadLink = ''; // Para almacenar el enlace generado por el admin para copiar/whatsapp fácilmente

    // *** MAPA ÚNICO PARA EL CARRITO ***
    // La clave es el ID del ítem (prefijado con 'photo_' o 'product_')
    // Para productos, la clave será 'product_PARENT_PRODUCT_ID_IMAGE_ID' para diferenciar variantes.
    // El valor es un objeto { originalProductId: string, type: string, quantity: number, itemData: object, selectedImage?: object }
    let selectedItems = new Map(); // Se inicializa aquí, luego se carga de localStorage

    // --- Referencias a Elementos del DOM ---
    const elements = {
        // Secciones de Contenido Principal (para handleRouting)
        mainContent: document.getElementById('main-content'), // Contenedor para todas las secciones primarias

        // Encabezado y Navegación
        header: document.querySelector('.header'),
        menuToggle: document.querySelector('.menu-toggle'),
        mobileMenu: document.querySelector('.mobile-menu'),
        closeMenuBtn: document.querySelector('.close-menu-btn'),
        mobileNavLinks: document.querySelectorAll('.mobile-nav-list a'),
        navLinks: document.querySelectorAll('.nav-list a'),

        // Secciones Principales
        heroSection: document.getElementById('hero'),
        eventsContainer: document.getElementById('featured-events-container'), // Este es el contenedor, no la sección en sí
        gallerySection: document.getElementById('gallery'),
        photoGrid: document.getElementById('photoGrid'),
        categoryFilter: document.getElementById('categoryFilter'),
        currentEventGalleryTitle: document.getElementById('current-event-gallery-title'),
        featuredProductsGrid: document.getElementById('featuredProductsGrid'),
        servicesSection: document.getElementById('services'), // Referencia a la sección de servicios
        productsSection: document.getElementById('products'),   // Referencia a la sección de productos
        contactSection: document.getElementById('contact'),     // Referencia a la sección de contacto
        aboutSection: document.getElementById('about'), // Referencia a la sección "Quiénes Somos"

        // Pie de página
        footer: document.querySelector('footer'),

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
        selectionIcon: document.querySelector('.selection-icon'),
        selectionCount: document.querySelector('.selection-count'),
        selectionPanel: document.getElementById('selection-panel'),
        closeSelectionPanelBtn: document.getElementById('close-selection-panel-btn'),
        selectedItemsList: document.getElementById('selected-items-list'),
        totalPriceDisplay: document.getElementById('total-price'),
        clearSelectionBtn: document.getElementById('clear-selection-btn'),
        whatsappBtn: document.getElementById('whatsapp-btn'),
        packSummaryMessage: document.getElementById('pack-summary-message'),
        downloadLinkGeneratorBtn: document.getElementById('download-link-generator-btn'),
        whatsappDownloadLinkBtn: document.getElementById('whatsapp-download-link-btn'), // Para el enlace de descarga del carrito

        // Modal de Pago
        paymentModal: document.getElementById('payment-modal'),
        closePaymentModalBtn: document.getElementById('close-payment-modal-btn'),
        paymentTotalAmount: document.getElementById('payment-total-amount'),
        paymentTotalAmountTransfer: document.getElementById('payment-total-amount-transfer'), // Para transferencia bancaria
        whatsappPaymentBtn: document.getElementById('whatsapp-payment-btn'),
        paymentMethodToggle: document.getElementById('payment-method-toggle'), // Alternar método de pago
        mercadoPagoDetails: document.getElementById('mercado-pago-details'),
        bankTransferDetails: document.getElementById('bank-transfer-details'),

        // Notificaciones Toast
        toastNotification: document.getElementById('toastNotification'),

        // Botón Flotante de WhatsApp
        whatsappFloatBtn: document.getElementById('whatsapp-float-btn'),

        // Sección de Descarga (NUEVO)
        downloadSection: document.getElementById('download-section'),
        downloadAllBtn: document.getElementById('download-all-btn'),
        downloadLinksContainer: document.getElementById('download-links-container'),

        // Panel de Administración (NUEVOS elementos para Generación de Enlaces de Descarga)
        adminPanel: document.getElementById('admin-panel'),
        openAdminPanelBtn: document.getElementById('open-admin-panel-btn'), 
        closeAdminPanelBtn: document.getElementById('close-admin-panel-btn'),
        
        // REVISADO: Referencias a los nuevos campos de precios por tramos
        photoPriceTier1Input: document.getElementById('photo-price-tier-1'),
        photoPriceTier2Input: document.getElementById('photo-price-tier-2'),
        photoPriceTier3Input: document.getElementById('photo-price-tier-3'),
        photoPriceTier4Input: document.getElementById('photo-price-tier-4'),
        
        // Botones de guardar precios
        savePhotoPricesBtn: document.getElementById('save-photo-prices-btn'), 
        saveProductPricesBtn: document.getElementById('save-product-prices-btn'), 

        priceUpdateMessage: document.getElementById('price-update-message'), // Mensaje compartido para actualizaciones de precios
        productSelect: document.getElementById('product-select'),
        selectedProductPriceInputContainer: document.getElementById('selected-product-price-input-container'),
        
        // Panel de Administración: Generar Enlace de Descarga por IDs
        adminPhotoIdsInput: document.getElementById('admin-photo-ids-input'),
        generateAdminDownloadLinkBtn: document.getElementById('generate-admin-download-link-btn'),
        generatedDownloadLinkOutput: document.getElementById('generated-download-link-output'),
        copyAdminDownloadLinkBtn: document.getElementById('copy-admin-download-link-btn'),
        whatsappAdminDownloadLinkBtn: document.getElementById('whatsapp-admin-download-link-btn'),
        // Referencia directa al encabezado 'Generar Enlace de Descarga por IDs' usando su ID
        adminGenerateIdsSectionHeader: document.getElementById('admin-generate-link-header')
    };

    // --- Funciones de Utilidad y Marketing Digital ---

    /**
     * Muestra una notificación temporal (toast).
     * @param {string} message - El mensaje a mostrar.
     * @param {string} type - Tipo de mensaje ('success', 'error', 'info').
     */
    function showToast(message, type = 'info') {
        console.log(`DEBUG: showToast llamado con mensaje: "${message}", tipo: "${type}"`);
        if (!elements.toastNotification) {
            console.error("ERROR: No se encontró el elemento de notificación Toast!");
            return;
        }
        elements.toastNotification.textContent = message;
        elements.toastNotification.className = `toast ${type} show`;
        setTimeout(() => {
            elements.toastNotification.classList.remove('show');
        }, 3000);
    }

    /**
     * Formatea un número a un formato de moneda local.
     * @param {number} amount - La cantidad a formatear.
     * @returns {string} - La cantidad formateada como moneda.
     */
    function formatCurrency(amount) {
        return new Intl.NumberFormat(CONFIG.PRICE_LOCALE, {
            style: 'currency',
            currency: CONFIG.CURRENCY,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Calcula el precio total de la selección de fotos y productos.
     * APLICA LA LÓGICA DE PRECIOS POR TRAMOS PARA LAS FOTOS.
     * @returns {{total: number, photoCount: number}} El precio total y el recuento de fotos.
     */
    function calculateTotalPrice() {
        let total = 0;
        let photoCount = 0;

        // Sumar ítems en el carrito
        selectedItems.forEach(itemInCart => {
            if (itemInCart.type === 'photo') {
                photoCount += itemInCart.quantity; // Suma la cantidad REAL de cada foto
            } else if (itemInCart.type === 'product') {
                total += itemInCart.itemData.price * itemInCart.quantity; // Usar el precio actual almacenado en itemData
            }
        });

        // Aplicar lógica de precios por tramos para las fotos
        if (photoCount > 0) {
            let pricePerPhoto = CONFIG.PHOTO_PRICE_TIER_1; // Precio por defecto para 1 foto

            if (photoCount >= 2 && photoCount <= 10) {
                pricePerPhoto = CONFIG.PHOTO_PRICE_TIER_2;
            } else if (photoCount >= 11 && photoCount <= 20) {
                pricePerPhoto = CONFIG.PHOTO_PRICE_TIER_3;
            } else if (photoCount >= 21) {
                pricePerPhoto = CONFIG.PHOTO_PRICE_TIER_4;
            }
            total += photoCount * pricePerPhoto;
        }
        
        return { total, photoCount };
    }

    /**
     * Actualiza la interfaz de usuario del carrito (recuento de ítems, precio total y lista de ítems).
     */
    function updateSelectionUI() {
        // Calcular el número total de ítems (contando cantidades de productos)
        let totalItemsInCart = 0;
        selectedItems.forEach(item => {
            totalItemsInCart += item.quantity;
        });

        if (elements.selectionCount) elements.selectionCount.textContent = totalItemsInCart; // Actualiza el contador del icono del carrito

        // Actualiza la visibilidad del icono del carrito (depende de si hay ítems)
        if (elements.selectionIcon) {
            elements.selectionIcon.style.display = totalItemsInCart > 0 ? 'block' : 'none';
            console.log(`DEBUG: selectionIcon display: ${elements.selectionIcon.style.display}`);
        }
        // El botón de WhatsApp flotante ya no se gestiona aquí, sino en setMainPageDisplay
        // para asegurar que siempre esté visible en la vista principal.


        const { total, photoCount } = calculateTotalPrice(); // Recalcula el total y el recuento de fotos

        if (elements.totalPriceDisplay) elements.totalPriceDisplay.textContent = `Total Estimado: ${formatCurrency(total)}`;
        
        // También actualiza las cantidades en el modal de pago
        if (elements.paymentTotalAmount) elements.paymentTotalAmount.textContent = formatCurrency(total);
        if (elements.paymentTotalAmountTransfer) elements.paymentTotalAmountTransfer.textContent = formatCurrency(total);
        
        renderSelectedItemsInCart(); // Renderiza la lista detallada de ítems en el panel

        // Actualiza el estado de los botones en las cuadrículas (galería y productos)
        updateGridButtonsState();
    }

    /**
     * Actualiza el estado visual (texto, deshabilitado, clase 'selected') de los botones en las tarjetas de galería y productos.
     */
    function updateGridButtonsState() {
        // Para fotos de la galería
        document.querySelectorAll('.photo-card').forEach(card => {
            const id = card.dataset.id;
            const mapKey = 'photo_' + id;
            const selectButton = card.querySelector('.select-button');

            // Verificar si CUALQUIER cantidad de esta foto está en el carrito
            if (selectedItems.has(mapKey) && selectedItems.get(mapKey).quantity > 0) {
                card.classList.add('selected');
                if (selectButton) {
                    selectButton.innerHTML = '<i class="fas fa-check-circle"></i> Seleccionado';
                    selectButton.disabled = true; // Se mantiene deshabilitado para no añadir más desde aquí
                }
            } else {
                card.classList.remove('selected');
                if (selectButton) {
                    selectButton.innerHTML = '<i class="fas fa-plus-circle"></i> Seleccionar';
                    selectButton.disabled = false;
                }
            }
        });

        // Para productos de la tienda
        document.querySelectorAll('.product-card').forEach(card => {
            const id = card.dataset.id;
            // Verificar si CUALQUIERA de las variantes de este producto está en el carrito para la clase 'selected'
            const productHasAnyVariantInCart = Array.from(selectedItems.keys()).some(key => key.startsWith(`product_${id}_`));
            const addToCartBtn = card.querySelector('.add-to-cart-btn');

            if (productHasAnyVariantInCart) {
                card.classList.add('selected');
                if (addToCartBtn) {
                     // Encontrar la cantidad total de este producto (todas sus variantes) en el carrito
                     let totalProductQuantity = 0;
                     selectedItems.forEach(itemInCart => {
                         if (itemInCart.type === 'product' && itemInCart.originalId === id) {
                             totalProductQuantity += itemInCart.quantity;
                         }
                     });

                     // Cambiar el texto del botón para reflejar que está en el carrito y es clicable para añadir más
                     addToCartBtn.innerHTML = `<i class="fas fa-check-circle"></i> Añadido (${totalProductQuantity})`;
                     addToCartBtn.disabled = false; // Mantenerlo habilitado para permitir añadir más
                }
            } else {
                if (addToCartBtn) {
                    addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Añadir';
                    addToCartBtn.disabled = false;
                }
            }
        });

        // Actualiza el botón en el lightbox si está abierto
        if (elements.lightbox && elements.lightbox.classList.contains('open')) {
            const currentItemId = currentLightboxItems[currentPhotoIndex]?.id; // Puede ser ID de foto o ID de imagen de producto
            if (!currentItemId) return;

            if (currentLightboxContext === 'gallery') {
                const mapKey = 'photo_' + currentItemId;
                // Si la foto ya está en el carrito (con cantidad > 0), el botón se deshabilita y cambia el texto
                if (selectedItems.has(mapKey) && selectedItems.get(mapKey).quantity > 0) {
                    if (elements.addToSelectionBtn) {
                        elements.addToSelectionBtn.textContent = 'Ya Seleccionado';
                        elements.addToSelectionBtn.disabled = true;
                        elements.addToSelectionBtn.classList.add('selected');
                    }
                } else {
                    if (elements.addToSelectionBtn) {
                        elements.addToSelectionBtn.textContent = 'Seleccionar para Comprar';
                        elements.addToSelectionBtn.disabled = false;
                        elements.addToSelectionBtn.classList.remove('selected');
                    }
                }
            } else if (currentLightboxContext === 'product') {
                // Para productos en lightbox, el botón se refiere a la variante de imagen específica
                const parentProduct = allProducts.find(p => p.images.some(img => img.id === currentItemId));
                if (!parentProduct) {
                    console.error("No se pudo encontrar el producto padre para la imagen:", currentItemId);
                    return;
                }
                const mapKey = `product_${parentProduct.id}_${currentItemId}`;
                
                if (selectedItems.has(mapKey)) {
                    if (elements.addToSelectionBtn) {
                        elements.addToSelectionBtn.textContent = 'Añadido al Carrito (Cant: ' + selectedItems.get(mapKey).quantity + ')';
                        elements.addToSelectionBtn.disabled = false; // Mantener habilitado para permitir añadir más desde el lightbox también
                        elements.addToSelectionBtn.classList.add('selected');
                    }
                } else {
                    if (elements.addToSelectionBtn) {
                        elements.addToSelectionBtn.textContent = 'Añadir al Carrito';
                        elements.addToSelectionBtn.disabled = false;
                        elements.addToSelectionBtn.classList.remove('selected');
                    }
                }
            }
        }
    }


    /**
     * Renderiza la lista detallada de ítems seleccionados en el panel del carrito.
     */
    function renderSelectedItemsInCart() {
        if (!elements.selectedItemsList || !elements.packSummaryMessage || !elements.downloadLinkGeneratorBtn || !elements.whatsappDownloadLinkBtn) return;

        elements.selectedItemsList.innerHTML = ''; // Limpiar lista existente

        if (selectedItems.size === 0) {
            elements.selectedItemsList.innerHTML = '<li class="empty-selection"><i class="fas fa-shopping-cart"></i><p>Tu selección está vacía.<br>¡Añade fotos o productos!</p></li>';
            // El botón de WhatsApp flotante ya no se gestiona aquí, sino en setMainPageDisplay
            elements.packSummaryMessage.style.display = 'none'; // Ocultar mensaje del paquete
            // Deshabilitar los botones de generación de enlaces de descarga si no hay fotos seleccionadas
            elements.downloadLinkGeneratorBtn.disabled = true; 
            elements.whatsappDownloadLinkBtn.disabled = true;
            return;
        } else {
            // El botón de WhatsApp flotante ya no se gestiona aquí, sino en setMainPageDisplay
            // Verificar si hay fotos en el carrito para habilitar los botones de enlace de descarga
            const hasPhotosInCart = Array.from(selectedItems.values()).some(item => item.type === 'photo' && item.quantity > 0);
            elements.downloadLinkGeneratorBtn.disabled = !hasPhotosInCart;
            elements.whatsappDownloadLinkBtn.disabled = !hasPhotosInCart;
        }

        const selectedPhotosArray = [];
        const selectedProductsArray = [];

        // Clasificar los ítems seleccionados del Mapa
        selectedItems.forEach(itemInCart => {
            if (itemInCart.type === 'photo') {
                selectedPhotosArray.push(itemInCart); // itemInCart ya contiene itemData y quantity
            } else if (itemInCart.type === 'product') {
                selectedProductsArray.push(itemInCart); // itemInCart ya contiene itemData, quantity, y selectedImage
            }
        });

        // --- Renderizar Fotos y Videos seleccionados ---
        if (selectedPhotosArray.length > 0) {
            const photoHeader = document.createElement('li');
            photoHeader.className = 'cart-section-header';
            photoHeader.textContent = 'Fotos y Videos';
            elements.selectedItemsList.appendChild(photoHeader);

            selectedPhotosArray.forEach(itemInCart => {
                const item = itemInCart.itemData; // Datos de la foto
                const listItem = document.createElement('li');
                listItem.className = 'selected-item-card';

                const itemImage = document.createElement('img');
                itemImage.src = item.src; // Ruta completa a la imagen de la galería
                itemImage.alt = item.name || `Foto ${item.id}`;
                itemImage.loading = 'lazy';

                const itemInfo = document.createElement('div');
                itemInfo.className = 'selected-item-info';
                // Mostrar la cantidad actual y el precio total de esa cantidad de fotos
                // AHORA USA EL PRECIO POR TRAMOS PARA MOSTRAR EL PRECIO UNITARIO
                let displayPricePerPhoto = CONFIG.PHOTO_PRICE_TIER_1;
                if (itemInCart.quantity >= 2 && itemInCart.quantity <= 10) {
                    displayPricePerPhoto = CONFIG.PHOTO_PRICE_TIER_2;
                } else if (itemInCart.quantity >= 11 && itemInCart.quantity <= 20) {
                    displayPricePerPhoto = CONFIG.PHOTO_PRICE_TIER_3;
                } else if (itemInCart.quantity >= 21) {
                    displayPricePerPhoto = CONFIG.PHOTO_PRICE_TIER_4;
                }
                itemInfo.innerHTML = `
                    <h5>${item.name || `Foto ${item.id}`}</h5>
                    <p class="item-price">${formatCurrency(displayPricePerPhoto)} c/u</p>
                    <p class="quantity-value">Cantidad: ${itemInCart.quantity}</p> <!-- Mostrar solo la cantidad -->
                `;

                // NO SE RENDERIZAN LOS BOTONES DE CANTIDAD PARA FOTOS
                // const quantityControl = document.createElement('div');
                // quantityControl.className = 'quantity-control';
                // quantityControl.innerHTML = `
                //     <button class="quantity-minus-btn" data-id="${item.id}" data-type="photo">-</button>
                //     <span class="quantity-value">${itemInCart.quantity}</span>
                //     <button class="quantity-plus-btn" data-id="${item.id}" data-type="photo">+</button>
                // `;

                // // Añadir listeners a los botones de cantidad
                // quantityControl.querySelector('.quantity-minus-btn').addEventListener('click', (e) => {
                //     e.stopPropagation(); 
                //     updateItemQuantity(item.id, null, -1, 'photo');
                // });
                // quantityControl.querySelector('.quantity-plus-btn').addEventListener('click', (e) => {
                //     e.stopPropagation(); 
                //     updateItemQuantity(item.id, null, 1, 'photo');
                // });

                const removeButton = document.createElement('button'); // Declarar removeButton aquí
                removeButton.className = 'remove-item-btn';
                removeButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                removeButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeItemFromCart(item.id, 'photo'); 
                    showToast(`"${item.name || `Foto ${item.id}`}" eliminada.`, 'info');
                });

                listItem.appendChild(itemImage);
                listItem.appendChild(itemInfo);
                // listItem.appendChild(quantityControl); // NO SE AÑADE EL CONTROL DE CANTIDAD PARA FOTOS
                listItem.appendChild(removeButton);
                elements.selectedItemsList.appendChild(listItem);
            });
        }

        // --- Renderizar Productos Sublimados seleccionados ---
        if (selectedProductsArray.length > 0) {
            const productHeader = document.createElement('li');
            productHeader.className = 'cart-section-header';
            productHeader.textContent = 'Productos Sublimados';
            elements.selectedItemsList.appendChild(productHeader);

            selectedProductsArray.forEach(itemInCart => {
                const product = itemInCart.itemData; // Datos del producto padre
                const selectedImage = itemInCart.selectedImage; // Imagen sublimada específica
                const listItem = document.createElement('li');
                listItem.className = 'selected-item-card';

                const itemImage = document.createElement('img');
                itemImage.src = selectedImage.src; // Ruta a la imagen sublimada específica (ya completa)
                itemImage.alt = `${product.name} - Modelo ${selectedImage.name || selectedImage.id}`;
                itemImage.loading = 'lazy';

                const itemInfo = document.createElement('div');
                itemInfo.className = 'selected-item-info';
                // Usar el precio actual del producto de itemData para mostrar
                itemInfo.innerHTML = `
                    <h5>${product.name} (${selectedImage.name || `Modelo ${selectedImage.id}`})</h5>
                    <p class="item-price">${formatCurrency(product.price * itemInCart.quantity)}</p>
                `;

                // Controles de cantidad para productos (ESTOS SE MANTIENEN)
                const quantityControl = document.createElement('div');
                quantityControl.className = 'quantity-control';
                quantityControl.innerHTML = `
                    <button class="quantity-minus-btn" data-parent-id="${product.id}" data-image-id="${selectedImage.id}" data-type="product">-</button>
                    <span class="quantity-value">${itemInCart.quantity}</span>
                    <button class="quantity-plus-btn" data-parent-id="${product.id}" data-image-id="${selectedImage.id}" data-type="product">+</button>
                `;
                // Añadir listeners a los botones de cantidad
                quantityControl.querySelector('.quantity-minus-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    updateItemQuantity(product.id, selectedImage.id, -1, 'product');
                });
                quantityControl.querySelector('.quantity-plus-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    updateItemQuantity(product.id, selectedImage.id, 1, 'product');
                });

                const removeButton = document.createElement('button'); // Declarar removeButton aquí también
                removeButton.className = 'remove-item-btn';
                removeButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                removeButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeItemFromCart(product.id, 'product', selectedImage.id); // Pasar ID de producto padre e ID de imagen
                    showToast(`"${product.name} (${selectedImage.name || `Modelo ${selectedImage.id}`})" eliminado.`, 'info');
                });

                listItem.appendChild(itemImage);
                listItem.appendChild(itemInfo);
                listItem.appendChild(quantityControl); 
                listItem.appendChild(removeButton);
                elements.selectedItemsList.appendChild(listItem);
            });
        }

        // Mensaje del paquete de fotos (AHORA SE ADAPTA A LOS TRAMOS)
        const { photoCount } = calculateTotalPrice(); 
        if (photoCount > 0) {
            let message = `Tienes <strong>${photoCount} fotos</strong> seleccionadas.`;
            if (photoCount < 2) {
                message += ` Precio individual: ${formatCurrency(CONFIG.PHOTO_PRICE_TIER_1)}.`;
            } else if (photoCount >= 2 && photoCount <= 10) {
                message += ` Precio por unidad: ${formatCurrency(CONFIG.PHOTO_PRICE_TIER_2)}.`;
            } else if (photoCount >= 11 && photoCount <= 20) {
                message += ` Precio por unidad: ${formatCurrency(CONFIG.PHOTO_PRICE_TIER_3)}.`;
            } else if (photoCount >= 21) {
                message += ` Precio por unidad: ${formatCurrency(CONFIG.PHOTO_PRICE_TIER_4)}.`;
            }
            elements.packSummaryMessage.innerHTML = message;
            elements.packSummaryMessage.style.display = 'block';
        } else {
            elements.packSummaryMessage.style.display = 'none'; 
        }
    }

    /**
     * Añade o actualiza un ítem en el carrito de compras.
     * @param {object} itemData - El objeto completo de la foto o producto.
     * @param {string} type - 'photo' o 'product'.
     * @param {object} [selectedImage=null] - Solo para productos: la imagen sublimada específica.
     */
    function addItemToSelection(itemData, type, selectedImage = null) {
        let mapKey;
        let itemToStore;

        if (type === 'photo') {
            mapKey = 'photo_' + itemData.id;
            if (selectedItems.has(mapKey)) {
                // Si ya existe, incrementar la cantidad
                const existingItem = selectedItems.get(mapKey);
                existingItem.quantity += 1; // Solo se incrementa la cantidad, no se añade un nuevo item
                selectedItems.set(mapKey, existingItem);
                showToast('Cantidad de foto actualizada.', 'success');
            } else {
                // Si es una foto nueva, añadirla con cantidad 1
                itemToStore = {
                    originalId: itemData.id,
                    type: 'photo',
                    quantity: 1, // Cantidad inicial para fotos
                    itemData: itemData // Guarda los datos completos de la foto
                };
                selectedItems.set(mapKey, itemToStore);
                showToast(`"${itemData.name || `Foto ${itemData.id}`}" añadida.`, 'success');
            }
        } else if (type === 'product') {
            // Si no se especifica una imagen, usar la primera por defecto (para clic en la tarjeta principal)
            const targetImage = selectedImage || itemData.images[0];
            if (!targetImage) {
                console.error("Error: Producto sin imágenes o imagen seleccionada inválida.", itemData);
                showToast("Error al añadir el producto. Falta imagen.", 'error');
                return;
            }
            mapKey = `product_${itemData.id}_${targetImage.id}`;
            
            let itemInCart = selectedItems.get(mapKey);
            if (itemInCart) {
                itemInCart.quantity++;
                selectedItems.set(mapKey, itemInCart);
                showToast(`Se agregó una unidad más de "${itemData.name} (Modelo ${targetImage.name || targetImage.id})".`, 'success');
            } else {
                itemToStore = {
                    originalId: itemData.id,
                    type: 'product',
                    quantity: 1,
                    itemData: itemData, // Almacena el objeto completo del producto padre
                    selectedImage: targetImage // Almacena la referencia a la imagen de variante específica
                };
                selectedItems.set(mapKey, itemToStore);
                showToast(`"${itemData.name} (${targetImage.name || `Modelo ${targetImage.id}`})" añadido al carrito.`, 'success');
            }
        } else {
            console.error("Tipo de ítem desconocido:", type);
            return;
        }

        saveSelectionToLocalStorage(); // Guardar la selección después de cada cambio
        updateSelectionUI(); // Actualizar la interfaz de usuario
    }


    /**
     * Actualiza la cantidad de un ítem en el carrito.
     * @param {string} id - El ID del ítem (para fotos: ID de la foto; para productos: ID del producto padre).
     * @param {string | null} imageId - Solo para productos: el ID de la imagen/variante seleccionada.
     * @param {number} change - La cantidad a sumar o restar (-1 o 1).
     * @param {string} itemType - 'photo' o 'product'.
     */
    function updateItemQuantity(id, imageId, change, itemType) {
        let mapKey;
        if (itemType === 'photo') {
            // Para fotos, solo permitimos añadir o eliminar completamente, no cambiar la cantidad aquí.
            // Si se llama con change, significa que se está intentando modificar la cantidad de una foto,
            // lo cual ya no es el comportamiento deseado.
            console.warn("WARN: Intento de modificar la cantidad de una foto digital. Esto ya no es compatible a través de los botones +/-.");
            return; // Salir de la función para fotos
        } else if (itemType === 'product') {
            mapKey = `product_${id}_${imageId}`;
        } else {
            console.error("Tipo de ítem desconocido:", itemType);
            return;
        }

        if (selectedItems.has(mapKey)) {
            const itemInCart = selectedItems.get(mapKey);
            itemInCart.quantity += change;

            if (itemInCart.quantity <= 0) {
                // Si la cantidad llega a 0 o menos, eliminar el ítem del carrito
                selectedItems.delete(mapKey);
                showToast('Item eliminado del carrito.', 'info');
            } else {
                selectedItems.set(mapKey, itemInCart);
                showToast(`Cantidad de ${itemType} actualizada.`, 'success');
            }
            saveSelectionToLocalStorage(); // Guardar la selección después de cada cambio
            updateSelectionUI();
        } else {
            console.warn(`Intento de actualizar cantidad de ítem no existente: ${mapKey}`);
        }
    }

    /**
     * Elimina un ítem completamente del carrito.
     * @param {string} originalId - El ID original del ítem (foto) o el ID del producto padre (producto).
     * @param {string} type - 'photo' o 'product'.
     * @param {string} [imageId=null] - Solo para productos: El ID de la imagen específica a eliminar.
     */
    function removeItemFromCart(originalId, type, imageId = null) {
        let mapKey;
        if (type === 'photo') {
            mapKey = 'photo_' + originalId;
        } else if (type === 'product') {
            mapKey = `product_${originalId}_${imageId}`;
        } else {
            console.error("Tipo de ítem desconocido para eliminar:", type);
            return;
        }
        
        selectedItems.delete(mapKey);
        saveSelectionToLocalStorage(); // Guardar la selección después de cada cambio
        updateSelectionUI(); // Esto actualizará los estados de los botones
    }

    /**
     * Vacía toda la selección del carrito.
     */
    function clearSelection() {
        selectedItems.clear(); // Vacía todo el Mapa
        saveSelectionToLocalStorage(); // Guardar la selección después de vaciar
        updateSelectionUI(); // Esto actualizará los estados de los botones
        showToast('Tu selección ha sido vaciada.', 'info');
        // Ya no se cierra explícitamente paymentModal aquí. Debe ser cerrado por acción del usuario.
    }

    /**
     * Abre el lightbox con la foto o video especificado.
     * @param {object} item - El objeto foto, video o producto.
     * @param {number} currentIndex - El índice del ítem actual en la lista filtrada (para fotos/videos) o imagen (para productos).
     * @param {string} context - 'gallery' o 'product'.
     */
    function openLightbox(item, currentIndex, context = 'gallery') {
        console.log("DEBUG: openLightbox llamado con item:", item, "index:", currentIndex, "context:", context);
        if (!elements.lightboxImage || !elements.lightboxVideo || !elements.lightboxCaption || !elements.addToSelectionBtn || !elements.lightbox) {
            console.error("ERROR: Uno o más elementos del lightbox no encontrados.");
            return;
        }

        elements.lightboxImage.style.display = 'none';
        elements.lightboxVideo.style.display = 'none';

        currentLightboxContext = context;
        currentPhotoIndex = currentIndex;

        if (context === 'gallery') {
            currentLightboxItems = currentFilteredPhotos; // Fotos del evento actual
            if (item.type === 'image') {
                elements.lightboxImage.src = item.src; // Ruta completa ya desde allPhotos
                elements.lightboxImage.style.display = 'block';
                console.log(`DEBUG: Lightbox foto: ${item.src}`);
            } else if (item.type === 'video') {
                elements.lightboxVideo.src = item.src; // Ruta completa ya
                elements.lightboxVideo.controls = true; // Asegura que los controles sean visibles para el video
                elements.lightboxVideo.autoplay = false; // No reproducir automáticamente al abrir
                elements.lightboxVideo.loop = true;
                elements.lightboxVideo.muted = true;
                elements.lightboxVideo.preload = 'metadata';
                elements.lightboxVideo.playsInline = true;
                elements.lightboxVideo.style.display = 'block';
                console.log(`DEBUG: Lightbox video: ${item.src}`);
            }
            elements.lightboxCaption.textContent = item.name || `Foto ${item.id}`;
            
            // Botón de selección para fotos de galería
            elements.addToSelectionBtn.style.display = 'inline-block';
            const mapKey = 'photo_' + item.id;
            // Si la foto ya está en el carrito (con cantidad > 0), el botón se deshabilita y cambia el texto
            if (selectedItems.has(mapKey) && selectedItems.get(mapKey).quantity > 0) {
                elements.addToSelectionBtn.textContent = 'Ya Seleccionado';
                elements.addToSelectionBtn.disabled = true;
                elements.addToSelectionBtn.classList.add('selected');
            } else {
                elements.addToSelectionBtn.textContent = 'Seleccionar para Comprar';
                elements.addToSelectionBtn.disabled = false;
                elements.addToSelectionBtn.classList.remove('selected');
            }
            elements.addToSelectionBtn.onclick = () => {
                addItemToSelection(item, 'photo'); // Pasar el objeto foto completo
            };

        } else if (context === 'product') {
            // 'item' aquí es el objeto del producto padre (ej. {id: 'prod_taza_01', name: 'Taza', images: [...])
            currentLightboxItems = item.images; // currentLightboxItems son ahora las imágenes de ESTE producto
            if (item.images && item.images.length > 0) {
                 // Asegurar que la ruta de la imagen sea correcta para el lightbox del producto
                elements.lightboxImage.src = item.images[currentPhotoIndex].src; // Ruta completa ya
                elements.lightboxImage.style.display = 'block';
                console.log(`DEBUG: Lightbox producto: ${item.images[currentPhotoIndex].src}`);
            }
            elements.lightboxCaption.textContent = item.name; // Nombre del producto principal

            // Botón de selección para productos: añadir la VARIANTE ESPECÍFICA que se está viendo
            elements.addToSelectionBtn.style.display = 'inline-block';
            const currentProductImageVariant = currentLightboxItems[currentPhotoIndex];
            const mapKey = `product_${item.id}_${currentProductImageVariant.id}`;
            
            if (selectedItems.has(mapKey)) {
                elements.addToSelectionBtn.textContent = 'Añadido al Carrito (Cant: ' + selectedItems.get(mapKey).quantity + ')';
                elements.addToSelectionBtn.disabled = false; // Mantener habilitado para permitir añadir más desde el lightbox también
                elements.addToSelectionBtn.classList.add('selected');
            } else {
                elements.addToSelectionBtn.textContent = 'Añadir al Carrito';
                elements.addToSelectionBtn.disabled = false;
                elements.addToSelectionBtn.classList.remove('selected');
            }
            elements.addToSelectionBtn.onclick = () => {
                addItemToSelection(item, 'product', currentProductImageVariant); // Pasar el producto padre y la imagen específica
            };
        }

        elements.lightbox.classList.add('open');
        setBodyNoScroll();
    }

    /**
     * Cierra el lightbox.
     */
    function closeLightbox() {
        if (!elements.lightbox || !elements.lightboxVideo) return;
        elements.lightbox.classList.remove('open');
        elements.lightboxVideo.pause();
        elements.lightboxVideo.removeAttribute('src'); // Limpia la fuente del video
        removeBodyNoScroll();
        updateGridButtonsState(); // Actualiza los estados de los botones cuando se cierra el lightbox
    }

    /**
     * Navega por el lightbox (imagen siguiente/anterior).
     * @param {number} direction - -1 para anterior, 1 para siguiente.
     */
    function navigateLightbox(direction) {
        if (!elements.lightboxImage || !elements.lightboxVideo || !elements.lightboxCaption || !elements.addToSelectionBtn) return;
        let newIndex = currentPhotoIndex + direction;

        if (!currentLightboxItems || currentLightboxItems.length === 0) return;

        if (newIndex < 0) {
            newIndex = currentLightboxItems.length - 1;
        } else if (newIndex >= currentLightboxItems.length) {
            newIndex = 0;
        }
        
        currentPhotoIndex = newIndex; // Actualizar índice global
        const newItem = currentLightboxItems[currentPhotoIndex]; // Ítem actual (foto o imagen de producto)

        // Renderizar contenido del lightbox (imagen/video)
        if (currentLightboxContext === 'gallery' && newItem.type === 'video') {
            elements.lightboxVideo.src = newItem.src; // Ruta completa ya
            elements.lightboxVideo.controls = true; // Asegura que los controles sean visibles para el video
            elements.lightboxVideo.autoplay = false; // No reproducir automáticamente al abrir
            elements.lightboxVideo.loop = true;
            elements.lightboxVideo.muted = true;
            elements.lightboxVideo.preload = 'auto';
            elements.lightboxVideo.playsInline = true;
            elements.lightboxVideo.style.display = 'block';
            elements.lightboxImage.style.display = 'none';
            console.log(`DEBUG: Navegando Lightbox video a: ${newItem.src}`);
        } else {
            elements.lightboxImage.src = newItem.src; // Ruta completa ya
            elements.lightboxImage.style.display = 'block';
            elements.lightboxVideo.style.display = 'none';
            elements.lightboxVideo.pause();
            elements.lightboxVideo.removeAttribute('src');
            console.log(`DEBUG: Navegando Lightbox imagen a: ${newItem.src}`);
        }
        
        // Actualizar título del lightbox (caption)
        if (currentLightboxContext === 'gallery') {
            elements.lightboxCaption.textContent = newItem.name || `Foto ${newItem.id}`;
        } else if (currentLightboxContext === 'product') {
             // El título ya debería ser el nombre del producto padre, no la imagen individual.
             // Mantener el título existente para el producto.
        }

        // Actualizar estado del botón "Seleccionar para Comprar/Añadir al Carrito"
        if (currentLightboxContext === 'gallery') {
            const mapKey = 'photo_' + newItem.id;
            // Si la foto ya está en el carrito (con cantidad > 0), el botón se deshabilita y cambia el texto
            if (selectedItems.has(mapKey) && selectedItems.get(mapKey).quantity > 0) {
                elements.addToSelectionBtn.textContent = 'Ya Seleccionado';
                elements.addToSelectionBtn.disabled = true;
                elements.addToSelectionBtn.classList.add('selected');
            } else {
                elements.addToSelectionBtn.textContent = 'Seleccionar para Comprar';
                elements.addToSelectionBtn.disabled = false;
                elements.addToSelectionBtn.classList.remove('selected');
            }
            elements.addToSelectionBtn.onclick = () => {
                addItemToSelection(newItem, 'photo'); // Pasar el objeto foto completo
            };
        } else if (currentLightboxContext === 'product') {
            // El botón de añadir al carrito en el lightbox del producto se refiere a la variante de imagen específica
            // Necesitamos el ID del producto padre para construir la clave del mapa.
            // currentLightboxItems[0] debería ser una imagen del producto original.
            const productParent = allProducts.find(p => p.images.some(img => img.id === currentLightboxItems[0].id));
            if (!productParent) {
                 console.error("No se pudo encontrar el producto padre para la navegación de imagen del lightbox.");
                 return;
            }
            const currentProductImageVariant = newItem; // newItem es la imagen que se está viendo
            const mapKey = `product_${productParent.id}_${currentProductImageVariant.id}`;
            
            if (selectedItems.has(mapKey)) {
                elements.addToSelectionBtn.textContent = 'Añadido al Carrito (Cant: ' + selectedItems.get(mapKey).quantity + ')';
                elements.addToSelectionBtn.disabled = false; // Mantener habilitado para permitir añadir más desde el lightbox también
                elements.addToSelectionBtn.classList.add('selected');
            } else {
                elements.addToSelectionBtn.textContent = 'Añadir al Carrito';
                elements.addToSelectionBtn.disabled = false;
                elements.addToSelectionBtn.classList.remove('selected');
            }
            elements.addToSelectionBtn.onclick = () => {
                addItemToSelection(productParent, 'product', currentProductImageVariant); // Pasar el producto padre y la imagen específica
            };
        }
    }


    /**
     * Genera el mensaje de WhatsApp con el resumen del pedido.
     * @returns {string} La URL de WhatsApp.
     */
    function generateWhatsAppMessage() {
        const { total, photoCount } = calculateTotalPrice();
        let message = `¡Hola! Me gustaría hacer un pedido desde tu web ArteVisualenVivo.\n\n`;

        let photosAddedSection = false;
        let productsAddedSection = false;

        // Iterar sobre los ítems seleccionados en el Mapa
        selectedItems.forEach(itemInCart => {
            if (itemInCart.type === 'photo') {
                if (!photosAddedSection) {
                    message += `📸 Fotos y Videos (${photoCount} unidades):\n`;
                    photosAddedSection = true;
                }
                // Incluir la cantidad de cada foto
                message += `- ${itemInCart.quantity}x ${itemInCart.itemData.name || `Foto ${itemInCart.originalId}`} (Evento: ${itemInCart.itemData.eventName || 'N/A'}, ID: ${itemInCart.originalId})\n`;
            } else if (itemInCart.type === 'product') {
                if (!productsAddedSection) {
                    message += `📦 Productos Sublimados:\n`;
                    productsAddedSection = true;
                }
                const productName = itemInCart.itemData.name;
                const imageModelName = itemInCart.selectedImage.name || `Modelo ${itemInCart.selectedImage.id}`;
                // Usar el precio actual del producto de itemData para el mensaje
                message += `- ${itemInCart.quantity}x ${productName} (${imageModelName}) (${formatCurrency(itemInCart.itemData.price || 0)})\n`; 
            }
        });
        
        message += `\n`; // Añadir una línea en blanco después de los ítems para mayor legibilidad

        message += `💵 *Total Estimado*: ${formatCurrency(total)}\n\n`;
        message += `¡Espero tu confirmación para coordinar el pago y la entrega/envío de mis artículos!`;

        return encodeURIComponent(message);
    }

    /**
     * Genera un mensaje de WhatsApp para notificación de pago.
     * Este mensaje *también* incluye un enlace especial para que el administrador genere fácilmente enlaces de descarga.
     * @returns {string} La URL de WhatsApp.
     */
    function generatePaymentWhatsAppUrl() {
        const { total } = calculateTotalPrice();
        let message = `¡Hola! Acabo de realizar el pago de ${formatCurrency(total)} por mi pedido de ArteVisualenVivo.`;

        let photosIncluded = false;
        let productsIncluded = false;
        let photoIdsForAdminLink = []; // Recopilar IDs de fotos para el enlace especial del administrador

        selectedItems.forEach(itemInCart => {
            if (itemInCart.type === 'photo') {
                if (!photosIncluded) {
                    message += `\n\nMis fotos seleccionadas son (IDs): `;
                    photosIncluded = true;
                }
                // Incluir la cantidad de cada foto en el mensaje
                message += `${itemInCart.originalId} (x${itemInCart.quantity}), `;
                photoIdsForAdminLink.push(itemInCart.originalId); // Añadir a los IDs del enlace de administrador
            } else if (itemInCart.type === 'product') {
                if (!productsIncluded) {
                    message += `\n\nMis productos seleccionados son: `;
                    productsIncluded = true;
                }
                const productName = itemInCart.itemData.name;
                const imageModelName = itemInCart.selectedImage.name || `Modelo ${itemInCart.selectedImage.id}`;
                message += `${productName} (${imageModelName}) (x${itemInCart.quantity}), `;
            }
        });

        // Limpiar la coma y el espacio finales si hay ítems
        if (photosIncluded || productsIncluded) {
            message = message.slice(0, -2) + '.'; // Eliminar la última ', ' y añadir un '.'
        }

        // --- INICIO DEL CAMBIO PARA SIMPLIFICAR EL ENVÍO DEL LINK ---
        // Si hay fotos seleccionadas, añadir el enlace de descarga directamente en el mensaje
        if (photoIdsForAdminLink.length > 0) {
            const downloadLinkForClient = generateDownloadUrlFromIds(photoIdsForAdminLink.join(','), 'download');
            message += `\n\n*Link de descarga para el cliente:*\n${downloadLinkForClient}`;
        }
        // --- FIN DEL CAMBIO ---

        message += `\n\nEspero tus instrucciones para recibir los archivos/productos. ¡Gracias!`;

        return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    }


    // --- Renderizado de Contenido Dinámico ---

    /**
     * Renderiza la cuadrícula de fotos/videos de la galería.
     * @param {HTMLElement} container - El contenedor donde se renderizan los ítems.
     * @param {Array<object>} itemsToRender - Array de ítems (fotos/videos).
     */
    function renderGalleryGrid(container, itemsToRender) {
        if (!container) return;

        container.innerHTML = '';
        if (itemsToRender.length === 0) {
            container.innerHTML = '<p class="event-placeholder">No hay fotos ni videos para este evento aún. ¡Pronto subiremos más!</p>';
            return;
        }

        itemsToRender.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'photo-card';
            card.dataset.id = item.id; // ID del ítem original
            card.dataset.type = 'photo'; // Tipo para identificar en el DOM

            // Verificar si la foto está seleccionada para actualizar la clase CSS
            if (selectedItems.has('photo_' + item.id) && selectedItems.get('photo_' + item.id).quantity > 0) {
                card.classList.add('selected');
            }

            // Crear elemento de imagen/video
            let mediaElement;
            if (item.type === 'video') {
                mediaElement = document.createElement('video');
                mediaElement.src = item.src; // Ruta completa ya (con galeria/ prefijo)
                mediaElement.controls = false;
                mediaElement.autoplay = false;
                mediaElement.loop = true;
                mediaElement.muted = true;
                mediaElement.preload = 'metadata';
                mediaElement.playsInline = true;
                card.appendChild(mediaElement);

                const videoIcon = document.createElement('i');
                videoIcon.className = 'fas fa-video video-icon';
                card.appendChild(videoIcon);
                console.log(`DEBUG: Renderizando video de galería: ${item.src}`);
            } else { // type === 'image'
                mediaElement = document.createElement('img');
                mediaElement.src = item.src; // Ruta completa ya (con galeria/ prefijo)
                mediaElement.alt = item.name || `Foto ${item.id}`;
                mediaElement.loading = 'lazy';
                card.appendChild(mediaElement);
                console.log(`DEBUG: Renderizando imagen de galería: ${item.src}`);
            }

            const overlay = document.createElement('div');
            overlay.className = 'photo-card-overlay';
            overlay.innerHTML = `<span class="photo-title">${item.name || `Foto ${item.id}`}</span>`;
            card.appendChild(overlay);

            const selectButton = document.createElement('button');
            selectButton.className = 'select-button';
            // Actualizar texto y estado del botón según si está en el carrito
            if (selectedItems.has('photo_' + item.id) && selectedItems.get('photo_' + item.id).quantity > 0) {
                selectButton.innerHTML = '<i class="fas fa-check-circle"></i> Seleccionado';
                selectButton.disabled = true; // Se mantiene deshabilitado para no añadir más desde aquí
            } else {
                selectButton.innerHTML = '<i class="fas fa-plus-circle"></i> Seleccionar';
                selectButton.disabled = false;
            }
            overlay.appendChild(selectButton);

            // Listener para toda la tarjeta (excluyendo el botón de seleccionar) para abrir el lightbox
            card.addEventListener('click', (e) => {
                console.log(`DEBUG: Clic en photo-card. Target:`, e.target, `Es select button?`, e.target.closest('.select-button'));
                // Si el clic NO fue en el botón de seleccionar, abrir el lightbox
                if (e.target && !e.target.closest('.select-button')) {
                    console.log("DEBUG: Abriendo lightbox desde photo-card.");
                    openLightbox(item, index, 'gallery');
                } else {
                    console.log("DEBUG: Clic en photo-card ignorado (fue en select-button).");
                }
            });

            // Listener para el botón de seleccionar en sí
            selectButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Esto es crucial para evitar que el clic de la tarjeta se dispare
                console.log("DEBUG: Clic en botón 'Seleccionar' de photo-card.");
                addItemToSelection(item, 'photo'); // Llamar a addItemToSelection para añadir/eliminar foto
            });

            container.appendChild(card);
        });
    }

    /**
     * Renderiza la cuadrícula de productos para la sección de la tienda.
     * @param {HTMLElement} container - El contenedor donde se renderizan los productos.
     * @param {Array<object>} productsToRender - Array de objetos de producto.
     */
    function renderGridForProducts(container, productsToRender) {
        if (!container) return;

        container.innerHTML = '';
        if (productsToRender.length === 0) {
            container.innerHTML = '<p class="event-placeholder">¡Pronto tendremos más productos increíbles para ti! Vuelve pronto.</p>';
            return;
        }

        productsToRender.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.id = product.id; // ID del producto original
            card.dataset.type = 'product'; // Tipo para identificar en el DOM

            // Verificar si el producto (la primera variante por defecto) está en el carrito para la clase 'selected'
            const productHasAnyVariantInCart = Array.from(selectedItems.keys()).some(key => key.startsWith(`product_${product.id}_`));
            if (productHasAnyVariantInCart) { 
                card.classList.add('selected');
            }

            // Usar la primera imagen del producto como miniatura, asegurando la ruta correcta
            const firstImageSrc = product.images && product.images.length > 0 
                ? product.images[0].src 
                : 'https://placehold.co/400x300/cccccc/333333?text=Sin+Imagen';

            card.innerHTML = `
                <img src="${firstImageSrc}" alt="${product.name}" loading="lazy">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-price">${formatCurrency(product.price || 0)}</p>
                    <button class="add-to-cart-btn"></button>
                </div>
            `;
            console.log(`DEBUG: Renderizando producto: ${firstImageSrc}`);

            const addToCartBtn = card.querySelector('.add-to-cart-btn');
            // Actualizar texto y estado del botón según si la primera variante está en el carrito
            if (productHasAnyVariantInCart) { // Check if ANY variant is in cart
                // Find the total quantity of this product (all its variants) in the cart
                let totalProductQuantity = 0;
                selectedItems.forEach(itemInCart => {
                    if (itemInCart.type === 'product' && itemInCart.originalId === product.id) {
                        totalProductQuantity += itemInCart.quantity;
                    }
                });
                if (addToCartBtn) {
                    addToCartBtn.innerHTML = `<i class="fas fa-check-circle"></i> Añadido (${totalProductQuantity})`;
                    addToCartBtn.disabled = false; // Keep enabled to allow adding more
                }
            } else {
                if (addToCartBtn) {
                    addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Añadir';
                    addToCartBtn.disabled = false;
                }
            }

            if (addToCartBtn) {
                addToCartBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent button click from also opening lightbox
                    console.log("DEBUG: Clic en botón 'Añadir al Carrito' de product-card.");
                    // Add the FIRST variant of the product to the cart
                    addItemToSelection(product, 'product', product.images[0]); 
                });
            }
            
            // Click listener for the entire product card (excluding the button)
            card.addEventListener('click', (e) => {
                console.log(`DEBUG: Click en product-card. Target:`, e.target, `Is add-to-cart button?`, e.target.closest('.add-to-cart-btn'));
                // If the click was NOT on the "Add to Cart" button, open the lightbox
                if (e.target && !e.target.closest('.add-to-cart-btn')) {
                    console.log("DEBUG: Abriendo lightbox desde product-card.");
                    openLightbox(product, 0, 'product'); 
                } else {
                    console.log("DEBUG: Clic en product-card ignorado (fue en add-to-cart-btn).");
                }
            });

            container.appendChild(card);
        });
    }

    /**
     * Renderiza las tarjetas de vista previa de eventos en la sección "Eventos Destacados".
     * @param {Array<object>} events - Array de objetos de evento.
     */
    function renderEventPreviews(events) {
        if (!elements.eventsContainer) {
            console.error("ERROR: El contenedor de eventos destacados no fue encontrado.");
            return;
        }
        elements.eventsContainer.innerHTML = ''; // Limpiar contenedor
        if (events.length === 0) {
            elements.eventsContainer.innerHTML = '<p class="event-placeholder">No hay eventos destacados disponibles.</p>';
            console.log("DEBUG: No hay eventos destacados para renderizar.");
            return;
        }

        events.forEach(event => {
            // Asegurarse de que solo se tomen categorías que no sean de productos
            if (event.isProductCategory) {
                console.log(`DEBUG: Saltando categoría de producto en vista previa de eventos: ${event.name}`);
                return; 
            }

            // firstImage.src ya debería venir con el prefijo 'galeria/' desde loadDataFromJSON
            const firstImage = event.content && event.content.find(item => item.type === 'image'); // Encontrar la primera imagen del evento
            if (!firstImage) {
                console.warn(`WARN: El evento "${event.name}" no tiene imágenes para la vista previa.`);
                return; // Si no hay imágenes en el evento, no renderizar la tarjeta
            }

            const eventCard = document.createElement('div');
            eventCard.classList.add('event-card');
            eventCard.dataset.eventName = event.name;

            const imageUrl = firstImage.src; // Aquí, firstImage.src ya debería tener el prefijo 'galeria/'
            eventCard.innerHTML = `
                <img src="${imageUrl}" alt="Portada de ${event.name}" class="event-card-img">
                <div class="event-card-info">
                    <h3>${event.name}</h3>
                    <p>${event.content.length} fotos/videos</p>
                    <button class="btn btn-secondary view-event-btn">Ver Galería</button>
                </div>
            `;
            elements.eventsContainer.appendChild(eventCard);
            console.log(`DEBUG: Renderizando vista previa de evento: ${imageUrl} con botón "Ver Galería".`);


            // Añadir listener al botón "Ver Galería"
            const viewEventBtn = eventCard.querySelector('.view-event-btn');
            if (viewEventBtn) {
                viewEventBtn.addEventListener('click', () => {
                    console.log(`DEBUG: Clic en botón "Ver Galería" para el evento: ${event.name}`);
                    filterGalleryByCategory(event.name); // Usar el nombre de la categoría principal
                    if (elements.gallerySection) elements.gallerySection.style.display = 'block'; // Hacer visible la galería
                    if (elements.categoryFilter) elements.categoryFilter.value = event.name;
                    if (elements.gallerySection) elements.gallerySection.scrollIntoView({ behavior: 'smooth' });
                });
            } else {
                console.warn(`WARN: Botón "Ver Galería" no encontrado para el evento: ${event.name}`);
            }
        });
    }

    /**
     * Rellena el menú desplegable de filtro de categorías con nombres de eventos y subcategorías.
     */
    function populateCategoryFilter() {
        if (!elements.categoryFilter) return;
        // Guardar la opción "Todas las Fotos de Eventos"
        const allOption = elements.categoryFilter.querySelector('option[value="all"]');
        elements.categoryFilter.innerHTML = ''; // Limpiar opciones existentes
        if (allOption) elements.categoryFilter.appendChild(allOption); // Añadir "Todas" de nuevo

        // Ordenar las opciones de filtro alfabéticamente
        const sortedFilterOptions = [...galleryFilterOptions].sort((a, b) => {
            // Manejar el caso de "tienda-productos" para que aparezca al final o no aparezca en el filtro de galería
            if (a.includes('tienda-productos')) return 1;
            if (b.includes('tienda-productos')) return -1;
            return a.localeCompare(b);
        });

        sortedFilterOptions.forEach(path => {
            // Excluir la categoría 'tienda-productos' del filtro de galería si aparece
            if (path.includes('tienda-productos')) {
                return;
            }

            const option = document.createElement('option');
            option.value = path;
            // Formatear el texto para mostrar la jerarquía (ej. "15años / Magdalena")
            option.textContent = path.split('/').map(segment => {
                // Capitalizar la primera letra de cada segmento
                return segment.charAt(0).toUpperCase() + segment.slice(1);
            }).join(' / ');
            elements.categoryFilter.appendChild(option);
        });
    }

    /**
     * Aplica el filtro de categoría a la galería de fotos.
     * @param {string} selectedPath - La ruta de la categoría o subcategoría a filtrar ('all' para todas).
     */
    function filterGalleryByCategory(selectedPath) {
        console.log(`DEBUG: filterGalleryByCategory llamado con ruta: ${selectedPath}`);
        if (!elements.photoGrid || !elements.currentEventGalleryTitle) return;
        
        // Asegurarse de que la sección de la galería esté visible cuando se filtra
        if (elements.gallerySection) {
            elements.gallerySection.style.display = 'block';
        }

        if (selectedPath === 'all') {
            currentFilteredPhotos = [...allPhotos]; // Mostrar todas las fotos
            elements.currentEventGalleryTitle.textContent = 'Todas las Fotos de Eventos';
        } else {
            // Filtrar allPhotos por la ruta seleccionada
            currentFilteredPhotos = allPhotos.filter(photo => {
                // La ruta de la foto debe comenzar con 'galeria/' + selectedPath
                return photo.src.startsWith(`galeria/${selectedPath}/`) || photo.src === `galeria/${selectedPath}`;
            });
            // Formatear el título de la galería
            elements.currentEventGalleryTitle.textContent = `Fotos de: ${selectedPath.split('/').map(segment => {
                return segment.charAt(0).toUpperCase() + segment.slice(1);
            }).join(' / ')}`;
        }
        renderGalleryGrid(elements.photoGrid, currentFilteredPhotos); // Usar renderGalleryGrid para fotos/videos
        updateGridButtonsState(); // Actualizar los estados de los botones después de renderizar
    }

    // --- Carga de Datos ---
    /**
     * Carga datos de galería y productos desde `data.json`.
     */
    async function loadDataFromJSON() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("DEBUG: data.json loaded successfully.", data);

            // Restablecer arrays para evitar duplicados en recargas
            allPhotos = [];
            eventPreviews = [];
            allProducts = [];
            galleryFilterOptions = new Set(); // Usar un Set para asegurar opciones únicas

            // Procesar datos cargados para separar eventos y productos
            data.forEach(category => {
                if (category.isProductCategory) {
                    // Procesar productos
                    allProducts = category.products.map(p => {
                        const processedImages = p.images.map(img => ({
                            ...img,
                            // CORRECCIÓN DEFINITIVA AQUÍ:
                            // La propiedad 'src' en data.json para los productos ya incluye la ruta completa desde 'tienda-productos/'
                            // Por lo tanto, solo necesitamos anteponer 'galeria/'.
                            src: `galeria/${img.src}`, 
                            name: img.name || img.src.split(/[\/\\]/).pop().split('.')[0]
                        }));

                        // Load saved price from localStorage for this specific product
                        // If no price saved, use price from data.json or a default
                        const savedPrice = localStorage.getItem(`productPrice_${p.id}`);
                        const finalPrice = savedPrice !== null ? parseFloat(savedPrice) : (p.price || 1500); 

                        return {
                            ...p,
                            price: finalPrice, // Use loaded or default price
                            images: processedImages, // Array of images with full paths
                            // Main product 'src' for the card (first image)
                            src: processedImages.length > 0 ? processedImages[0].src : 'https://placehold.co/400x300/cccccc/333333?text=No+Imagen'
                        };
                    });
                    console.log("DEBUG: allProducts processed with paths:", allProducts.map(p => p.images[0]?.src || 'N/A')); // Added for debugging
                } else {
                    // Process event content to add 'galeria/' prefix and populate filter options
                    const processedEventContent = category.content.map(item => ({
                        ...item,
                        src: `galeria/${item.src}`, // PREPEND 'galeria/' for event content
                        name: item.name || item.src.split(/[\/\\]/).pop().split('.')[0]
                    }));

                    // Add top-level category to filter options
                    galleryFilterOptions.add(category.name);

                    // Iterate through processed content to extract subcategory paths
                    processedEventContent.forEach(item => {
                        allPhotos.push({
                            ...item,
                            eventName: category.name // Keep top-level event name for general reference
                        });

                        // Extract directory path from item.src (e.g., '15años/magdalena')
                        const relativePath = item.src.substring('galeria/'.length); // Remove 'galeria/' prefix
                        const pathSegments = relativePath.split('/');
                        if (pathSegments.length > 1) {
                            // Reconstruct path up to the directory name (excluding filename)
                            const dirPath = pathSegments.slice(0, -1).join('/');
                            galleryFilterOptions.add(dirPath); // Add subcategory path
                        }
                    });
                    
                    // Add to eventPreviews the category object with processed content
                    eventPreviews.push({
                        ...category,
                        content: processedEventContent // Use processed content for previews
                    }); 
                }
            });

            allPhotos.sort((a, b) => a.src.localeCompare(b.src)); // Sort gallery photos
            console.log("DEBUG: allPhotos processed and sorted.", allPhotos);
            console.log("DEBUG: IDs de todas las fotos disponibles (allPhotos):", allPhotos.map(p => p.id)); // NUEVO: IDs de todas las fotos cargadas
            console.log("DEBUG: allProducts processed.", allProducts);
            console.log("DEBUG: galleryFilterOptions (Set):", galleryFilterOptions); // Debugging the new filter options

            // Initial rendering of main page content
            renderEventPreviews(eventPreviews); 
            populateCategoryFilter();
            // REMOVED: elements.gallerySection.style.display = 'block'; // Gallery starts hidden
            // REMOVED: filterGalleryByCategory('all'); // Gallery starts hidden, no initial filter
            renderGridForProducts(elements.featuredProductsGrid, allProducts);
            updateSelectionUI(); // Ensure cart updates and buttons reflect status

        } catch (error) {
            console.error("Critical error loading or processing data.json:", error);
            showToast("Critical error loading gallery. Please contact support.", 'error');
            // Ensure error messages are displayed even if elements are null due to download mode
            if (elements.eventsContainer) elements.eventsContainer.innerHTML = '<p class="event-placeholder">Sorry! There was a problem loading events. Please try again later.</p>';
            if (elements.featuredProductsGrid) elements.featuredProductsGrid.innerHTML = '<p class="event-placeholder">Sorry! There was a problem loading products. Please try again later.</p>';
            if (elements.gallerySection) elements.gallerySection.style.display = 'none'; // Hide if failed
        }
    }

    // --- Funciones del Panel de Administración ---

    /**
     * Rellena el menú desplegable de selección de productos en el panel de administración.
     */
    function populateProductSelect() {
        if (!elements.productSelect) return;

        elements.productSelect.innerHTML = '<option value="">-- Selecciona un producto --</option>'; // Limpiar y añadir opción por defecto

        // Ordenar productos por nombre para una visualización consistente
        const sortedProducts = [...allProducts].sort((a, b) => a.name.localeCompare(b.name));

        sortedProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id; // Usar ID de producto como valor
            option.textContent = product.name;
            elements.productSelect.appendChild(option);
        });

        // Restablecer campo de entrada de precio del producto
        displaySelectedProductPriceInput();
    }

    /**
     * Muestra el campo de entrada de precio para el producto actualmente seleccionado en el panel de administración.
     */
    function displaySelectedProductPriceInput() {
        const selectedProductId = elements.productSelect ? elements.productSelect.value : null;
        if (!elements.selectedProductPriceInputContainer) return;
        elements.selectedProductPriceInputContainer.innerHTML = '<p class="event-placeholder">Selecciona un producto para modificar su precio.</p>'; // Mensaje por defecto

        if (selectedProductId) {
            const product = allProducts.find(p => p.id === selectedProductId);
            if (product) {
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';
                
                const label = document.createElement('label');
                label.setAttribute('for', `product-price-${product.id}`);
                label.textContent = `Precio de ${product.name}:`;
                formGroup.appendChild(label);

                const input = document.createElement('input');
                input.type = 'number';
                input.id = `product-price-${product.id}`;
                input.min = '0';
                input.step = '100';
                input.dataset.productId = product.id; // Almacenar ID de producto en el dataset
                input.value = product.price; // Establecer precio actual
                formGroup.appendChild(input);

                elements.selectedProductPriceInputContainer.innerHTML = ''; // Limpiar mensaje por defecto
                elements.selectedProductPriceInputContainer.appendChild(formGroup);
            }
        }
    }


    function openAdminPanel() {
        if (!elements.adminPanel) {
            console.error("ERROR: No se encontró el elemento del Panel de Administración. No se puede abrir.");
            return;
        }
        elements.adminPanel.classList.add('open'); // Añadir clase 'open' para hacerlo visible vía CSS
        elements.adminPanel.style.display = 'flex'; // Usar flex para que el contenido respete la dirección flex en CSS
        setBodyNoScroll();

        // Rellenar y limpiar entradas para precios de fotos
        if (elements.photoPriceTier1Input) elements.photoPriceTier1Input.value = CONFIG.PHOTO_PRICE_TIER_1;
        if (elements.photoPriceTier2Input) elements.photoPriceTier2Input.value = CONFIG.PHOTO_PRICE_TIER_2;
        if (elements.photoPriceTier3Input) elements.photoPriceTier3Input.value = CONFIG.PHOTO_PRICE_TIER_3;
        if (elements.photoPriceTier4Input) elements.photoPriceTier4Input.value = CONFIG.PHOTO_PRICE_TIER_4;

        if (elements.priceUpdateMessage) elements.priceUpdateMessage.textContent = ''; // Limpiar mensaje anterior
        populateProductSelect();

        // Ocultar salida de enlace de descarga y botones al abrir el panel de administración
        if (elements.generatedDownloadLinkOutput) elements.generatedDownloadLinkOutput.style.display = 'none';
        if (elements.copyAdminDownloadLinkBtn) elements.copyAdminDownloadLinkBtn.style.display = 'none';
        if (elements.whatsappAdminDownloadLinkBtn) elements.whatsappAdminDownloadLinkBtn.style.display = 'none';

        // Desplazarse al inicio del contenido del panel de administración cuando se abre manualmente
        // Esto ahora se maneja por handleRouting para el enlace admin_panel
        if (!window.location.hash.startsWith('#admin_panel?ids=')) { // Solo desplazarse al inicio si no es una apertura automática
            const adminPanelContent = elements.adminPanel.querySelector('.admin-panel-content');
            if (adminPanelContent) {
                adminPanelContent.scrollTop = 0;
                console.log("DEBUG: Panel de administración desplazado al inicio (apertura manual).");
            } else {
                console.warn("WARN: No se encontró .admin-panel-content para el desplazamiento.");
            }
        }
    }

    // Función para cerrar el Panel de Administración
    function closeAdminPanel() {
        if (elements.adminPanel) {
            elements.adminPanel.classList.remove('open');
            elements.adminPanel.style.display = 'none'; // Ocultar explícitamente el panel
            removeBodyNoScroll();
            console.log("DEBUG: Panel de administración cerrado y display establecido en none.");
        }
    }

    /**
     * Guarda los precios de las fotos individuales y de paquete.
     * Esta función es nueva y maneja solo los precios de las fotos.
     */
    function savePhotoPrices() {
        const tier1Price = parseFloat(elements.photoPriceTier1Input ? elements.photoPriceTier1Input.value : '');
        const tier2Price = parseFloat(elements.photoPriceTier2Input ? elements.photoPriceTier2Input.value : '');
        const tier3Price = parseFloat(elements.photoPriceTier3Input ? elements.photoPriceTier3Input.value : '');
        const tier4Price = parseFloat(elements.photoPriceTier4Input ? elements.photoPriceTier4Input.value : '');

        if (isNaN(tier1Price) || tier1Price < 0 || 
            isNaN(tier2Price) || tier2Price < 0 || 
            isNaN(tier3Price) || tier3Price < 0 || 
            isNaN(tier4Price) || tier4Price < 0) {
            if (elements.priceUpdateMessage) {
                elements.priceUpdateMessage.textContent = 'Por favor, introduce números positivos válidos para todos los precios de las fotos.';
                elements.priceUpdateMessage.style.color = 'var(--accent-color)';
            }
            return;
        }

        CONFIG.PHOTO_PRICE_TIER_1 = tier1Price;
        CONFIG.PHOTO_PRICE_TIER_2 = tier2Price;
        CONFIG.PHOTO_PRICE_TIER_3 = tier3Price;
        CONFIG.PHOTO_PRICE_TIER_4 = tier4Price;

        localStorage.setItem('photoPriceTier1', tier1Price);
        localStorage.setItem('photoPriceTier2', tier2Price);
        localStorage.setItem('photoPriceTier3', tier3Price);
        localStorage.setItem('photoPriceTier4', tier4Price);

        if (elements.priceUpdateMessage) {
            elements.priceUpdateMessage.textContent = 'Precios de fotos guardados correctamente.';
            elements.priceUpdateMessage.style.color = 'var(--whatsapp-color)';
            setTimeout(() => {
                if (elements.priceUpdateMessage) elements.priceUpdateMessage.textContent = '';
            }, 3000);
        }
        updateSelectionUI(); // Recalcular el total del carrito con los nuevos precios de fotos
    }

    /**
     * Guarda el precio del producto seleccionado.
     * Esta función es nueva y maneja solo el precio del producto seleccionado.
     */
    function saveProductPrices() {
        const selectedProductId = elements.productSelect ? elements.productSelect.value : null;
        if (!selectedProductId) {
            if (elements.priceUpdateMessage) {
                elements.priceUpdateMessage.textContent = 'Por favor, selecciona un producto para guardar su precio.';
                elements.priceUpdateMessage.style.color = 'var(--accent-color)';
            }
            return;
        }

        if (elements.selectedProductPriceInputContainer) {
            const productPriceInput = elements.selectedProductPriceInputContainer.querySelector(`input[data-product-id="${selectedProductId}"]`);
            if (productPriceInput) {
                const newPrice = parseFloat(productPriceInput.value);
                if (isNaN(newPrice) || newPrice < 0) {
                    if (elements.priceUpdateMessage) {
                        elements.priceUpdateMessage.textContent = 'Por favor, introduce un número positivo válido para el precio del producto seleccionado.';
                        elements.priceUpdateMessage.style.color = 'var(--accent-color)';
                    }
                    productPriceInput.style.borderColor = 'var(--accent-color)'; // Resaltar error
                    return;
                } else {
                    const productToUpdate = allProducts.find(p => p.id === selectedProductId);
                    if (productToUpdate) {
                        productToUpdate.price = newPrice;
                        localStorage.setItem(`productPrice_${selectedProductId}`, newPrice);
                        productPriceInput.style.borderColor = ''; // Limpiar resaltado de error
                        if (elements.priceUpdateMessage) {
                            elements.priceUpdateMessage.textContent = 'Precio del producto guardado correctamente.';
                            elements.priceUpdateMessage.style.color = 'var(--whatsapp-color)';
                            setTimeout(() => {
                                if (elements.priceUpdateMessage) elements.priceUpdateMessage.textContent = '';
                            }, 3000);
                        }
                        updateSelectionUI(); // Recalcular el total del carrito con los nuevos precios de productos
                    }
                }
            }
        }
    }

    /**
     * Muestra/oculta los detalles del método de pago.
     * @param {boolean} showMercadoPago - Verdadero para mostrar Mercado Pago, falso para Transferencia Bancaria.
     */
    function togglePaymentDetails(showMercadoPago) {
        if (!elements.mercadoPagoDetails || !elements.bankTransferDetails || !elements.paymentTotalAmount || !elements.paymentTotalAmountTransfer) return;

        if (showMercadoPago) {
            elements.mercadoPagoDetails.style.display = 'block';
            elements.bankTransferDetails.style.display = 'none';

            // Contenido actualizado para detalles de Mercado Pago
            elements.mercadoPagoDetails.innerHTML = `
                <h4>Paga con Mercado Pago</h4>
                <div class="payment-details">
                    <p><strong>Alias de Mercado Pago:</strong> ${CONFIG.MERCADO_PAGO_ALIAS}</p>
                    <p><strong>Titular:</strong> CESAR DARIO PEREZ</p>
                </div>
                <p><strong>Monto Total:</strong> <span id="payment-total-amount"></span></p>
            `;
            // Reasignar el elemento span después de actualizar innerHTML
            elements.paymentTotalAmount = document.getElementById('payment-total-amount');

        } else {
            elements.mercadoPagoDetails.style.display = 'none';
            elements.bankTransferDetails.style.display = 'block';

            // Contenido actualizado para detalles de Transferencia Bancaria
            elements.bankTransferDetails.innerHTML = `
                <h4>Paga con Transferencia Bancaria</h4>
                <p>Realiza una transferencia a nuestra cuenta:</p>
                <div class="payment-details">
                    <p><strong>Banco:</strong> Banco Santander Río</p>
                    <p><strong>Alias:</strong> ${CONFIG.MERCADO_PAGO_ALIAS}</p>
                    <p><strong>Titular:</strong> CESAR DARIO PEREZ</p>
                    <p><i>(Otros datos como CBU/CUIL/Cuenta se coordinarán vía WhatsApp si es necesario)</i></p>
                </div>
                <p><strong>Monto Total:</strong> <span id="payment-total-amount-transfer"></span></p>
            `;
            // Reasignar el elemento span después de actualizar innerHTML
            elements.paymentTotalAmountTransfer = document.getElementById('payment-total-amount-transfer');
        }
        // Asegurar que los montos se actualicen cada vez que cambia el método de pago
        const { total } = calculateTotalPrice();
        elements.paymentTotalAmount.textContent = formatCurrency(total);
        elements.paymentTotalAmountTransfer.textContent = formatCurrency(total);
    }

    // --- Funciones para gestionar el estado de no-scroll del cuerpo ---
    function setBodyNoScroll() {
        document.body.classList.add('no-scroll');
        console.log("DEBUG: body.no-scroll añadido.");
    }

    function removeBodyNoScroll() {
        // Solo quitamos 'no-scroll' si NINGÚN modal/panel que deba bloquear el scroll está abierto.
        // La sección de descarga ahora tiene su propio scroll, así que no debe bloquear el body.
        if (!(elements.selectionPanel && elements.selectionPanel.classList.contains('open')) &&
            !(elements.paymentModal && elements.paymentModal.classList.contains('open')) &&
            !(elements.adminPanel && elements.adminPanel.classList.contains('open')) &&
            !(elements.lightbox && elements.lightbox.classList.contains('open'))
        ) {
            document.body.classList.remove('no-scroll');
            console.log("DEBUG: body.no-scroll eliminado.");
        } else {
            console.log("DEBUG: body.no-scroll no eliminado (otro panel/modal está abierto).");
        }
    }


    // --- Funcionalidad de Descarga del Cliente ---

    /**
     * Controla la visibilidad de los elementos de la página principal versus la sección de descarga.
     * @param {boolean} showMain - Verdadero para mostrar los elementos de la página principal, falso para mostrar solo la sección de descarga.
     */
    function setMainPageDisplay(showMain) {
        console.log(`DEBUG: setMainPageDisplay llamado con showMain: ${showMain}`);
        // Obtener todas las secciones relevantes y elementos flotantes
        const mainSections = [
            elements.heroSection,
            document.getElementById('events'), // Obtener explícitamente la sección 'events'
            elements.gallerySection,
            elements.servicesSection,
            elements.productsSection,
            elements.contactSection,
            elements.footer,
            document.getElementById('about') // Sección "Quiénes Somos" añadida
        ];
        const panelsAndModals = [
            elements.mobileMenu,
            elements.selectionPanel,
            elements.paymentModal,
            elements.adminPanel
            // IMPORTANTE: Lightbox NO está incluido intencionalmente aquí.
            // Su visibilidad se controla independientemente por openLightbox/closeLightbox.
        ];
        // MODIFICACIÓN: La lista de botones flotantes se ajusta para el comportamiento deseado.
        // El botón de WhatsApp flotante se gestiona aquí para que siempre esté visible en la vista principal.
        const floatingElements = [
            elements.header, // El encabezado actúa como un elemento flotante
            elements.selectionIcon, // Su visibilidad depende del carrito
            elements.whatsappFloatBtn // Este siempre visible en la vista principal
            // elements.openAdminPanelBtn - Su visibilidad se maneja exclusivamente en init() y handleRouting
        ];

        mainSections.forEach(section => {
            if (section) {
                section.style.display = showMain ? 'block' : 'none';
                console.log(`DEBUG: Sección ${section.id || section.className} display: ${section.style.display}`);
            }
        });

        panelsAndModals.forEach(panel => {
            if (panel) {
                panel.classList.remove('open'); // Siempre asegurar que la clase 'open' sea eliminada
                panel.style.display = 'none'; // Ocultar explícitamente
                console.log(`DEBUG: Panel/Modal ${panel.id || panel.className} display: ${panel.style.display} (forzado a ocultar)`);
            }
        });

        floatingElements.forEach(element => {
            if (element) {
                if (element === elements.selectionIcon) {
                    // El icono del carrito se muestra si hay ítems Y estamos en la vista principal
                    element.style.display = showMain && selectedItems.size > 0 ? 'block' : 'none';
                } else if (element === elements.whatsappFloatBtn) {
                    // El botón de WhatsApp flotante siempre se muestra si estamos en la vista principal
                    element.style.display = showMain ? 'flex' : 'none';
                } else if (element !== elements.openAdminPanelBtn) { // Asegurarse de no tocar el botón Admin aquí
                    element.style.display = showMain ? 'block' : 'none';
                }
                console.log(`DEBUG: Elemento flotante ${element.id || element.className} display: ${element.style.display}`);
            }
        });
        // IMPORTANTE: Después de este bucle, siempre llamamos a updateSelectionUI()
        // para asegurar que los botones de selección/whatsapp flotante estén en el estado correcto
        // para la vista principal.
        if (showMain) {
            updateSelectionUI();
        }


        // Manejo específico para la sección de descarga en sí
        if (elements.downloadSection) {
            if (showMain) {
                elements.downloadSection.classList.remove('open-full');
                elements.downloadSection.style.display = 'none';
                // Cuando volvemos a la vista principal, aseguramos que el body.no-scroll se maneje correctamente
                removeBodyNoScroll(); 
                console.log("DEBUG: Sección de descarga cerrada, display establecido en none.");
            } else {
                elements.downloadSection.classList.add('open-full');
                elements.downloadSection.style.display = 'flex'; // Necesita ser flex para organizar el contenido
                // Cuando abrimos la sección de descarga, aseguramos que el body NO tenga no-scroll,
                // ya que la sección de descarga ahora tiene su propio scroll.
                document.body.classList.remove('no-scroll'); // Forzar la eliminación
                console.log("DEBUG: Sección de descarga abierta completamente, display establecido en flex. Se aseguró que body.no-scroll sea eliminado.");
            }
        }
        // Ocultar notificación toast al cambiar de vista
        if (elements.toastNotification && elements.toastNotification.classList.contains('show')) {
            elements.toastNotification.classList.remove('show');
        }
    }


    /**
     * Maneja el enrutamiento de la página basado en el hash de la URL.
     * Esta función ahora reemplaza `handlePageLoadParameters`.
     */
    function handleRouting() {
        const hash = window.location.hash;
        console.log("DEBUG: handleRouting llamado, hash:", hash);

        if (hash.startsWith('#download?ids=')) {
            // Página de Descarga del Cliente
            console.log("DEBUG: Enrutando a la página de descarga del cliente.");
            setMainPageDisplay(false); // Ocultar secciones de la página principal y todos los paneles
            
            const ids = hash.split('=')[1].split(',').map(id => id.trim()).filter(id => id !== '');
            console.log("DEBUG: IDs recibidos en el enlace de descarga:", ids); // DEBUG: IDs recibidos
            clientDownloadPhotos = allPhotos.filter(photo => ids.includes(photo.id)); // Filtrar fotos de la lista completa
            console.log("DEBUG: Fotos filtradas para descarga:", clientDownloadPhotos); // DEBUG: Fotos filtradas
            
            if (clientDownloadPhotos.length > 0) {
                renderClientDownloadSection(clientDownloadPhotos);
                window.scrollTo(0, 0); // Asegurar desplazamiento al inicio
                showToast('¡Tus fotos están listas para descargar!', 'success');
                // Añadir log para verificar estado de overflow
                console.log("DEBUG: overflow-y de HTML:", document.documentElement.style.overflowY || window.getComputedStyle(document.documentElement).overflowY);
                console.log("DEBUG: overflow-y de Body:", document.body.style.overflowY || window.getComputedStyle(document.body).overflowY);
            } else {
                showToast('No se encontraron fotos para este enlace de descarga.', 'error');
                console.warn('WARN: No se encontraron fotos para el enlace de descarga proporcionado.');
                window.location.hash = ''; // Volver a la vista normal
                // setMainPageDisplay(true) será llamado por el evento hashchange
            }
        } else if (hash.startsWith('#admin_panel?ids=')) {
            // Apertura automática del Panel de Administración y pre-rellenado
            console.log("DEBUG: Enrutando al panel de administración con IDs pre-rellenados.");
            setMainPageDisplay(true); // Asegurar que los elementos de la página principal estén disponibles

            const adminGenerateIds = hash.split('=')[1].split(',').map(id => id.trim()).filter(id => id !== '');
            const adminIdsString = adminGenerateIds.join(','); // Volver a unir para el campo de entrada

            // Asegurar que otros paneles estén cerrados antes de intentar abrir el específico
            elements.selectionPanel.classList.remove('open');
            elements.paymentModal.classList.remove('open');
            // elements.lightbox.classList.remove('open'); // Lightbox ahora se gestiona independientemente
            elements.adminPanel.style.display = 'none'; // Asegurar que esté oculto antes de que openAdminPanel intente mostrarlo

            // Abrir el panel de administración
            openAdminPanel();

            // Pequeño retraso para asegurar que el panel se abra antes de intentar desplazarse y pre-rellenar
            setTimeout(() => {
                const adminPanelContent = elements.adminPanel?.querySelector('.admin-panel-content');
                const targetHeader = elements.adminGenerateIdsSectionHeader; // Usar referencia directa al elemento

                if (targetHeader) {
                    console.log("DEBUG: handleRouting: Se encontró targetHeader para el desplazamiento:", targetHeader);
                    targetHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    console.log("DEBUG: handleRouting: Intento de scrollIntoView del panel de administración.");
                } else {
                    console.warn("WARN: handleRouting: No se encontró targetHeader (admin-generate-link-header) para el desplazamiento. Intentando scrollTop 0.");
                    if (adminPanelContent) {
                        adminPanelContent.scrollTop = 0; // Fallback
                    } else {
                        console.error("ERROR: handleRouting: No se encontró adminPanelContent para el desplazamiento de fallback.");
                    }
                }

                if (elements.adminPhotoIdsInput) {
                    elements.adminPhotoIdsInput.value = adminIdsString; // Pre-rellenar IDs
                    console.log("DEBUG: handleRouting: Entrada de IDs de fotos del admin pre-rellenada con:", elements.adminPhotoIdsInput.value);

                    if (elements.generateAdminDownloadLinkBtn) {
                        elements.generateAdminDownloadLinkBtn.click(); // Hacer clic programáticamente en el botón
                        console.log("DEBUG: handleRouting: Se hizo clic automáticamente en el botón 'Generar Enlace'.");
                    } else {
                        console.error("ERROR: handleRouting: No se encontró el botón 'Generar Enlace' para el clic automático. Verifique su ID.");
                    }
                } else {
                    console.error("ERROR: handleRouting: No se encontró el elemento de entrada de IDs de fotos del admin para pre-rellenado. Verifique su ID.");
                }
                showToast('IDs recibidos del cliente. Enlace de descarga generado.', 'info');
            }, 500); // Retraso reducido a 500 ms
        } else {
            // Vista normal de la página (sin hash específico)
            console.log("DEBUG: Enrutando a la vista normal de la página.");
            setMainPageDisplay(true); // Mostrar elementos de la página principal
            // Añadir log para verificar estado de overflow
            console.log("DEBUG: overflow-y de HTML (vista normal):", document.documentElement.style.overflowY || window.getComputedStyle(document.documentElement).overflowY);
            console.log("DEBUG: overflow-y de Body (vista normal):", document.body.style.overflowY || window.getComputedStyle(document.body).overflowY);
        }
    }

    /**
     * Renderiza las fotos en la sección de descarga del cliente.
     * @param {Array<object>} photosToRender - Array de objetos de foto a mostrar.
     */
    function renderClientDownloadSection(photosToRender) {
        if (!elements.downloadLinksContainer || !elements.downloadAllBtn) return;

        elements.downloadLinksContainer.innerHTML = ''; // Limpiar contenedor
        console.log(`DEBUG: renderClientDownloadSection intentando renderizar ${photosToRender.length} fotos.`); // NUEVO: Log para el conteo de renderizado

        if (photosToRender.length === 0) {
            elements.downloadLinksContainer.innerHTML = '<p class="event-placeholder">No hay fotos disponibles para descargar en este momento.</p>';
            elements.downloadAllBtn.disabled = true;
            return;
        }
        elements.downloadAllBtn.disabled = false;

        photosToRender.forEach(photo => {
            const downloadItem = document.createElement('div');
            downloadItem.className = 'download-item photo-card';
            downloadItem.dataset.id = photo.id;

            const img = document.createElement('img');
            img.src = photo.src;
            img.alt = photo.name || `Foto ${photo.id}`;
            img.loading = 'lazy';
            downloadItem.appendChild(img);

            const overlay = document.createElement('div');
            overlay.className = 'photo-card-overlay';
            overlay.innerHTML = `<span class="photo-title">${photo.name || `Foto ${photo.id}`}</span>`;
            downloadItem.appendChild(overlay);

            const downloadLink = document.createElement('a');
            downloadLink.href = photo.src;
            downloadLink.download = photo.src.split('/').pop();
            downloadLink.textContent = 'Descargar';
            downloadLink.className = 'btn btn-secondary download-btn';
            overlay.appendChild(downloadLink);

            downloadItem.addEventListener('click', (e) => { // Permitir hacer clic en la tarjeta para descargar
                if (!e.target.closest('.download-btn')) { // No volver a activar si se hizo clic en el botón
                    downloadLink.click();
                }
            });

            elements.downloadLinksContainer.appendChild(downloadItem);
        });
    }

    /**
     * Genera y muestra un enlace de descarga compartible para las fotos actualmente seleccionadas (desde el carrito).
     * (Funcionalidad de administrador)
     */
    function generateClientDownloadLink() {
        const photosInCart = Array.from(selectedItems.values()).filter(item => item.type === 'photo' && item.quantity > 0); // Solo fotos con cantidad > 0

        console.log("DEBUG: generateClientDownloadLink: array photosInCart:", photosInCart); // DEBUG NUEVO
        if (photosInCart.length === 0) {
            showToast('No hay fotos seleccionadas para generar un enlace de descarga.', 'info');
            return;
        }

        // Recopilar IDs de fotos tantas veces como su cantidad
        const photoIds = [];
        photosInCart.forEach(item => {
            for (let i = 0; i < item.quantity; i++) {
                photoIds.push(item.originalId);
            }
        });
        console.log("DEBUG: generateClientDownloadLink: array photoIds antes de unir:", photoIds); // DEBUG NUEVO

        const downloadUrl = generateDownloadUrlFromIds(photoIds.join(','), 'download'); // Usar 'download' para el enlace del cliente

        lastGeneratedDownloadLink = downloadUrl;

        showToast('Enlace de descarga generado:', 'info');
        console.log('DEBUG: Enlace de descarga (desde el carrito):', downloadUrl); 
        
        let copySuccess = false;
        try {
            const dummyInput = document.createElement('textarea');
            document.body.appendChild(dummyInput);
            dummyInput.value = downloadUrl;
            dummyInput.select();
            copySuccess = document.execCommand('copy');
            document.body.removeChild(dummyInput);
        } catch (err) {
            console.error('ERROR: Fallo al copiar al portapapeles:', err);
            copySuccess = false;
        }

        if (copySuccess) {
            showToast('¡Enlace copiado al portapapeles! Compártelo con el cliente.', 'success');
        } else {
            showToast('El enlace no pudo copiarse automáticamente. Cópialo manualmente de la consola del navegador. (F12 > Console)', 'warn');
        }

        // Cerrar el panel de selección después de generar el enlace
        if (elements.selectionPanel) elements.selectionPanel.classList.remove('open');
        elements.selectionPanel.style.display = 'none'; // Ocultar explícitamente
        removeBodyNoScroll();
    }

    /**
     * Genera la URL principal de descarga a partir de una cadena de IDs separada por comas.
     * @param {string} photoIdsString - Cadena de IDs de fotos separada por comas.
     * @param {string} type - 'download' para el cliente, 'admin_panel' para el enlace del admin.
     * @returns {string} La URL completa con hash.
     */
    function generateDownloadUrlFromIds(photoIdsString, type) {
        if (!photoIdsString || photoIdsString.trim() === '') {
            return '';
        }
        // No se necesita downloadKey si se usa hash para el enrutamiento, ya que no es un identificador de sesión único aquí.
        // Es solo una forma de pasar IDs.
        const baseUrl = window.location.origin === 'null' || window.location.origin === 'file://'
                        ? 'http://localhost:8000'
                        : window.location.origin;
        // Asegurarse de obtener la ruta base del archivo HTML
        const basePath = window.location.pathname; 
        return `${baseUrl}${basePath}#${type}?ids=${photoIdsString}`;
    }

    /**
     * Genera un enlace de descarga a partir de los IDs introducidos en el panel de administración.
     */
    function generateAdminDownloadLink() {
        if (!elements.adminPhotoIdsInput || !elements.generatedDownloadLinkOutput || !elements.copyAdminDownloadLinkBtn || !elements.whatsappAdminDownloadLinkBtn) return;

        const idsInput = elements.adminPhotoIdsInput.value.trim();
        if (idsInput === '') {
            showToast('Por favor, introduce al menos un ID de foto para generar el enlace.', 'info');
            elements.generatedDownloadLinkOutput.style.display = 'none';
            elements.copyAdminDownloadLinkBtn.style.display = 'none';
            elements.whatsappAdminDownloadLinkBtn.style.display = 'none';
            return;
        }

        const photoIdsArray = idsInput.split(',').map(id => id.trim()).filter(id => id !== '');
        if (photoIdsArray.length === 0) {
            showToast('Los IDs ingresados no son válidos. Asegúrate de separarlos por comas.', 'error');
            elements.generatedDownloadLinkOutput.style.display = 'none';
            elements.copyAdminDownloadLinkBtn.style.display = 'none';
            elements.whatsappAdminDownloadLinkBtn.style.display = 'none';
            return;
        }
        const cleanIdsString = photoIdsArray.join(',');

        // Generar la URL para la página de descarga del cliente
        const downloadUrl = generateDownloadUrlFromIds(cleanIdsString, 'download'); // Este es el enlace para el cliente

        lastGeneratedDownloadLink = downloadUrl; // Almacenar este enlace para los botones de copiar/whatsapp

        elements.generatedDownloadLinkOutput.textContent = downloadUrl;
        elements.generatedDownloadLinkOutput.style.display = 'block';
        elements.copyAdminDownloadLinkBtn.style.display = 'block';
        elements.whatsappAdminDownloadLinkBtn.style.display = 'block';

        showToast('Enlace de descarga generado en el panel.', 'success');
        console.log('DEBUG: Enlace de descarga (desde Admin Panel, para cliente):', downloadUrl);
    }

    /**
     * Copia el último enlace de descarga generado al portapapeles (desde el Panel de Administración).
     */
    function copyAdminDownloadLink() {
        if (!lastGeneratedDownloadLink) {
            showToast('Primero genera un enlace de descarga.', 'info');
            return;
        }

        let copySuccess = false;
        try {
            const dummyInput = document.createElement('textarea');
            document.body.appendChild(dummyInput);
            dummyInput.value = lastGeneratedDownloadLink;
            dummyInput.select();
            copySuccess = document.execCommand('copy');
            document.body.removeChild(dummyInput);
        } catch (err) {
            console.error('ERROR: Fallo al copiar al portapapeles:', err);
            copySuccess = false;
        }

        if (copySuccess) {
            showToast('¡Enlace copiado al portapapeles! Listo para enviar.', 'success');
        } else {
            showToast('El enlace no pudo copiarse automáticamente. Cópialo manualmente del cuadro de texto.', 'warn');
        }
    }

    /**
     * Abre WhatsApp para enviar el último enlace de descarga generado (desde el Panel de Administración).
     */
    function whatsappAdminDownloadLink() {
        if (!lastGeneratedDownloadLink) {
            showToast('Primero genera un enlace de descarga.', 'info');
            return;
        }

        const message = encodeURIComponent(`¡Hola! Aquí tienes el enlace para descargar tus fotos de ArteVisualenVivo: ${lastGeneratedDownloadLink}`);
        window.open(`https://wa.me/?text=${message}`, '_blank');
        showToast('Mensaje de WhatsApp preparado. Selecciona el contacto.', 'info');
    }

    /**
     * Inicia la descarga de todas las fotos en la sección de descarga del cliente.
     */
    function downloadAllPhotos() {
        if (clientDownloadPhotos.length === 0) {
            showToast('No hay fotos para descargar.', 'info');
            return;
        }

        showToast('Iniciando descarga de todas las fotos...', 'info');
        clientDownloadPhotos.forEach((photo, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = photo.src;
                link.download = photo.src.split('/').pop();
                document.body.appendChild(link);
                link.click();
                if (link.parentNode) {
                    link.parentNode.removeChild(link);
                }
            }, index * 100);
        });
        showToast('¡Descargas iniciadas!', 'success');
    }


    // --- Inicialización de la Aplicación Principal ---
    async function init() {
        console.log("DEBUG: Inicializando script de ArteVisualenVivo...");

        // Cargar selección guardada de localStorage al inicio
        loadSelectionFromLocalStorage();

        // --- NUEVO: Verificar el parámetro admin en la cadena de consulta de la URL para el botón de admin ---
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('admin') && urlParams.get('admin') === 'true') {
            if (elements.openAdminPanelBtn) {
                elements.openAdminPanelBtn.style.display = 'block'; // Hacer visible el botón de admin
                console.log("DEBUG: Botón de admin visible debido al parámetro de URL.");
            }
        } else {
            if (elements.openAdminPanelBtn) {
                elements.openAdminPanelBtn.style.display = 'none'; // Asegurar que esté oculto si el parámetro no está presente o no es 'true'
                console.log("DEBUG: Botón de admin asegurado oculto.");
            }
        }
        // --- FIN NUEVO ---

        // Cargar fondo del héroe con fallback
        const heroSection = elements.heroSection;
        const initialBgStyle = heroSection ? window.getComputedStyle(heroSection).backgroundImage : 'none';
        if (initialBgStyle && initialBgStyle !== 'none' && heroSection) {
            const urlMatch = initialBgStyle.match(/url\(['"]?(.*?)['"]?\)/);
            if (urlMatch && urlMatch[1]) {
                const initialImageUrl = urlMatch[1];
                const baseImageUrl = initialImageUrl.substring(0, initialImageUrl.lastIndexOf('.'));
                const primaryExtension = initialImageUrl.substring(initialImageUrl.lastIndexOf('.'));
                const fallbackExtension = '.jpg';
                const secondaryFallbackExtension = '.png';

                const loadImageWithFallback = (baseUrl, extensions, element, index = 0) => {
                    if (index >= extensions.length) {
                        console.error(`ERROR: No se pudo cargar el fondo del héroe con ninguna extensión probada: ${baseUrl}`);
                        return;
                    }
                    const currentUrl = `${baseUrl}${extensions[index]}`;
                    const img = new Image();
                    img.onload = () => {
                        element.style.backgroundImage = `url('${currentUrl}')`;
                        console.log(`DEBUG: Fondo del héroe cargado: ${currentUrl}`);
                    };
                    img.onerror = () => {
                        console.warn(`WARN: No se pudo cargar el fondo del héroe: ${currentUrl}. Intentando la siguiente extensión.`);
                        loadImageWithFallback(baseUrl, extensions, element, index + 1);
                    };
                    img.src = currentUrl;
                };
                loadImageWithFallback(baseImageUrl, [primaryExtension, fallbackExtension, secondaryFallbackExtension], heroSection);
            }
        } else {
             console.warn("WARN: No se encontró la imagen de fondo inicial en la sección del héroe o heroSection es nulo. Asegúrate de definirla en index.html.");
        }

        // Cargar datos de data.json
        await loadDataFromJSON();

        // Manejar el enrutamiento inicial basado en el hash de la URL
        handleRouting();
        window.addEventListener('hashchange', handleRouting); // Escuchar cambios de hash


        // --- Escuchadores de Eventos ---
        // Navegación Móvil
        if (elements.menuToggle) elements.menuToggle.addEventListener('click', () => {
            if (elements.mobileMenu) elements.mobileMenu.classList.add('open');
            setBodyNoScroll();
        });
        if (elements.closeMenuBtn) elements.closeMenuBtn.addEventListener('click', () => {
            if (elements.mobileMenu) elements.mobileMenu.classList.remove('open');
            removeBodyNoScroll();
        });
        elements.mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (elements.mobileMenu) elements.mobileMenu.classList.remove('open');
                removeBodyNoScroll();
            });
        });

        // Encabezado Fijo
        window.addEventListener('scroll', () => {
            if (elements.header) {
                if (window.scrollY > 50) {
                    elements.header.classList.add('sticky');
                } else {
                    elements.header.classList.remove('sticky');
                }
            }
        });

        // Lightbox
        if (elements.lightboxClose) elements.lightboxClose.addEventListener('click', closeLightbox);
        if (elements.lightboxPrev) elements.lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
        if (elements.lightboxNext) elements.lightboxNext.addEventListener('click', () => navigateLightbox(1));

        // Panel de Selección (Carrito)
        if (elements.selectionIcon) elements.selectionIcon.addEventListener('click', () => {
            if (elements.selectionPanel) elements.selectionPanel.classList.add('open');
            elements.selectionPanel.style.display = 'flex'; // Asegurar que se convierta en flex al abrir
            setBodyNoScroll();
            updateSelectionUI();
        });
        if (elements.closeSelectionPanelBtn) elements.closeSelectionPanelBtn.addEventListener('click', () => {
            if (elements.selectionPanel) elements.selectionPanel.classList.remove('open');
            elements.selectionPanel.style.display = 'none'; // Ocultar explícitamente
            removeBodyNoScroll();
        });
        if (elements.clearSelectionBtn) elements.clearSelectionBtn.addEventListener('click', clearSelection);

        // Botón de WhatsApp dentro del carrito
        if (elements.whatsappBtn) elements.whatsappBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (selectedItems.size === 0) {
                showToast('Tu selección está vacía. ¡Añade ítems para continuar!', 'info');
                return;
            }
            if (elements.paymentModal) elements.paymentModal.classList.add('open');
            elements.paymentModal.style.display = 'flex'; // Asegurar que se convierta en flex al abrir
            setBodyNoScroll();
            togglePaymentDetails(true);
            if (elements.paymentMethodToggle) elements.paymentMethodToggle.checked = false;
        });

        // Botón Flotante de WhatsApp (MODIFICADO para consulta general)
        if (elements.whatsappFloatBtn) {
            elements.whatsappFloatBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Este botón siempre abre un chat general de WhatsApp, sin importar el carrito.
                window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent('¡Hola! Tengo una consulta general sobre sus servicios.')}`, '_blank');
            });
            // La visibilidad inicial se maneja en la sección NUEVO al inicio de init().
            // No es necesario establecer el display aquí nuevamente.
        }


        // Modal de Pago
        if (elements.closePaymentModalBtn) elements.closePaymentModalBtn.addEventListener('click', () => {
            if (elements.paymentModal) elements.paymentModal.classList.remove('open');
            elements.paymentModal.style.display = 'none'; // Ocultar explícitamente
            removeBodyNoScroll();
        });
        if (elements.paymentMethodToggle) elements.paymentMethodToggle.addEventListener('change', (event) => {
            togglePaymentDetails(!event.target.checked);
        });
        if (elements.whatsappPaymentBtn) elements.whatsappPaymentBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.open(generatePaymentWhatsAppUrl(), '_blank');
            clearSelection();
            showToast('¡Gracias! Hemos generado el mensaje para WhatsApp. Revisa tu chat.', 'success');
        });

        // Panel de Administración
        if (elements.openAdminPanelBtn) elements.openAdminPanelBtn.addEventListener('click', openAdminPanel);
        if (elements.closeAdminPanelBtn) elements.closeAdminPanelBtn.addEventListener('click', closeAdminPanel);
        
        // Escuchador para el nuevo botón "Guardar Precios de Fotos"
        if (elements.savePhotoPricesBtn) elements.savePhotoPricesBtn.addEventListener('click', savePhotoPrices);

        // Escuchador para el nuevo botón "Guardar Precio de Producto"
        if (elements.saveProductPricesBtn) elements.saveProductPricesBtn.addEventListener('click', saveProductPrices);


        // Escuchador para el menú desplegable de selección de productos en el panel de administración
        if (elements.productSelect) {
            elements.productSelect.addEventListener('change', displaySelectedProductPriceInput);
        }
        
        // Generación de Enlace de Descarga del Panel de Administración (Mantener si aún quieres la opción manual)
        if (elements.generateAdminDownloadLinkBtn) elements.generateAdminDownloadLinkBtn.addEventListener('click', generateAdminDownloadLink);
        if (elements.copyAdminDownloadLinkBtn) elements.copyAdminDownloadLinkBtn.addEventListener('click', copyAdminDownloadLink);
        if (elements.whatsappAdminDownloadLinkBtn) elements.whatsappAdminDownloadLinkBtn.addEventListener('click', whatsappAdminDownloadLink);


        // Escuchador para el menú desplegable de filtro de galería
        if (elements.categoryFilter) {
            elements.categoryFilter.addEventListener('change', (event) => {
                filterGalleryByCategory(event.target.value);
            });
        }
        
        // Navegación con teclado (Escape para cerrar, flechas para Lightbox)
        document.addEventListener('keydown', (e) => {
            if (elements.lightbox && elements.lightbox.classList.contains('open')) {
                if (e.key === 'ArrowLeft') {
                    navigateLightbox(-1);
                    e.preventDefault();
                } else if (e.key === 'ArrowRight') {
                    navigateLightbox(1);
                    e.preventDefault();
                } else if (e.key === 'Escape') {
                    closeLightbox();
                    e.preventDefault();
                }
            } else if (elements.paymentModal && elements.paymentModal.classList.contains('open') && e.key === 'Escape') {
                if (elements.paymentModal) elements.paymentModal.classList.remove('open');
                elements.paymentModal.style.display = 'none'; // Ocultar explícitamente
                removeBodyNoScroll();
                e.preventDefault();
            } else if (elements.selectionPanel && elements.selectionPanel.classList.contains('open') && e.key === 'Escape') {
                if (elements.selectionPanel) elements.selectionPanel.classList.remove('open');
                elements.selectionPanel.style.display = 'none'; // Ocultar explícitamente
                removeBodyNoScroll();
                e.preventDefault();
            } else if (elements.adminPanel && elements.adminPanel.classList.contains('open') && e.key === 'Escape') {
                closeAdminPanel();
                e.preventDefault();
            }
        });

        // Cerrar paneles/modales al hacer clic fuera o clic derecho
        document.addEventListener('click', (event) => {
            // Cerrar Panel de Selección (Carrito)
            if (elements.selectionPanel && elements.selectionPanel.classList.contains('open')) {
                const isClickInsidePanel = elements.selectionPanel.contains(event.target);
                const isClickOnSelectionIcon = elements.selectionIcon && elements.selectionIcon.contains(event.target);
                
                if (!isClickInsidePanel && !isClickOnSelectionIcon) {
                    console.log("DEBUG: Clic fuera del panel de selección, cerrando.");
                    if (elements.selectionPanel) elements.selectionPanel.classList.remove('open');
                    elements.selectionPanel.style.display = 'none'; // Ocultar explícitamente
                    removeBodyNoScroll();
                }
            }
            // Cerrar Modal de Pago
            if (elements.paymentModal && elements.paymentModal.classList.contains('open')) {
                const modalContent = elements.paymentModal.querySelector('.payment-modal-content');
                const isClickOutsideContent = !modalContent.contains(event.target);
                const isClickOnWhatsappBtn = elements.whatsappBtn && elements.whatsappBtn.contains(event.target);
                
                if (event.target === elements.paymentModal || (isClickOutsideContent && !isClickOnWhatsappBtn)) {
                    console.log("DEBUG: Clic fuera del modal de pago, cerrando.");
                    if (elements.paymentModal) elements.paymentModal.classList.remove('open');
                    elements.paymentModal.style.display = 'none'; // Ocultar explícitamente
                    removeBodyNoScroll();
                }
            }

            // Cerrar Panel de Administración
            if (elements.adminPanel && elements.adminPanel.classList.contains('open')) {
                const isClickInsideAdminPanel = elements.adminPanel.contains(event.target);
                const isClickOnAdminOpenBtn = elements.openAdminPanelBtn && elements.openAdminPanelBtn.contains(event.target);
                
                // También verificar si el clic es en alguno de los botones que activan acciones dentro del panel de administración
                const isClickOnGenerateAdminLinkBtn = elements.generateAdminDownloadLinkBtn && elements.generateAdminDownloadLinkBtn.contains(event.target);
                const isClickOnCopyAdminLinkBtn = elements.copyAdminDownloadLinkBtn && elements.copyAdminDownloadLinkBtn.contains(event.target);
                const isClickOnWhatsappAdminLinkBtn = elements.whatsappAdminDownloadLinkBtn && elements.whatsappAdminDownloadLinkBtn.contains(event.target);
                const isClickOnSavePhotoPricesBtn = elements.savePhotoPricesBtn && elements.savePhotoPricesBtn.contains(event.target); // NUEVO
                const isClickOnSaveProductPricesBtn = elements.saveProductPricesBtn && elements.saveProductPricesBtn.contains(event.target); // NUEVO
                const isClickOnProductSelect = elements.productSelect && elements.productSelect.contains(event.target);
                
                if (!isClickInsideAdminPanel && !isClickOnAdminOpenBtn &&
                    !isClickOnGenerateAdminLinkBtn && !isClickOnCopyAdminLinkBtn && 
                    !isClickOnWhatsappAdminLinkBtn && !isClickOnSavePhotoPricesBtn && !isClickOnSaveProductPricesBtn && !isClickOnProductSelect) { 
                    console.log("DEBUG: Clic fuera del panel de administración, cerrando.");
                    closeAdminPanel(); 
                }
            }
        });

        // Cerrar paneles/modales con clic derecho (contextmenu)
        document.addEventListener('contextmenu', (event) => {
            if (elements.selectionPanel && elements.selectionPanel.classList.contains('open')) {
                event.preventDefault(); // Prevenir el menú contextual predeterminado del navegador
                console.log("DEBUG: Clic derecho en el panel de selección abierto, cerrando.");
                if (elements.selectionPanel) elements.selectionPanel.classList.remove('open');
                elements.selectionPanel.style.display = 'none'; // Ocultar explícitamente
                removeBodyNoScroll();
            }
            if (elements.adminPanel && elements.adminPanel.classList.contains('open')) {
                event.preventDefault(); // Prevenir el menú contextual predeterminado del navegador
                console.log("DEBUG: Clic derecho en el panel de administración abierto, cerrando.");
                closeAdminPanel();
            }
        });
        
        // Escuchador de eventos para el botón "Descargar Todo" (siempre activo, ya que forma parte de la sección de descarga)
        if (elements.downloadAllBtn) elements.downloadAllBtn.addEventListener('click', downloadAllPhotos);
        
        console.log("DEBUG: init() completado y escuchadores configurados.");
    }

    init();
});
