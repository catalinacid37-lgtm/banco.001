const http = require('http');
const fs = require('fs');

const PORT = 3000;
const FILE = 'data.json';

// Leer datos
function leerDatos(cb) {
    fs.readFile(FILE, 'utf8', (err, data) => {
        if (err) return cb(err);
        cb(null, JSON.parse(data));
    });
}

// Guardar datos
function guardarDatos(data, cb) {
    fs.writeFile(FILE, JSON.stringify(data, null, 2), cb);
}

const server = http.createServer((req, res) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    // GET
    if (req.method === 'GET') {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const filtro = url.searchParams.get('filtro');

        leerDatos((err, db) => {
            if (err) {
                res.writeHead(500);
                return res.end(JSON.stringify({ error: 'Error leyendo archivo' }));
            }

            if (filtro === 'rut') {
                const filtrados = db.clientes.filter(c => c.cuentaRUT);
                return res.end(JSON.stringify({ clientes: filtrados }));
            }

            res.end(JSON.stringify(db));
        });
    }

    // POST
    else if (req.method === 'POST') {
        let body = '';

        req.on('data', chunk => body += chunk);

        req.on('end', () => {
            const datos = JSON.parse(body);

            leerDatos((err, db) => {

                // Nuevo cliente + RUT
                if (datos.accion === 'nuevo_cliente_rut') {
                    db.clientes.push({
                        id: Date.now(),
                        nombre: datos.nombre,
                        cuentaRUT: {
                            numero: datos.numero,
                            saldo: datos.saldo
                        },
                        cuentasAhorro: []
                    });
                }

                // Nuevo cliente + ahorro
                else if (datos.accion === 'nuevo_cliente_ahorro') {
                    db.clientes.push({
                        id: Date.now(),
                        nombre: datos.nombre,
                        cuentaRUT: null,
                        cuentasAhorro: [
                            { numero: datos.numero, saldo: datos.saldo }
                        ]
                    });
                }

                // Agregar RUT
                else if (datos.accion === 'agregar_rut') {
                    const c = db.clientes.find(c => c.id == datos.id);

                    if (c) {
                        if (c.cuentaRUT) {
                            return res.end(JSON.stringify({ error: 'Ya tiene RUT' }));
                        }

                        c.cuentaRUT = {
                            numero: datos.numero,
                            saldo: datos.saldo
                        };
                    }
                }

                // Agregar ahorro
                else if (datos.accion === 'agregar_ahorro') {
                    const c = db.clientes.find(c => c.id == datos.id);

                    if (c) {
                        c.cuentasAhorro.push({
                            numero: datos.numero,
                            saldo: datos.saldo
                        });
                    }
                }

                guardarDatos(db, () => {
                    res.end(JSON.stringify({ mensaje: 'OK' }));
                });
            });
        });
    }

    // DELETE
    else if (req.method === 'DELETE') {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const id = url.searchParams.get('id');
        const tipo = url.searchParams.get('tipo');
        const numero = url.searchParams.get('numero');

        leerDatos((err, db) => {

            if (tipo === 'cliente') {
                db.clientes = db.clientes.filter(c => c.id != id);
            }

            else if (tipo === 'rut') {
                const c = db.clientes.find(c => c.id == id);

                if (c) {
                    if (c.cuentasAhorro.length === 0) {
                        return res.end(JSON.stringify({
                            error: 'No puede quedar sin cuentas'
                        }));
                    }

                    c.cuentaRUT = null;
                }
            }

            else if (tipo === 'ahorro') {
                const c = db.clientes.find(c => c.id == id);

                if (c) {
                    c.cuentasAhorro = c.cuentasAhorro.filter(a => a.numero != numero);

                    if (!c.cuentaRUT && c.cuentasAhorro.length === 0) {
                        return res.end(JSON.stringify({
                            error: 'No puede quedar sin cuentas'
                        }));
                    }
                }
            }

            guardarDatos(db, () => {
                res.end(JSON.stringify({ mensaje: 'Eliminado' }));
            });
        });
    }

    else {
        res.writeHead(405);
        res.end(JSON.stringify({ error: 'Método no permitido' }));
    }
});

server.listen(PORT, () => {
    console.log('Servidor funcionando en http://localhost:3000');
});
