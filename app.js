const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Crear una instancia de Express
const app = express();
const port = process.env.PORT || 3000; // Puerto del servidor

// Función para obtener la dirección IP local
const getLocalIPAddress = () => {
    const interfaces = os.networkInterfaces();
    for (const iface in interfaces) {
        for (const alias of interfaces[iface]) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address; // Devuelve la primera IP no interna
            }
        }
    }
    return '127.0.0.1'; // Default en caso de no encontrar otra IP
};

const appip = getLocalIPAddress();
const appaddress = `http://${appip}:${port}/`;

// Configurar CORS para permitir solicitudes con headers personalizados
const corsOptions = {
    origin: '*', // Permitir todas las solicitudes (puedes restringirlo a dominios específicos)
    methods: ['GET'], // Métodos permitidos
    allowedHeaders: ['Content-Type', 'ngrok-skip-browser-warning'], // Permitir headers personalizados
};
app.use(cors(corsOptions));

// Definir la ruta para obtener facturas
app.get('/api/facturas', (req, res) => {
    const filePath = path.join(__dirname, 'facturas_result.json');

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo no encontrado' }); // Respuesta en JSON
    }

    try {
        // Leer solo la primera parte del archivo para obtener la cantidad total de registros
        const json = fs.readFileSync(filePath, 'utf-8');
        let facturas = JSON.parse(json);
        const total = facturas.length;

        // Filtrar por NCF si se recibe un parámetro de búsqueda
        const searchQuery = req.query.search ? req.query.search.trim() : "";
        if (searchQuery) {
            facturas = facturas.filter(factura => {
                const ncf = factura.ncfElectronico ?? factura.NcfElectronico ?? "";
                return ncf.trim().includes(searchQuery);
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        const data = facturas.slice(startIndex, endIndex);

        res.json({
            total, // Número total de registros en la "base de datos"
            page,  // Página actual
            limit, // Límite de registros por página
            data,  // Registros de la página solicitada
        });

    } catch (error) {
        console.error('Error al leer el archivo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor local ejecutandose en ${appaddress}`);
});