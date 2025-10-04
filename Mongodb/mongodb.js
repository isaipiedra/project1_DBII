import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

const MONGO_URI = 'mongodb://127.0.0.1:27017/miBaseDeDatos?directConnection=true';

/* ================== Esquemas ================== */
const ArchivoGridFSSchema = new mongoose.Schema({
  id_archivo: Number,
  nombre: String,
  tipo: String,
  tamano: Number,
  file_id: mongoose.Schema.Types.ObjectId
}, { _id: false });

const ImagenGridFSSchema = new mongoose.Schema({
  id_imagen: Number,
  nombre: String,
  tipo: String,
  tamano: Number,
  file_id: mongoose.Schema.Types.ObjectId
}, { _id: false });

const DataSetSchema = new mongoose.Schema({
  name: String,
  description: String,
  date: Date,
  author: String,
  status: String,
  size: Number,
  foto_avatar: ImagenGridFSSchema,
  foto_descripcion: ImagenGridFSSchema,
  archivos: [ArchivoGridFSSchema],
  videos: [ArchivoGridFSSchema]
}, { collection: 'datasets' });

/* ============== Modelo ============== */
const DataSet = mongoose.models.DataSet || mongoose.model('DataSet', DataSetSchema);

/* ============== GridFS bucket global ============== */
let bucket;
mongoose.connection.once('connected', () => {
  bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
  console.log('GridFS bucket listo');
});

async function connectMongo(uri = MONGO_URI) {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri);
    bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    console.log('Conectado a MongoDB y GridFS listo');
  }
}

function getBucket() {
  if (!bucket) throw new Error('El bucket no inicializado, llama a connectMongo() primero');
  return bucket;
}

async function getDatasetById(datasetId) {

  if (!mongoose.isValidObjectId(datasetId)) {
    throw new Error('ID inválido: no es un ObjectId de MongoDB');
  }

  const ds = await DataSet.findById(datasetId).lean();
  if (!ds) throw new Error('DataSet no encontrado');
  return ds;
}

// Lista datasets con status "Approved"
// Sin límite
async function getApprovedDatasets({ limit = 0, skip = 0 } = {}) {
  return DataSet.find({ status: 'Aprobado' })
    .skip(skip)
    .limit(limit)
    .lean();
}


function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Busca datasets por nombre.
 * exact cuando está true solo coincidencias exacta; false: parcial (contains).
 * caseInsensitive cuando está true ignora mayúsculas/minúsculas.
 * limit máximo de documentos a retornar.
 * skip desplazamiento para páginas
 */

async function getDatasetsByName(
  name,
  { exact = false, caseInsensitive = true, limit = 20, skip = 0 } = {}
) {
  if (!name || typeof name !== 'string') {
    throw new Error('Parámetro "name" inválido');
  }

  let query;
  if (exact) {
    if (caseInsensitive) {
      query = { name: new RegExp(`^${escapeRegExp(name)}$`, 'i') };
    } else {
      query = { name }; // coincidencia exacta y sensible a mayúsculas/minúsculas
    }
  } else {
    // Búsqueda parcial (contains)
    query = { name: new RegExp(escapeRegExp(name), caseInsensitive ? 'i' : undefined) };
  }

  return DataSet.find(query)
    .skip(skip)
    .limit(limit)
    .lean();
}




/*Función para insertar un nuevo dataSet*/
async function insertDataSetGridFS({
  name, description, date, author, status, size,
  avatarPath, descripcionPath,
  archivosPaths = [], videosPaths = []
}) {
  if (!bucket) throw new Error('Se debe llamar a connectMongo() primero');

  const uploadOne = (p) => new Promise((resolve, reject) => {
    if (!fs.existsSync(p)) return reject(new Error(`No existe el archivo: ${p}`));

    const filename = path.basename(p);
    const contentType = mime.lookup(p) || 'application/octet-stream';
    const uploadStream = bucket.openUploadStream(filename, { contentType });

    fs.createReadStream(p)
      .on('error', reject)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => {
        const stats = fs.statSync(p);
        resolve({
          nombre: filename,
          tipo: contentType,
          tamano: stats.size,
          file_id: uploadStream.id
        });
      });
  });

  const avatarMeta = avatarPath ? await uploadOne(avatarPath) : null;
  const descMeta   = descripcionPath ? await uploadOne(descripcionPath) : null;

  const archivosMeta = [];
  for (let i = 0; i < archivosPaths.length; i++) {
    const meta = await uploadOne(archivosPaths[i]);
    archivosMeta.push({ id_archivo: i + 1, ...meta });
  }

  const videosMeta = [];
  for (let i = 0; i < videosPaths.length; i++) {
    const meta = await uploadOne(videosPaths[i]);
    videosMeta.push({ id_archivo: i + 1, ...meta });
  }

  const doc = new DataSet({
    name, description, date, author, status, size,
    foto_avatar:      avatarMeta ? { id_imagen: 1, ...avatarMeta } : undefined,
    foto_descripcion: descMeta   ? { id_imagen: 1, ...descMeta }   : undefined,
    archivos: archivosMeta,
    videos: videosMeta
  });

  const resultado = await doc.save();
  return resultado;
}

// ======= Cambiar estado a "Aprobado" =======
async function approveDataSet(datasetId) {

  const actualizado = await DataSet.findByIdAndUpdate(
    datasetId,
    { $set: { status: 'Aprobado' } },
    { new: true } 
  );

  if (!actualizado) {
    throw new Error('DataSet no encontrado');
  }

  return actualizado;
}

