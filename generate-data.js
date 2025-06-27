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
                        const productName = productEntry.name;
                        const productImages = [];
                        
                        // Leer contenido de la carpeta de producto (imágenes/videos)
                        const itemEntries = fs.readdirSync(productPath, { withFileTypes: true });
                        for (const itemEntry of itemEntries) {
                            const itemFullPath = path.join(productPath, itemEntry.name);
                            // La ruta src debe ser relativa a la carpeta 'galeria/'
                            const itemRelativePath = path.relative(galleryDir, itemFullPath).replace(/\\/g, '/'); // Asegurar barras correctas
                            const fileExtension = path.extname(itemEntry.name).toLowerCase();
                            let type = 'unknown';

                            if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.jfif'].includes(fileExtension)) {
                                type = 'image';
                            } else if (['.mp4', '.mov', '.avi', '.webm'].includes(fileExtension)) {
                                type = 'video';
                            }

                            if (type !== 'unknown') {
                                productImages.push({
                                    id: simpleHash(itemRelativePath), // ID estable basado en la ruta relativa
                                    type: type,
                                    src: itemRelativePath, // Ruta relativa a 'galeria/'
                                    name: itemEntry.name.split('.')[0] // Nombre sin extensión
                                });
                            }
                        }
                        // Ordenar imágenes de producto por nombre de archivo
                        productImages.sort((a, b) => a.src.localeCompare(b.src));

                        if (productImages.length > 0) {
                            products.push({
                                id: simpleHash(path.relative(galleryDir, productPath)), // ID estable para el producto
                                name: productName,
                                path: path.relative(galleryDir, productPath).replace(/\\/g, '/'), // Ruta relativa del producto
                                images: productImages
                            });
                        }
                    }
                }
                // Ordenar productos por nombre
                products.sort((a, b) => a.name.localeCompare(b.name));
                categoryContent = products; // El contenido de la categoría de productos son los productos

            } else { // Es una categoría de evento normal
                // Función recursiva para encontrar archivos de medios
                function findMediaFiles(currentPath, currentRelativePath) {
                    const currentEntries = fs.readdirSync(currentPath, { withFileTypes: true });
                    const mediaFiles = [];

                    for (const currentEntry of currentEntries) {
                        const subPath = path.join(currentPath, currentEntry.name);
                        const subRelativePath = path.join(currentRelativePath, currentEntry.name).replace(/\\/g, '/');

                        if (currentEntry.isDirectory()) {
                            // Si es un directorio, busca dentro de él
                            mediaFiles.push(...findMediaFiles(subPath, subRelativePath));
                        } else {
                            // Si es un archivo, verifica si es multimedia
                            const fileExtension = path.extname(currentEntry.name).toLowerCase();
                            let type = 'unknown';
                            if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.jfif'].includes(fileExtension)) {
                                type = 'image';
                            } else if (['.mp4', '.mov', '.avi', '.webm'].includes(fileExtension)) {
                                type = 'video';
                            }

                            if (type !== 'unknown') {
                                mediaFiles.push({
                                    id: simpleHash(subRelativePath), // ID estable para el archivo multimedia
                                    type: type,
                                    src: subRelativePath, // Ruta relativa a 'galeria/'
                                    name: currentEntry.name.split('.')[0] // Nombre sin extensión
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

