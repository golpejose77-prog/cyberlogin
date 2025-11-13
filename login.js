import express from "express";
import path from "path";
import bodyParser from "body-parser";
import mercadopago from "mercadopago";
import dotenv from "dotenv";
import pkg from "pg";
import { fileURLToPath } from "url";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

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
      unit_price: 1
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

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const query = 'SELECT * FROM usuario WHERE (nombre = $1 OR correo = $1) AND clave = $2';
    const { rows } = await pool.query(query, [username, password]);

    if (rows.length > 0) {
      const user = rows[0];
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
  } catch (err) {
    console.error('Error en la consulta:', err);
    res.status(500).json({ message: 'Error en la base de datos' });
  }
});


app.post('/register', async (req, res) => {
  const { nombre, correo, clave } = req.body;

  if (!nombre || !correo || !clave) {
    return res.status(400).json({ message: 'Faltan datos' });
  }

  try {
    const checkQuery = 'SELECT * FROM usuario WHERE correo = $1 OR nombre = $2';
    const check = await pool.query(checkQuery, [correo, nombre]);

    if (check.rows.length > 0) {
      return res.status(400).json({ message: 'El usuario o correo ya están registrados' });
    }

    const insertQuery = 'INSERT INTO usuario (nombre, correo, clave) VALUES ($1, $2, $3)';
    await pool.query(insertQuery, [nombre, correo, clave]);

    res.json({ message: '✅ Usuario registrado correctamente' });
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
});


app.post('/producto', async (req, res) => {
  const { nombre, precio } = req.body;

  try {
    const queryCheck = 'SELECT * FROM producto WHERE nombre = $1';
    const check = await pool.query(queryCheck, [nombre]);

    if (check.rows.length > 0) {
      return res.json({ id: check.rows[0].id });
    }

    const queryInsert = 'INSERT INTO producto (nombre, precio) VALUES ($1, $2) RETURNING id';
    const result = await pool.query(queryInsert, [nombre, precio]);

    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Error al registrar producto:', err);
    res.status(500).json({ message: 'Error al registrar producto' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
app.post("/carrito", async (req, res) => {
  try {
    const { usuario_id, producto_id, cantidad, total } = req.body;
    console.log("🛒 Datos recibidos en /carrito:", req.body);

    if (!producto_id || !cantidad || !total) {
      return res.status(400).json({ ok: false, msg: "Faltan datos en la solicitud" });
    }

    const uid = usuario_id && !isNaN(usuario_id) ? usuario_id : null;

    const query = `
      INSERT INTO carrito (usuario_id, producto_id, cantidad, total)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const values = [uid, producto_id, cantidad, total];

    const result = await pool.query(query, values);
    console.log("✅ Carrito guardado en BD:", result.rows[0]);

    res.json({ ok: true, id: result.rows[0].id });
  } catch (error) {
    console.error("❌ Error al guardar carrito:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});
app.post("/contacto", async (req, res) => {
  const { nombre, correo, mensaje } = req.body;

  if (!nombre || !correo || !mensaje) {
    return res.status(400).json({ ok: false, error: "Faltan datos" });
  }
app.post("/contacto", async (req, res) => {
  try {
    const { nombre, correo, mensaje } = req.body;

    if (!nombre || !correo || !mensaje) {
      return res.status(400).json({ ok: false, error: "Datos incompletos" });
    }

    const result = await pool.query(
      "INSERT INTO contacto (nombre, correo, mensaje) VALUES ($1, $2, $3) RETURNING *",
      [nombre, correo, mensaje]
    );

    res.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error al guardar contacto:", error);
    res.status(500).json({ ok: false, error: "Error en el servidor" });
  }
});

app.post("/suscribirse", async (req, res) => {
  try {
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({ ok: false, message: "Falta el correo" });
    }

    const check = await pool.query("SELECT * FROM suscritos WHERE correo = $1", [correo]);
    if (check.rows.length > 0) {
      return res.json({ ok: true, message: "Ya estás suscripto ✅" });
    }

    await pool.query("INSERT INTO suscritos (correo) VALUES ($1)", [correo]);
    res.json({ ok: true, message: "Correo suscripto correctamente ✅" });

  } catch (error) {
    console.error("❌ Error en /suscribirse:", error);
    res.status(500).json({ ok: false, message: "Error al guardar el correo" });
  }
});
