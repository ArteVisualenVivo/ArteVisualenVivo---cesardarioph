    /**
     * Calcula el precio total de la selección de fotos y productos.
     * La lógica del paquete de 20 fotos solo aplica a las fotos.
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

        // Aplicar lógica de precios de fotos
        if (photoCount > 0) {
            const packPriceThreshold = 20;
            const packCount = Math.floor(photoCount / packPriceThreshold);
            const remainingPhotos = photoCount % packPriceThreshold;

            total += packCount * CONFIG.PHOTO_20_PACK; // <--- ¡Asegúrate de que esta línea use CONFIG.PHOTO_20_PACK!
            total += remainingPhotos * CONFIG.PHOTO_PRICE_INDIVIDUAL; // <--- ¡Y esta línea use CONFIG.PHOTO_PRICE_INDIVIDUAL!
        }
        
        return { total, photoCount };
    }
