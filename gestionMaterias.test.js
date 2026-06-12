/**
 * PRUEBAS UNITARIAS — GestionMaterias
 * Archivo: gestionMaterias.test.js
 *
 * Cubre:
 *   - obtenerMateriasDB()
 *   - eliminarMateria()
 *   - cargarPantallaMaterias()
 */

const gm = require('./gestionMaterias');

// ══════════════════════════════════════════════════════════════
// HELPER — mock de IndexedDB con resolución asíncrona controlada
// ══════════════════════════════════════════════════════════════
function crearMockDB(dataMaterias = []) {
    const makeGetAllRequest = (result) => {
        const req = { result, onsuccess: null, onerror: null };
        Promise.resolve().then(() => req.onsuccess && req.onsuccess());
        return req;
    };

    const mockStore = {
        getAll:      jest.fn(() => makeGetAllRequest(dataMaterias)),
        delete:      jest.fn(),
        openCursor:  jest.fn(() => {
            const req = { onsuccess: null };
            Promise.resolve().then(() =>
                req.onsuccess && req.onsuccess({ target: { result: null } })
            );
            return req;
        }),
    };

    const mockTransaction = {
        objectStore: jest.fn(() => mockStore),
        oncomplete:  null,
    };

    return {
        transaction: jest.fn(() => {
            // Programamos oncomplete para que se llame después de las microtasks
            setTimeout(() => mockTransaction.oncomplete && mockTransaction.oncomplete(), 0);
            return mockTransaction;
        }),
        _mockStore:       mockStore,
        _mockTransaction: mockTransaction,
    };
}

// ══════════════════════════════════════════════════════════════
// SUITE 1 — obtenerMateriasDB()
// ══════════════════════════════════════════════════════════════

describe('obtenerMateriasDB()', () => {

    test('GM-001 — devuelve un arreglo con las materias almacenadas', async () => {
        gm.setDb(crearMockDB([
            { id: 1, nombre: 'Matemáticas', grupo: 'A', ciclo: '2024', color: '#82bda1' },
            { id: 2, nombre: 'Física',      grupo: 'B', ciclo: '2024', color: '#82bda1' },
        ]));

        const materias = await gm.obtenerMateriasDB();
        expect(Array.isArray(materias)).toBe(true);
        expect(materias).toHaveLength(2);
    });

    test('GM-002 — cada materia tiene las propiedades id, nombre, grupo y ciclo', async () => {
        gm.setDb(crearMockDB([
            { id: 1, nombre: 'Matemáticas', grupo: 'A', ciclo: '2024', color: '#82bda1' },
        ]));

        const materias = await gm.obtenerMateriasDB();
        const primera = materias[0];
        expect(primera).toHaveProperty('id');
        expect(primera).toHaveProperty('nombre');
        expect(primera).toHaveProperty('grupo');
        expect(primera).toHaveProperty('ciclo');
    });

    test('GM-003 — devuelve arreglo vacío cuando no hay materias registradas', async () => {
        gm.setDb(crearMockDB([]));

        const materias = await gm.obtenerMateriasDB();
        expect(materias).toHaveLength(0);
    });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2 — eliminarMateria()
// ══════════════════════════════════════════════════════════════

describe('eliminarMateria()', () => {

    beforeEach(() => {
        global.confirm               = jest.fn();
        global.alert                 = jest.fn();
        global.localStorage          = { getItem: jest.fn(() => null) };
        global.cargarPantallaMaterias = jest.fn();
    });

    afterEach(() => jest.clearAllMocks());

    const evento = { stopPropagation: jest.fn() };

    test('GM-004 — NO abre transacción si el usuario cancela el diálogo', async () => {
        global.confirm.mockReturnValue(false);
        const mockDB = crearMockDB();
        gm.setDb(mockDB);

        await gm.eliminarMateria(evento, 1, 'Matemáticas');

        expect(mockDB.transaction).not.toHaveBeenCalled();
    });

    test('GM-005 — abre transacción readwrite sobre materias y lecciones cuando el usuario confirma', async () => {
        global.confirm.mockReturnValue(true);
        const mockDB = crearMockDB();
        gm.setDb(mockDB);

        await gm.eliminarMateria(evento, 1, 'Matemáticas');

        expect(mockDB.transaction).toHaveBeenCalledWith(
            ['materias', 'lecciones'],
            'readwrite'
        );
    });

    test('GM-006 — siempre detiene la propagación del evento', async () => {
        global.confirm.mockReturnValue(false);
        const ev = { stopPropagation: jest.fn() };

        await gm.eliminarMateria(ev, 1, 'Matemáticas');

        expect(ev.stopPropagation).toHaveBeenCalled();
    });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3 — cargarPantallaMaterias()
// ══════════════════════════════════════════════════════════════

describe('cargarPantallaMaterias()', () => {

    let mainEl;

    beforeEach(() => {
        mainEl = { innerHTML: '' };
        global.localStorage = {
            getItem: jest.fn((key) => key === 'toro_nombre' ? 'Haziel' : null),
        };
        global.document = {
            getElementById: jest.fn(() => mainEl),
        };
    });

    afterEach(() => jest.clearAllMocks());

    test('GM-007 — muestra mensaje "Aún no tienes materias agregadas" cuando la lista está vacía', async () => {
        gm.setDb(crearMockDB([]));

        await gm.cargarPantallaMaterias();

        expect(mainEl.innerHTML).toContain('Aún no tienes materias agregadas');
    });

    test('GM-008 — renderiza el nombre de cada materia como tarjeta cuando hay datos', async () => {
        gm.setDb(crearMockDB([
            { id: 1, nombre: 'Redes',   grupo: '3A', ciclo: '2024', color: '#82bda1' },
            { id: 2, nombre: 'POO',     grupo: '3B', ciclo: '2024', color: '#82bda1' },
        ]));

        await gm.cargarPantallaMaterias();

        expect(mainEl.innerHTML).toContain('Redes');
        expect(mainEl.innerHTML).toContain('POO');
        expect(mainEl.innerHTML).not.toContain('Aún no tienes materias agregadas');
    });

    test('GM-009 — consulta el nombre del alumno desde localStorage', async () => {
        gm.setDb(crearMockDB([]));

        await gm.cargarPantallaMaterias();

        expect(global.localStorage.getItem).toHaveBeenCalledWith('toro_nombre');
    });
});
