const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); 
const os = require('os'); 

const app = express();
app.use(cors());

const PORT = process.env.PORT || 5000;
const baseDir = __dirname;

if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

// ========================================================
// 1. CARPETAS FÍSICAS
// ========================================================
const dirActividades = path.join(__dirname, 'actividades_profe');
const dirCalificaciones = path.join(__dirname, 'calificaciones_alumnos');

if (!fs.existsSync(dirActividades)) fs.mkdirSync(dirActividades);
if (!fs.existsSync(dirCalificaciones)) fs.mkdirSync(dirCalificaciones);


// ========================================================
// 2. CONFIGURACIÓN DE MULTER (Los "Carteros")
// ========================================================
// A. Cartero para las calificaciones del alumno
const configCalificaciones = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirCalificaciones),
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const uploadCalificacion = multer({ storage: configCalificaciones });

// B. Cartero para los ZIPs del profesor (Mantiene el nombre original)
const configActividades = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirActividades),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const uploadActividad = multer({ storage: configActividades });


// ========================================================
// 3. RUTAS PARA EL ALUMNO
// ========================================================

// Ver qué actividades hay disponibles en el servidor (con fecha de modificación)
app.get('/api/lista-actividades', (req, res) => {
    fs.readdir(dirActividades, (err, archivos) => {
        if (err) return res.status(500).json({ error: 'Error al leer actividades' });
        
        // Filtramos para que solo muestre archivos .zip
        const zips = archivos.filter(a => a.endsWith('.zip'));
        
        // Extraemos los metadatos de fecha para cada lección
        const datosActividades = zips.map(archivo => {
            const rutaCompleta = path.join(dirActividades, archivo);
            const stats = fs.statSync(rutaCompleta);
            const fecha = stats.mtime.toISOString().split('T')[0]; // Formato: AAAA-MM-DD
            return { nombre: archivo, fecha: fecha };
        });
        
        res.json(datosActividades);
    });
});

// Descargar una actividad
app.get('/api/descargar-actividad/:nombreZip', (req, res) => {
    const rutaArchivo = path.join(dirActividades, req.params.nombreZip);
    if (fs.existsSync(rutaArchivo)) res.download(rutaArchivo); 
    else res.status(404).json({ error: 'Actividad no encontrada.' });
});

// Entregar calificación
app.post('/api/subir-calificacion', uploadCalificacion.single('archivoTxt'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No hay archivo.' });
    res.json({ mensaje: '¡Calificación entregada con éxito!' });
});


// ========================================================
// 4. RUTAS PARA EL PROFESOR
// ========================================================
// Subir una nueva actividad (ZIP)
app.post('/api/subir-actividad', uploadActividad.single('archivoZip'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No hay archivo.' });
    res.json({ mensaje: '¡Actividad publicada en el servidor con éxito!' });
});

// Ver la lista de calificaciones entregadas
app.get('/api/lista-calificaciones', (req, res) => {
    fs.readdir(dirCalificaciones, (err, archivos) => {
        if (err) return res.status(500).json({ error: 'Error al leer calificaciones' });

        const filtrados = archivos.filter(a => a.endsWith('.txt') || a.endsWith('.toro'));
        
        const datosArchivos = filtrados.map(archivo => {
            const rutaCompleta = path.join(dirCalificaciones, archivo);
            const stats = fs.statSync(rutaCompleta);
            const fecha = stats.mtime.toISOString().split('T')[0]; // Formato: AAAA-MM-DD
            return { nombre: archivo, fecha: fecha };
        });
        
        res.json(datosArchivos);
    });
});

app.post('/api/limpiar-buzon', (req, res) => {
    fs.readdir(dirCalificaciones, (err, archivos) => {
        if (err) return res.status(500).json({ error: 'Error al leer el buzón' });
        
        archivos.forEach(archivo => {
            fs.unlinkSync(path.join(dirCalificaciones, archivo));
        });
        res.json({ mensaje: '¡El buzón ha sido vaciado correctamente!' });
    });
});

// Descargar una calificación específica
app.get('/api/descargar-calificacion/:nombreTxt', (req, res) => {
    const rutaArchivo = path.join(dirCalificaciones, req.params.nombreTxt);
    if (fs.existsSync(rutaArchivo)) res.download(rutaArchivo); 
    else res.status(404).json({ error: 'Calificación no encontrada.' });
});


// ========================================================
// 5. INICIALIZACIÓN DEL SERVIDOR
// ========================================================
app.use(express.static(baseDir));

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'localhost';
}
const LAN_IP = getLocalIp();

// Inicialización del servicio amarrado a la escucha omnidireccional
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n======================================================');
    console.log('         SISTEMA T.O.R.O. - SERVIDOR ACTIVO');
    console.log('======================================================');
    console.log(` Infraestructura:   CBTA N.251`);
    console.log(` Puerto de escucha:  ${PORT}`);
    console.log(`Directorio Base:   ${baseDir}`);
    console.log('------------------------------------------------------');
    console.log('  ENLACES DE ACCESO EN LA RED LOCAL (LAN):');
    console.log(`    [1] App Estudiantil Principal:`);
    console.log(`        http://${LAN_IP}:${PORT}`);
    console.log();
    console.log(`    [2] Centro de Sincronización (Alumno):`);
    console.log(`        http://${LAN_IP}:${PORT}/sync-alumno.html`);
    console.log();
    console.log(`    [3] Panel de Control Docente (Profesor):`);
    console.log(`        http://${LAN_IP}:${PORT}/panel-profe.html`);
    console.log('======================================================');
    console.log('  MONITOR DE ACTIVIDAD EN TIEMPO REAL:');
});