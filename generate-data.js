const fs = require('fs');
const path = require('path');

const galleryDir = path.join(__dirname, 'galeria');
const dataFilePath = path.join(__dirname, 'data.json');

// Función simple para crear un hash consistente de una cadena
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    // Convert to a positive string to avoid issues with negative hashes
    return (hash >>> 0).toString(36);
}

// Función para explorar directorios y generar datos de forma recursiva
function generateGalleryData(dir) {
    const events = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            const categoryName = entry.name;
            let categoryContent = [];
            let isProductCategory = false; // Bandera para diferenciar productos

            // Si el nombre de la carpeta es "tienda-productos", la tratamos como categoría de productos
            if (categoryName === 'tienda-productos') {
                isProductCategory = true;
                const products = [];
                const productEntries = fs.readdirSync(entryPath, { withFileTypes: true });

                for (const productEntry of productEntries) {
                    const productPath = path.join(entryPath, productEntry.name);
                    if (productEntry.isDirectory()) {
                        // Esto es una carpeta de producto (ej. "taza-personalizada")
                        const productImages = [];
                        const imageEntries = fs.readdirSync(productPath, { withFileTypes: true });

                        for (const imageEntry of imageEntries) {
                            const imagePath = path.join(productPath, imageEntry.name);
                            const relativeImagePath = path.relative(galleryDir, imagePath).replace(/\\/g, '/'); // Ruta relativa desde 'galeria'
                            const fileExtension = path.extname(imageEntry.name).toLowerCase();
                            const fileNameWithoutExt = path.basename(imageEntry.name, fileExtension);

                            // Solo añadir imágenes (jpg, jpeg, png, gif, webp, jfif)
                            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.jfif'].includes(fileExtension)) {
                                productImages.push({
                                    id: simpleHash(relativeImagePath), // ID estable para la imagen
                                    name: fileNameWithoutExt,
                                    src: relativeImagePath, // Ruta relativa desde 'galeria/'
                                    type: 'image'
                                });
                            }
                        }
                        // Ordenar las imágenes del producto por nombre de archivo para consistencia
                        productImages.sort((a, b) => a.src.localeCompare(b.src));

                        // Obtener el precio del producto de un archivo de texto si existe
                        let productPrice = 0; // Precio por defecto
                        const priceFilePath = path.join(productPath, 'price.txt');
                        if (fs.existsSync(priceFilePath)) {
                            try {
                                productPrice = parseFloat(fs.readFileSync(priceFilePath, 'utf8').trim());
                                if (isNaN(productPrice)) {
                                    console.warn(`Advertencia: El precio en ${priceFilePath} no es un número válido. Usando 0.`);
                                    productPrice = 0;
                                }
                            } catch (e) {
                                console.error(`Error al leer el precio de ${priceFilePath}:`, e);
                                productPrice = 0;
                            }
                        } else {
                            console.warn(`Advertencia: No se encontró price.txt en ${productPath}. Usando precio por defecto 0.`);
                        }

                        products.push({
                            id: simpleHash(path.relative(galleryDir, productPath).replace(/\\/g, '/')), // ID estable para la carpeta del producto
                            name: productEntry.name.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()), // Formatear nombre
                            price: productPrice,
                            // Asegurarse de que siempre haya al menos una imagen, incluso si es un placeholder
                            images: productImages.length > 0 ? productImages : [{
                                id: simpleHash(productEntry.name + '_placeholder'), // ID único para el placeholder
                                name: 'Sin Imagen',
                                src: 'https://placehold.co/400x300/cccccc/333333?text=Sin+Imagen', // URL del placeholder
                                type: 'image'
                            }]
                        });
                    }
                }
                // Ordenar los productos por nombre
                products.sort((a, b) => a.name.localeCompare(b.name));
                categoryContent = products; // Asignar los productos a categoryContent
            } else {
                // Esto es una categoría de galería (eventos, subcategorías)
                function findMediaFiles(currentDir, currentCategoryPath) {
                    let mediaFiles = [];
                    const currentEntries = fs.readdirSync(currentDir, { withFileTypes: true });

                    for (const currentEntry of currentEntries) {
                        const currentEntryPath = path.join(currentDir, currentEntry.name);
                        const relativePath = path.relative(galleryDir, currentEntryPath).replace(/\\/g, '/'); // Ruta relativa desde 'galeria'
                        const fileExtension = path.extname(currentEntry.name).toLowerCase();
                        const fileNameWithoutExt = path.basename(currentEntry.name, fileExtension);

                        if (currentEntry.isDirectory()) {
                            // Recursivamente buscar en subdirectorios
                            mediaFiles = mediaFiles.concat(findMediaFiles(currentEntryPath, path.join(currentCategoryPath, currentEntry.name)));
                        } else {
                            // Solo añadir archivos multimedia (imágenes y videos)
                            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.jfif'].includes(fileExtension)) {
                                mediaFiles.push({
                                    id: simpleHash(relativePath), // ID estable para la foto
                                    name: fileNameWithoutExt,
                                    src: relativePath, // Ruta relativa desde 'galeria/'
                                    type: 'image'
                                });
                            } else if (['.mp4', '.mov', '.avi', '.webm'].includes(fileExtension)) {
                                mediaFiles.push({
                                    id: simpleHash(relativePath), // ID estable para el video
                                    name: fileNameWithoutExt,
                                    src: relativePath, // Ruta relativa desde 'galeria/'
                                    type: 'video'
                                });
                            }
                        }
                    }
                    return mediaFiles;
                }
                categoryContent = findMediaFiles(entryPath, entry.name);
                // Ordenar el contenido del evento por nombre de archivo para consistencia
                categoryContent.sort((a, b) => a.src.localeCompare(b.src));
            }

            if (categoryContent.length > 0 || isProductCategory) { // Añadir categoría de producto aunque esté vacía si no hay productos
                events.push({
                    name: categoryName,
                    path: categoryName, // La ruta de la categoría (ej. "15años", "tienda-productos")
                    isProductCategory: isProductCategory,
                    // Si es categoría de producto, 'products' contendrá los productos
                    // Si es categoría de galería, 'content' contendrá las fotos/videos
                    [isProductCategory ? 'products' : 'content']: categoryContent 
                });
            }
        }
    }
    // Ordenar eventos/categorías por nombre
    events.sort((a, b) => a.name.localeCompare(b.name));
    return events;
}

try {
    const galleryData = generateGalleryData(galleryDir);
    fs.writeFileSync(dataFilePath, JSON.stringify(galleryData, null, 2), 'utf8');
    console.log('data.json generado exitosamente con IDs estables y rutas correctas.');
} catch (error) {
    console.error('Error al generar data.json:', error);
}

