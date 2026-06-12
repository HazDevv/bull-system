// ── gestionMaterias.js
// Funciones del módulo GestionMaterias extraídas para pruebas unitarias.

// ── Variable de conexión a la base de datos (inyectable desde los tests)
let db = null;

/** Permite a los tests inyectar un mock de db */
function setDb(mockDb) {
    db = mockDb;
}

// ── FUNCIÓN 1: obtenerMateriasDB
function obtenerMateriasDB() {
    return new Promise((resolve, reject) => {
        if (!db) {
            inicializarDB().then(() => ejecutarConsulta());
        } else {
            ejecutarConsulta();
        }

        function ejecutarConsulta() {
            const transaction = db.transaction(['materias'], 'readonly');
            const store = transaction.objectStore('materias');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        }
    });
}

// ── FUNCIÓN 2: eliminarMateria
async function eliminarMateria(event, idMateria, nombreMateria) {
    event.stopPropagation();

    const confirmar = confirm(
        `¿Estás seguro de eliminar "${nombreMateria}"?\nSe borrarán permanentemente todas las lecciones asociadas.`
    );
    if (!confirmar) return;

    try {
        if (!db) await inicializarDB();

        const transaction = db.transaction(['materias', 'lecciones'], 'readwrite');
        const storeMaterias = transaction.objectStore('materias');
        const storeLecciones = transaction.objectStore('lecciones');

        storeMaterias.delete(idMateria);

        const cursorRequest = storeLecciones.openCursor();
        cursorRequest.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                if (cursor.value.materia_id === idMateria) {
                    cursor.delete();
                }
                cursor.continue();
            }
        };

        transaction.oncomplete = () => {
            //console.log(`Materia ${idMateria} y sus lecciones eliminadas.`);
            cargarPantallaMaterias();
        };

    } catch (error) {
        console.error('Error al eliminar materia:', error);
        alert('Hubo un error al intentar eliminar la materia.');
    }
}

// ── FUNCIÓN 3: cargarPantallaMaterias
async function cargarPantallaMaterias() {
    const nombre = localStorage.getItem('toro_nombre') || 'Estudiante';
    const main = document.getElementById('main-content');
    let materias = [];
    try {
        materias = await obtenerMateriasDB();
    } catch (e) {
        console.error('Error cargando materias:', e);
    }
    main.innerHTML = `
        <div class="materias-view-container">
            <h1 class="titulo-mis-materias">Mis materias</h1>
            <p class="bienvenida-texto">Materias disponibles</p>
            <div id="lista-materias" class="materias-grid">
                ${materias.length === 0
                    ? `<div class="sin-materias-container">
                         <p class="mensaje-sin-materias">Aún no tienes materias agregadas</p>
                       </div>`
                    : materias.map(m => `
                        <div class="card-materia" onclick="entrarAMateria(${m.id}, '${m.nombre}')">
                            <div class="card-header-color" style="background-color: ${m.color}"></div>
                            <div class="card-body">
                                <h3>${m.nombre}</h3>
                                <p>Grupo ${m.grupo}</p>
                                <p>${m.ciclo}</p>
                                <button class="btn-borrar-card" onclick="eliminarMateria(event, ${m.id}, '${m.nombre}')">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
            <button class="fab-add" onclick="abrirModalMateria()">+</button>
            <button class="btn-toro btn-gray" onclick="cerrarSesion()">Cambiar de usuario</button>
        </div>
    `;
}

// ── Stub mínimo de inicializarDB
function inicializarDB() {
    return Promise.resolve(db);
}

module.exports = { obtenerMateriasDB, eliminarMateria, cargarPantallaMaterias, setDb };
