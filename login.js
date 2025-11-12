const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mercadopago = require("mercadopago");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = 3000;
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log("✅ Conectado a Neon"))
  .catch(err => console.error("❌ Error al conectar a Neon:", err));





const client = new mercadopago.MercadoPagoConfig({
  accessToken: "APP_USR-7845813756302431-111001-c8ba092d8e1f1a3b46cb0e51af868109-2977405604" 
});

app.post("/pago", async (req, res) => {
  try {
    const { carrito } = req.body;

    const items = carrito.map(item => ({
      title: item.nombre,
      quantity: 1,
      currency_id: "ARS",
      unit_price:1
    }));

    const preference = {
      items,
      back_urls: {
        success: "http://localhost:3000/success.html",
        failure: "http://localhost:3000/error.html",
        pending: "http://localhost:3000/pending.html"
      },
    };

    const prefClient = new mercadopago.Preference(client);
    const result = await prefClient.create({ body: preference });

    console.log("✅ Preferencia creada:", result.id);
    res.json({ preferenceId: result.id }); 
  } catch (error) {
    console.error("❌ Error al crear preferencia:", error);
    res.status(500).json({ message: "Error al crear preferencia" });
  }
});

app.use(express.static(path.join(__dirname, 'public')));


app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM usuario WHERE (nombre = ? OR correo = ?) AND clave = ?';
  db.query(query, [username, username, password], (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).json({ message: 'Error en la base de datos' });
    
    }

    if (results.length > 0) {
      const user = results[0];
      return res.json({
        success: true,
        message: 'Login exitoso',
        userId: user.id,
        nombre: user.nombre
      });
    } else {
      return res.json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }
  });
});



app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

app.post('/register', (req, res) => {
  const { nombre, correo, clave } = req.body;

  if (!nombre || !correo || !clave) {
    return res.status(400).json({ message: 'Faltan datos' });
  }

  
  const checkQuery = 'SELECT * FROM usuario WHERE correo = ? OR nombre = ?';
  db.query(checkQuery, [correo, nombre], (err, results) => {
    if (err) {
      console.error('Error en la verificación:', err);
      return res.status(500).json({ message: 'Error en la base de datos' });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'El usuario o correo ya están registrados' });
    }

    
    const insertQuery = 'INSERT INTO usuario (nombre, correo, clave) VALUES (?, ?, ?)';
    db.query(insertQuery, [nombre, correo, clave], (err, result) => {
      if (err) {
        console.error('Error al registrar usuario:', err);
        return res.status(500).json({ message: 'Error al registrar usuario' });
      }

      res.json({ message: '✅ Usuario registrado correctamente' });
    });
  });
});

app.post('/carrito', (req, res) => {
  let { usuario_id, producto_id, cantidad, total } = req.body;

  
  if (!usuario_id) {
    const tempEmail = `guest_${Date.now()}@cybermate.com`;
    const tempUser = `invitado_${Date.now()}`;

    const insertUser = 'INSERT INTO usuario (nombre, correo, clave) VALUES (?, ?, ?)';
    db.query(insertUser, [tempUser, tempEmail, 'guest'], (err, result) => {
      if (err) {
        console.error('Error al crear usuario temporal:', err);
        return res.status(500).json({ success: false, message: 'Error al crear usuario temporal' });
      }

      usuario_id = result.insertId; 

      const query = 'INSERT INTO carrito (usuario_id, producto_id, cantidad, total) VALUES (?, ?, ?, ?)';
      db.query(query, [usuario_id, producto_id, cantidad, total], (err2) => {
        if (err2) {
          console.error('Error al guardar carrito:', err2);
          return res.status(500).json({ success: false, message: 'Error al guardar carrito' });
        }

        res.json({ success: true, message: 'Compra guardada como invitado', usuario_id });
      });
    });
  } else {
  
    const query = 'INSERT INTO carrito (usuario_id, producto_id, cantidad, total) VALUES (?, ?, ?, ?)';
    db.query(query, [usuario_id, producto_id, cantidad, total], (err) => {
      if (err) {
        console.error('Error al guardar carrito:', err);
        return res.status(500).json({ success: false, message: 'Error al guardar carrito' });
      }

      res.json({ success: true, message: 'Compra guardada con usuario registrado' });
    });
  }
});
app.post('/producto', (req, res) => {
  const { nombre, precio } = req.body;

  const queryCheck = 'SELECT * FROM producto WHERE nombre = ?';
  db.query(queryCheck, [nombre], (err, results) => {
    if (err) return res.status(500).json({ message: 'Error en la base de datos' });

    if (results.length > 0) {
    
      return res.json({ id: results[0].id });
    }

    
    const queryInsert = 'INSERT INTO producto (nombre, precio) VALUES (?, ?)';
    db.query(queryInsert, [nombre, precio], (err, result) => {
      if (err) return res.status(500).json({ message: 'Error al registrar producto' });
      res.json({ id: result.insertId });
    });
  });
});

