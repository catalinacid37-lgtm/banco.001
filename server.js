const http = require('http');
const fs = require('fs');

const PORT = 3000;
const FILE = 'data.json';

// 📌 Leer JSON
function leerDatos(callback) {
    fs.readFile(FILE, 'utf8', (err, data) => {
        if (err) return callback(err);
        callback(null, JSON.parse(data));
    });
}

// 📌 Guardar JSON
function guardarDatos(data, callback) {
    fs.writeFile(FILE, JSON.stringify(data, null, 2), callback);
}

const server = http.createServer((req, res) => {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
        leerDatos((err, data) => {
            res.end(JSON.stringify(data));
        });
    }

    // 📌 POST (crear o agregar cuentas)
    else if (req.method === 'POST') {
        let body = '';

        req.on('data', chunk => body += chunk);

        req.on('end', () => {
            const datos = JSON.parse(body);

            leerDatos((err, db) => {

                // ➤ Nuevo cliente
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

                // ➤ Agregar cuenta RUT
                else if (datos.accion === 'agregar_rut') {
                    const cliente = db.clientes.find(c => c.id == datos.id);
                    if (cliente && !cliente.cuentaRUT) {
                        cliente.cuentaRUT = {
                            numero: datos.numero,
                            saldo: datos.saldo
                        };
                    }
                }

                // ➤ Agregar cuenta ahorro
                else if (datos.accion === 'agregar_ahorro') {
                    const cliente = db.clientes.find(c => c.id == datos.id);
                    if (cliente) {
                        cliente.cuentasAhorro.push({
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

    // 📌 DELETE
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
                const cliente = db.clientes.find(c => c.id == id);
                if (cliente) cliente.cuentaRUT = null;
            }

            else if (tipo === 'ahorro') {
                const cliente = db.clientes.find(c => c.id == id);
                if (cliente) {
                    cliente.cuentasAhorro = cliente.cuentasAhorro.filter(a => a.numero != numero);
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

server.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