// ======= Cambiar estado a "Eliminado" =======
async function deleteDataSet(datasetId) {

  const actualizado = await DataSet.findByIdAndUpdate(
    datasetId,
    { $set: { status: 'Eliminado' } },
    { new: true } 
  );

  if (!actualizado) {
    throw new Error('DataSet no encontrado');
  }

  return actualizado;
}

// --- Clonar DataSet por ID (DEEP COPY: duplica binarios en GridFS) ---
async function cloneDatasetById(sourceId, newName) {
  await connectMongo();

  const src = await DataSet.findById(sourceId).lean();
  if (!src) throw new Error('DataSet origen no encontrado');

  const bkt = getBucket();

  // Duplica un archivo de GridFS y devuelve el meta con nuevo file_id
  const copyFileMeta = async (meta, fallbackNamePrefix = 'clone') => {
    if (!meta || !meta.file_id) return null;

    const uploadStream = bkt.openUploadStream(
      meta.nombre || `${fallbackNamePrefix}_${String(meta.file_id)}`,
      { contentType: meta.tipo || 'application/octet-stream' }
    );

    await new Promise((resolve, reject) => {
      bkt.openDownloadStream(meta.file_id)
        .on('error', reject)
        .pipe(uploadStream)
        .on('error', reject)
        .on('finish', resolve);
    });

    return {
      ...meta,
      file_id: uploadStream.id, // nuevo id
    };
  };

  // Imágenes
  let foto_avatar = src.foto_avatar ? await copyFileMeta(src.foto_avatar, 'avatar') : undefined;
  let foto_descripcion = src.foto_descripcion ? await copyFileMeta(src.foto_descripcion, 'descripcion') : undefined;

  // Archivos
  let archivos = Array.isArray(src.archivos) ? src.archivos : [];
  const newArchivos = [];
  for (let i = 0; i < archivos.length; i++) {
    const a = archivos[i];
    const na = await copyFileMeta(a, 'archivo');
    newArchivos.push({ ...na, id_archivo: i + 1 });
  }

  // Videos
  let videos = Array.isArray(src.videos) ? src.videos : [];
  const newVideos = [];
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const nv = await copyFileMeta(v, 'video');
    newVideos.push({ ...nv, id_archivo: i + 1 });
  }

  // Crear el nuevo documento
  const cloneDoc = new DataSet({
    name: newName,
    description: src.description,
    date: new Date(),                // fecha de cuando se clonó
    author: src.author,
    status: src.status ?? 'Activo',
    size: src.size,
    foto_avatar,
    foto_descripcion,
    archivos: newArchivos,
    videos: newVideos
  });

  const saved = await cloneDoc.save();
  return saved; // nuevo _id y nuevos file_id para todo
}



export { connectMongo, getBucket, insertDataSetGridFS, DataSet, approveDataSet, deleteDataSet, getDatasetById, getDatasetsByName, cloneDatasetById, getApprovedDatasets};



/* ================== prueba de funcionamiento ================== */
/*
const avatarPath      = 'C:/Users/Gabriel/Pictures/Roblox/RobloxScreenShot20250701_000430587.png';
const descripcionPath = 'C:/Users/Gabriel/Pictures/Roblox/RobloxScreenShot20250414_202948781.png';
const archivosPaths   = [
  'C:/Users/Gabriel/Downloads/Lectura06GabrielUreña.pdf'
];
const videosPaths     = [
  "C:/Users/Gabriel/Videos/2025-09-09 15-11-57.mp4"
];

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Conectado a Mongo');

    const saved = await insertDataSetGridFS({
      name: 'Dataset REAL desde mismo archivo',
      description: 'Test interno',
      date: new Date(),
      author: 'Gabriel',
      status: 'Activo',
      size: 2048576,
      avatarPath,
      descripcionPath,
      archivosPaths,
      videosPaths
    });

    console.log('DataSet _id:', saved._id.toString());
    if (saved.foto_avatar)      console.log('   avatar file_id:',      saved.foto_avatar.file_id.toString());
    if (saved.foto_descripcion) console.log('   descripcion file_id:', saved.foto_descripcion.file_id.toString());
    saved.archivos?.forEach(a => console.log('   archivo file_id:', a.file_id.toString()));
    saved.videos?.forEach(v => console.log('   video   file_id:', v.file_id.toString()));
  } catch (e) {
    console.error('Error en prueba:', e);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Conexión cerrada');
  }
})();

*/
/*
(async () => {
  try {
    await connectMongo();
    const dsActualizado = await approveDataSet('68e0da26140a7d049d349209');
    console.log('Aprovado:', dsActualizado._id.toString(), dsActualizado.status);
  } catch (e) {
    console.error('Error al eliminar:', e.message);
  } finally {
   await mongoose.disconnect(); 
  }
})();
*/
/*
(async () => {
  try {
    await connectMongo();
    const dsActualizado = await cloneDatasetById('68e0c0c8b48fdc4148ce071b', 'No');
    console.log('Clonado:', dsActualizado._id.toString(), dsActualizado.status);
  } catch (e) {
    console.error('Error al eliminar:', e.message);
  } finally {
   await mongoose.disconnect(); 
  }
})();
*/
/*
(async () => {
  try {
    await connectMongo();
    const results = await getApprovedDatasets();
    results.forEach((ds, i) => {
      console.log(`#${i+1}`, String(ds?._id), ds?.name);
    });
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
   await mongoose.disconnect(); 
  }
})();
*/
//68e091c9958b76c51deaf617


