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
// Ahora soporta subcarpetas dentro de eventos de galería como álbumes.
function generateGalleryData(dir) {
    const categories = []; // Renombrado de 'events' a 'categories' para ser más general
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        // Solo procesar directorios en el nivel raíz de 'galeria'
        if (!entry.isDirectory()) continue; 

        const categoryName = entry.name;
        let isProductCategory = false;

        // Si el nombre de la carpeta es una de las categorías de productos, la tratamos como tal.
        if (['tienda-productos', 'libreria', 'papeleria', 'estampados'].includes(categoryName)) {
            isProductCategory = true;
            const products = [];
            const productEntries = fs.readdirSync(entryPath, { withFileTypes: true });

            for (const productEntry of productEntries) {
                const productPath = path.join(entryPath, productEntry.name);
                // Solo procesar subdirectorios como productos individuales
                if (!productEntry.isDirectory()) continue; 

                const productName = productEntry.name;
                const productImages = [];
                const imageEntries = fs.readdirSync(productPath, { withFileTypes: true });

                for (const imageEntry of imageEntries) {
                    if (imageEntry.isFile()) {
                        const imageExt = path.extname(imageEntry.name).toLowerCase();
                        if (['.jpg', '.jpeg', '.png', '.gif', '.jfif', '.webp'].includes(imageExt)) {
                            const relativePath = path.relative(galleryDir, path.join(productPath, imageEntry.name)).replace(/\\/g, '/');
                            productImages.push({
                                id: simpleHash(relativePath), // ID estable basado en la ruta relativa
                                type: 'image',
                                src: relativePath, // Ruta relativa desde 'galeria'
                                name: path.basename(imageEntry.name, imageExt)
                            });
                        }
                    }
                }
                // Ordenar las imágenes del producto por nombre de archivo para consistencia
                productImages.sort((a, b) => a.src.localeCompare(b.src));

                // Asignar un precio por defecto si no existe (puedes ajustarlo)
                const defaultProductPrice = 1500; 

                products.push({
                    id: simpleHash(path.relative(galleryDir, productPath).replace(/\\/g, '/')), // ID estable para el producto
                    name: productName,
                    path: path.relative(galleryDir, productPath).replace(/\\/g, '/'),
                    price: defaultProductPrice, // Precio por defecto
                    images: productImages // Asegurarse de que images siempre sea un array
                });
            }
            products.sort((a, b) => a.name.localeCompare(b.name));
            categories.push({
                name: categoryName,
                path: categoryName,
                isProductCategory: true,
                products: products
            });
        } else {
            // Lógica para categorías de galería (fotos/videos de eventos como 15años, boliches, casamiento)
            let categoryDirectContent = []; // Para archivos directamente en la carpeta del evento
            let categoryAlbums = []; // Para subcarpetas (álbumes) dentro del evento

            const currentCategoryEntries = fs.readdirSync(entryPath, { withFileTypes: true });
            for (const currentCategoryEntry of currentCategoryEntries) {
                const itemPath = path.join(entryPath, currentCategoryEntry.name);
                const relativeItemPath = path.relative(galleryDir, itemPath).replace(/\\/g, '/');

                if (currentCategoryEntry.isFile()) {
                    // Si es un archivo, añadirlo al contenido directo de la categoría
                    const ext = path.extname(currentCategoryEntry.name).toLowerCase();
                    if (['.jpg', '.jpeg', '.png', '.gif', '.jfif', '.webp'].includes(ext)) {
                        categoryDirectContent.push({
                            id: simpleHash(relativeItemPath),
                            type: 'image',
                            src: relativeItemPath,
                            name: path.basename(currentCategoryEntry.name, ext)
                        });
                    } else if (['.mp4', '.mov', '.avi', '.webm'].includes(ext)) {
                        categoryDirectContent.push({
                            id: simpleHash(relativeItemPath),
                            type: 'video',
                            src: relativeItemPath,
                            name: path.basename(currentCategoryEntry.name, ext)
                        });
                    }
                } else if (currentCategoryEntry.isDirectory()) {
                    // Si es un subdirectorio, tratarlo como un álbum
                    const albumName = currentCategoryEntry.name;
                    const albumContent = [];
                    const albumEntries = fs.readdirSync(itemPath, { withFileTypes: true });

                    for (const albumEntry of albumEntries) {
                        if (albumEntry.isFile()) {
                            const albumFileExt = path.extname(albumEntry.name).toLowerCase();
                            const albumRelativePath = path.relative(galleryDir, path.join(itemPath, albumEntry.name)).replace(/\\/g, '/');
                            if (['.jpg', '.jpeg', '.png', '.gif', '.jfif', '.webp'].includes(albumFileExt)) {
                                albumContent.push({
                                    id: simpleHash(albumRelativePath),
                                    type: 'image',
                                    src: albumRelativePath,
                                    name: path.basename(albumEntry.name, albumFileExt)
                                });
                            } else if (['.mp4', '.mov', '.avi', '.webm'].includes(albumFileExt)) {
                                albumContent.push({
                                    id: simpleHash(albumRelativePath),
                                    type: 'video',
                                    src: albumRelativePath,
                                    name: path.basename(albumEntry.name, albumFileExt)
                                });
                            }
                        }
                    }
                    albumContent.sort((a, b) => a.src.localeCompare(b.src));
                    if (albumContent.length > 0) { // Solo añadir álbumes que contengan archivos
                        categoryAlbums.push({
                            id: simpleHash(relativeItemPath), // ID estable para el álbum
                            name: albumName,
                            path: relativeItemPath,
                            content: albumContent
                        });
                    }
                }
            }
            categoryDirectContent.sort((a, b) => a.src.localeCompare(b.src));
            categoryAlbums.sort((a, b) => a.name.localeCompare(b.name));

            const categoryObject = {
                name: categoryName,
                path: categoryName,
                isProductCategory: false,
            };
            if (categoryDirectContent.length > 0) {
                categoryObject.content = categoryDirectContent; // Archivos directos en la categoría
            }
            if (categoryAlbums.length > 0) {
                categoryObject.albums = categoryAlbums; // Subcarpetas como álbumes
            }
            categories.push(categoryObject);
        }
    }
    // Ordenar categorías principales por nombre
    categories.sort((a, b) => a.name.localeCompare(b.name));
    return categories;
}

try {
    const galleryData = generateGalleryData(galleryDir);
    fs.writeFileSync(dataFilePath, JSON.stringify(galleryData, null, 2), 'utf8');
    console.log('data.json generado exitosamente con IDs estables y rutas correctas, incluyendo subcarpetas de galería como álbumes separados.');
} catch (error) {
    console.error('Error al generar data.json:', error);
}
