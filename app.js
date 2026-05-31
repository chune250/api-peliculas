import express from "express";
import { Sequelize, DataTypes } from "sequelize";
import jwt from "jsonwebtoken";

// ---------- Configuración de la base de datos SQLite ----------
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
  logging: false,
});

// ---------- Definición del modelo Pelicula ----------
const Pelicula = sequelize.define("Pelicula", {
  titulo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  anio: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  genero: {
    type: DataTypes.STRING,
  },
  director: {
    type: DataTypes.STRING,
  },
  calificacion: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
});

// ---------- Creación de la aplicación Express ----------
const app = express();
app.use(express.json()); // Para parsear JSON
app.use(express.urlencoded({ extended: true })); // Opcional, para formularios

// ---------- Middleware Logger (de la guía) ----------
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
  next();
});

// ---------- Clave secreta para JWT (en producción usar variable de entorno) ----------
const SECRET_KEY = "mi_clave_secreta_super_segura";

// ---------- Función para sincronizar BD y cargar datos de ejemplo ----------
async function iniciarBD() {
  // force: true borra y recrea la tabla (solo desarrollo). En producción usar false o migraciones.
  await sequelize.sync({ force: true });
  await Pelicula.bulkCreate([
    {
      titulo: "El Padrino",
      anio: 1972,
      genero: "Drama",
      director: "Francis Ford Coppola",
      calificacion: 9.2,
    },
    {
      titulo: "Interestelar",
      anio: 2014,
      genero: "Ciencia ficción",
      director: "Christopher Nolan",
      calificacion: 8.6,
    },
    {
      titulo: "Pulp Fiction",
      anio: 1994,
      genero: "Crimen",
      director: "Quentin Tarantino",
      calificacion: 8.9,
    },
  ]);
  console.log("✅ Base de datos sincronizada y datos de ejemplo cargados");
}

// ========== 1. RUTA PÚBLICA: LOGIN (genera JWT) ==========
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  // Simulación de validación (en producción usar bcrypt y consultar BD)
  if (username === "admin" && password === "1234") {
    const user = { id: 1, username: "admin" };
    const token = jwt.sign(user, SECRET_KEY, { expiresIn: "2h" });
    res.json({ mensaje: "Login exitoso", token });
  } else {
    res.status(401).json({ error: "Credenciales inválidas" });
  }
});

// ========== 2. MIDDLEWARE DE VERIFICACIÓN DE TOKEN ==========
const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Formato "Bearer TOKEN"
  if (!token) {
    return res.status(401).json({ error: "Token requerido" });
  }
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido o expirado" });
    }
    req.user = decoded; // Guardamos datos del usuario (por si se necesitan en rutas)
    next();
  });
};

// ========== 3. RUTAS PROTEGIDAS (CRUD completo de películas) ==========
// Todas estas requieren el token JWT

// GET todas las películas
app.get("/peliculas", verificarToken, async (req, res, next) => {
  try {
    const peliculas = await Pelicula.findAll();
    res.json(peliculas);
  } catch (error) {
    next(error);
  }
});

// GET una película por ID
app.get("/peliculas/:id", verificarToken, async (req, res, next) => {
  try {
    const pelicula = await Pelicula.findByPk(req.params.id);
    if (pelicula) {
      res.json(pelicula);
    } else {
      res.status(404).json({ error: "Película no encontrada" });
    }
  } catch (error) {
    next(error);
  }
});

// POST crear nueva película
app.post("/peliculas", verificarToken, async (req, res, next) => {
  try {
    const nueva = await Pelicula.create(req.body);
    res.status(201).json(nueva);
  } catch (error) {
    next(error);
  }
});

// PUT actualizar película existente
app.put("/peliculas/:id", verificarToken, async (req, res, next) => {
  try {
    const pelicula = await Pelicula.findByPk(req.params.id);
    if (!pelicula) {
      return res.status(404).json({ error: "Película no encontrada" });
    }
    await pelicula.update(req.body);
    res.json(pelicula);
  } catch (error) {
    next(error);
  }
});

// DELETE eliminar película
app.delete("/peliculas/:id", verificarToken, async (req, res, next) => {
  try {
    const borrados = await Pelicula.destroy({
      where: { id: req.params.id },
    });
    if (borrados) {
      res.json({ mensaje: "Película eliminada correctamente" });
    } else {
      res.status(404).json({ error: "Película no encontrada" });
    }
  } catch (error) {
    next(error);
  }
});

// ========== 4. CONSULTAS ADICIONALES (también protegidas) ==========

// Película con mayor calificación
app.get(
  "/peliculas/estadisticas/mejor",
  verificarToken,
  async (req, res, next) => {
    try {
      const mejor = await Pelicula.findOne({
        order: [["calificacion", "DESC"]],
      });
      res.json(mejor);
    } catch (error) {
      next(error);
    }
  },
);

// Película con menor calificación
app.get(
  "/peliculas/estadisticas/peor",
  verificarToken,
  async (req, res, next) => {
    try {
      const peor = await Pelicula.findOne({ order: [["calificacion", "ASC"]] });
      res.json(peor);
    } catch (error) {
      next(error);
    }
  },
);

// Filtrar por género
app.get("/peliculas/genero/:nombre", verificarToken, async (req, res, next) => {
  try {
    const peliculas = await Pelicula.findAll({
      where: { genero: req.params.nombre },
    });
    res.json(peliculas);
  } catch (error) {
    next(error);
  }
});

// Ordenar por año ascendente
app.get("/peliculas/orden/anio", verificarToken, async (req, res, next) => {
  try {
    const peliculas = await Pelicula.findAll({
      order: [["anio", "ASC"]],
    });
    res.json(peliculas);
  } catch (error) {
    next(error);
  }
});

// ========== 5. MIDDLEWARE DE MANEJO DE ERRORES (global) ==========
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

// ========== 6. INICIAR SERVIDOR ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor JWT corriendo en http://localhost:${PORT}`);
  await iniciarBD();
});
