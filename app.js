const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "peliculas.json");

app.use(express.json());

// Cargar datos iniciales si no existe el archivo
let peliculas = [];
let nextId = 1;

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(data);
      peliculas = parsed.peliculas;
      nextId = parsed.nextId;
      console.log(`✅ Cargadas ${peliculas.length} películas desde archivo`);
    } else {
      // Datos de ejemplo
      peliculas = [
        {
          id: 1,
          titulo: "El Padrino",
          director: "Francis Ford Coppola",
          anio: 1972,
          genero: "Drama",
          disponible: true,
        },
        {
          id: 2,
          titulo: "Inception",
          director: "Christopher Nolan",
          anio: 2010,
          genero: "Ciencia ficción",
          disponible: true,
        },
        {
          id: 3,
          titulo: "Toy Story",
          director: "John Lasseter",
          anio: 1995,
          genero: "Animación",
          disponible: true,
        },
      ];
      nextId = 4;
      saveData();
      console.log("✅ Datos de ejemplo creados");
    }
  } catch (err) {
    console.error("Error cargando datos:", err);
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ peliculas, nextId }, null, 2));
  } catch (err) {
    console.error("Error guardando datos:", err);
  }
}

loadData();

// RUTAS
app.get("/peliculas", (req, res) => {
  res.json({ exito: true, data: peliculas });
});

app.get("/peliculas/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const pelicula = peliculas.find((p) => p.id === id);
  if (!pelicula)
    return res.status(404).json({ exito: false, mensaje: "No encontrada" });
  res.json({ exito: true, data: pelicula });
});

app.post("/peliculas", (req, res) => {
  const { titulo, director, anio, genero, disponible } = req.body;
  if (!titulo || !director) {
    return res
      .status(400)
      .json({ exito: false, mensaje: "Faltan titulo o director" });
  }
  const nueva = {
    id: nextId++,
    titulo,
    director,
    anio: anio || null,
    genero: genero || null,
    disponible: disponible !== undefined ? disponible : true,
  };
  peliculas.push(nueva);
  saveData();
  res.status(201).json({ exito: true, data: nueva });
});

app.put("/peliculas/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = peliculas.findIndex((p) => p.id === id);
  if (index === -1)
    return res.status(404).json({ exito: false, mensaje: "No encontrada" });
  const { titulo, director, anio, genero, disponible } = req.body;
  if (titulo !== undefined) peliculas[index].titulo = titulo;
  if (director !== undefined) peliculas[index].director = director;
  if (anio !== undefined) peliculas[index].anio = anio;
  if (genero !== undefined) peliculas[index].genero = genero;
  if (disponible !== undefined) peliculas[index].disponible = disponible;
  saveData();
  res.json({ exito: true, data: peliculas[index] });
});

app.delete("/peliculas/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = peliculas.findIndex((p) => p.id === id);
  if (index === -1)
    return res.status(404).json({ exito: false, mensaje: "No encontrada" });
  const eliminada = peliculas.splice(index, 1);
  saveData();
  res.json({ exito: true, mensaje: "Eliminada", data: eliminada[0] });
});

app.get("/", (req, res) => res.send("API de Películas funcionando"));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Endpoints: GET, POST, PUT, DELETE /peliculas`);
});
