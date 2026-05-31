const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para JSON
app.use(express.json());

// Conectar a la base de datos (se crea el archivo peliculas.db)
const db = new Database(path.join(__dirname, "peliculas.db"));

// Crear tabla de películas si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS peliculas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    director TEXT NOT NULL,
    anio INTEGER,
    genero TEXT,
    disponible BOOLEAN DEFAULT 1
  )
`);

// Insertar datos de ejemplo si la tabla está vacía
const count = db.prepare("SELECT COUNT(*) as total FROM peliculas").get();
if (count.total === 0) {
  const insert = db.prepare(`
    INSERT INTO peliculas (titulo, director, anio, genero, disponible)
    VALUES (?, ?, ?, ?, ?)
  `);
  insert.run("El Padrino", "Francis Ford Coppola", 1972, "Drama", 1);
  insert.run("Inception", "Christopher Nolan", 2010, "Ciencia ficción", 1);
  insert.run("Toy Story", "John Lasseter", 1995, "Animación", 1);
  console.log("✅ Datos de ejemplo insertados");
}

// ========== RUTAS ==========

// GET - Obtener todas las películas
app.get("/peliculas", (req, res) => {
  try {
    const peliculas = db.prepare("SELECT * FROM peliculas").all();
    res.json({ exito: true, data: peliculas });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

// GET - Obtener una película por ID
app.get("/peliculas/:id", (req, res) => {
  try {
    const id = req.params.id;
    const pelicula = db.prepare("SELECT * FROM peliculas WHERE id = ?").get(id);
    if (!pelicula) {
      return res
        .status(404)
        .json({ exito: false, mensaje: "Película no encontrada" });
    }
    res.json({ exito: true, data: pelicula });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

// POST - Crear una nueva película
app.post("/peliculas", (req, res) => {
  try {
    const { titulo, director, anio, genero, disponible } = req.body;
    if (!titulo || !director) {
      return res.status(400).json({
        exito: false,
        mensaje: "Faltan campos: titulo y director son obligatorios",
      });
    }
    const insert = db.prepare(`
      INSERT INTO peliculas (titulo, director, anio, genero, disponible)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = insert.run(
      titulo,
      director,
      anio || null,
      genero || null,
      disponible !== undefined ? disponible : 1,
    );
    const nueva = db
      .prepare("SELECT * FROM peliculas WHERE id = ?")
      .get(info.lastInsertRowid);
    res.status(201).json({ exito: true, data: nueva });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

// PUT - Actualizar una película (parcial o completamente)
app.put("/peliculas/:id", (req, res) => {
  try {
    const id = req.params.id;
    const { titulo, director, anio, genero, disponible } = req.body;

    const existe = db.prepare("SELECT id FROM peliculas WHERE id = ?").get(id);
    if (!existe) {
      return res
        .status(404)
        .json({ exito: false, mensaje: "Película no encontrada" });
    }

    const updates = [];
    const valores = [];
    if (titulo !== undefined) {
      updates.push("titulo = ?");
      valores.push(titulo);
    }
    if (director !== undefined) {
      updates.push("director = ?");
      valores.push(director);
    }
    if (anio !== undefined) {
      updates.push("anio = ?");
      valores.push(anio);
    }
    if (genero !== undefined) {
      updates.push("genero = ?");
      valores.push(genero);
    }
    if (disponible !== undefined) {
      updates.push("disponible = ?");
      valores.push(disponible);
    }

    if (updates.length === 0) {
      return res
        .status(400)
        .json({ exito: false, mensaje: "No hay datos para actualizar" });
    }
    valores.push(id);
    const updateStmt = db.prepare(
      `UPDATE peliculas SET ${updates.join(", ")} WHERE id = ?`,
    );
    updateStmt.run(...valores);

    const actualizada = db
      .prepare("SELECT * FROM peliculas WHERE id = ?")
      .get(id);
    res.json({ exito: true, data: actualizada });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

// DELETE - Eliminar una película
app.delete("/peliculas/:id", (req, res) => {
  try {
    const id = req.params.id;
    const existe = db.prepare("SELECT * FROM peliculas WHERE id = ?").get(id);
    if (!existe) {
      return res
        .status(404)
        .json({ exito: false, mensaje: "Película no encontrada" });
    }
    db.prepare("DELETE FROM peliculas WHERE id = ?").run(id);
    res.json({ exito: true, mensaje: "Película eliminada", data: existe });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

// Ruta raíz
app.get("/", (req, res) => {
  res.send("🎬 API de Películas funcionando. Usa /peliculas");
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET    /peliculas`);
  console.log(`  GET    /peliculas/:id`);
  console.log(`  POST   /peliculas`);
  console.log(`  PUT    /peliculas/:id`);
  console.log(`  DELETE /peliculas/:id`);
});
