import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userService from './src/userService.js';
import redisClient from './src/redisClient.js';

dotenv.config();

/*Cassandra*/
import { init_cassandra, 
  add_comment, 
  get_all_comments, 
  get_all_comments_by_dataset,
  update_comment_visibility, reply_comment,
  get_comment_replies, update_reply_visibility,
  add_dataset_vote, get_votes_by_dataset, get_votes_by_user,
  record_new_download, get_downloads_by_dataset, start_conversation,
  get_user_conversations, conversation_exists,send_message, get_conversation_messages, get_latest_message} 
  from './Cassandra/cassandra_methods.js';

  /* MongoDB */
  import { connectMongo,
    getBucket,
    insertDataSetGridFS,
    DataSet,
    approveDataSet,
    deleteDataSet,
    getDatasetById,
    getDatasetsByName,
    cloneDatasetById,
    getApprovedDatasets,} from './Mongodb/mongodb.js';
  import mongoose from 'mongoose';
  import { GridFSBucket } from 'mongodb';

const app = express();
const port = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(json({ limit: '10mb' })); // Aumentar de 100kb a 10mb
app.use(express.static('public'));

// Routes

//--------------Inicio funciones de MongoDB--------------------

// Insertar un nuevo dataset
app.post('/api/add_dataset', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      author, 
      status, 
      size, 
      avatarPath, 
      descripcionPath, 
      archivosPaths = [], 
      videosPaths = [] 
    } = req.body;

    if (!name || !description || !author) {
      return res.status(400).json({ error: "Faltan campos requeridos: 'name', 'description' o 'author'." });
    }

    const saved = await insertDataSetGridFS({
      name,
      description,
      date: new Date(),
      author,
      status,
      size,
      avatarPath,
      descripcionPath,
      archivosPaths,
      videosPaths
    });

    res.json(saved);

  } catch (err) {
    console.error("add_dataset error:", err);
    res.status(500).json({ error: "Error insertando dataset" });
  }
});



// Descargar archivo de GridFS
app.get('/api/files/:fileId', (req, res) => {
  try {
    const { ObjectId } = mongoose.Types;
    const fileId = new ObjectId(req.params.fileId);
    const bucket = getBucket(); 

    bucket.openDownloadStream(fileId)
      .on('file', (file) => {
        res.set({
          'Content-Type': file.contentType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${file.filename}"`
        });
      })
      .on('error', () => res.status(404).json({ error: 'Archivo no encontrado' }))
      .pipe(res);

  } catch (e) {
    res.status(400).json({ error: 'ID inválido' });
  }
});

// Obtener dataset por ID
app.get('/api/datasets/:id', async (req, res) => {
  try {
    const dataset = await DataSet.findById(req.params.id).lean();
    if (!dataset) return res.status(404).json({ error: "Dataset no encontrado" });
    res.json(dataset);
  } catch (err) {
    console.error("get dataset error:", err);
    res.status(500).json({ error: "Error" });
  }
});

// Aprobar dataset por ID
app.patch('/api/:id/approve', async (req, res) => {
  try {
    const ds = await approveDataSet(req.params.id);
    res.json(ds);
  } catch (e) {
    const code = /no encontrado/i.test(e.message) ? 404 : 400;
    res.status(code).json({ error: e.message });
  }
});

// Eliminar dataset por ID
app.patch('/api/:id/delete', async (req, res) => {
  try {
    const ds = await deleteDataSet(req.params.id);
    res.json(ds);
  } catch (e) {
    const code = /no encontrado/i.test(e.message) ? 404 : 400;
    res.status(code).json({ error: e.message });
  }
});

// Mostrar todos los datasets aprobados
app.get('/api/datasets/approved', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 0; // 0 = sin límite
    const skip  = req.query.skip  ? Number(req.query.skip)  : 0;
    const data  = await getApprovedDatasets({ limit, skip });
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

//Buscar datasets por nombre
app.get('/api/datasets/by-name', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Falta 'name' en query" });

    const exact           = req.query.exact === 'true';
    const caseInsensitive = req.query.caseInsensitive !== 'false';
    const limit           = req.query.limit ? Number(req.query.limit) : 20;
    const skip            = req.query.skip  ? Number(req.query.skip)  : 0;

    const results = await getDatasetsByName(name, {
      exact,
      caseInsensitive,
      limit,
      skip
    });

    res.json(results);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
//--------------Fin funciones de MongoDB-----------------------

// Health check
app.get('/health', async (req, res) => {
  try {
    await redisClient.ping();
    res.json({ 
      status: 'OK', 
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Error', 
      database: 'Disconnected',
      error: error.message 
    });
  }
});

// Crear usuario
app.post('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const userData = req.body;

    const result = await userService.createUser(username, userData);

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: result
    });

  } catch (error) {
    console.error('Error creando usuario:', error.message);
    
    if (error.message === 'El usuario ya existe') {
      return res.status(409).json({ error: error.message });
    }
    if (error.message === 'Todos los campos son requeridos') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener usuario
app.get('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const user = await userService.getUser(username);
    res.json(user);

  } catch (error) {
    console.error('Error obteniendo usuario:', error.message);
    
    if (error.message === 'Usuario no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar usuario
app.put('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const updateData = req.body;

    const result = await userService.updateUser(username, updateData);

    res.json({
      message: 'Usuario actualizado exitosamente',
      user: result
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error.message);
    
    if (error.message === 'Usuario no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar usuario
app.delete('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const result = await userService.deleteUser(username);
    res.json(result);

  } catch (error) {
    console.error('Error eliminando usuario:', error.message);
    
    if (error.message === 'Usuario no encontrado') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar todos los usuarios
app.get('/users', async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);

  } catch (error) {
    console.error('Error listando usuarios:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Autenticar usuario
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username y password son requeridos'
      });
    }

    const result = await userService.authenticateUser(username, password);

    res.json({
      message: 'Login exitoso',
      user: result
    });

  } catch (error) {
    console.error('Error en login:', error.message);
    
    if (error.message === 'Credenciales inválidas') {
      return res.status(401).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener imagen de perfil de usuario
app.get('/users/:username/profile-picture', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await userService.getUser(username);
    
    if (!user.profilePicture) {
      return res.status(404).json({ error: 'No profile picture found' });
    }
    
    // Extraer el tipo MIME y los datos base64
    const matches = user.profilePicture.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid image data' });
    }
    
    const mimeType = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');
    
    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache por 1 día
    res.send(imageBuffer);
    
  } catch (error) {
    console.error('Error obteniendo imagen de perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar solo la imagen de perfil
app.put('/users/:username/profile-picture', async (req, res) => {
  try {
    const { username } = req.params;
    const { profilePicture } = req.body;
    
    if (!profilePicture) {
      return res.status(400).json({ error: 'Profile picture is required' });
    }
    
    const result = await userService.updateProfilePicture(username, profilePicture);
    
    res.json({
      message: 'Profile picture updated successfully',
      user: result
    });
    
  } catch (error) {
    console.error('Error actualizando imagen de perfil:', error);
    
    if (error.message === 'Usuario no encontrado') {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

/*Cassandra methods start here*/
app.post('/api/add_comment', async (req, res)=> {  
  try{
    const {id_dataset, user_name, comment, visible} = req.body || {};  
    if(!id_dataset || !user_name || !comment){
      return res.status(400).json({ error: "Faltan 'id_dataset', 'user_name' o 'comment'." });
    }
    const saved = await add_comment({id_dataset, user_name, comment, visible});
    res.json(saved)
  }catch(error){
    console.error("add_comment error:", error);
    res.status(500).json({error : "Error"});
  }
});

app.get('/api/get_all_comments_by_dataset', async (req, res) =>{
  try{
    const { id_dataset, visible } = req.query; 
    if (!id_dataset) {
      return res.status(400).json({ error: "Falta 'id_dataset'." });
    }

    let visibleFilter = undefined;
    if (visible === 'true') {
      visibleFilter = true;
    } else if (visible === 'false') {
      visibleFilter = false;
    }

    const rows = await get_all_comments_by_dataset(id_dataset, {visible: visibleFilter
    });

    res.json(rows);

  }catch(error)
  {
    console.error("get_all_comments_by_dataset error:", error);
    res.status(500).json({error : "Error"});
  }
});

app.get('/api/get_all_comments', async (req, res)=>{
  try{
    const rows = await get_all_comments();
    res.json(rows);

  }catch(error){
    console.error("get_all_comments error:", error);
    res.status(500).json({error : "Error"});
  }
});

/**Functions which receives id_dataset and id_comment as strings but visibility as bool xd.
 * It updates the state of a comment.
 */
app.put('/api/update_comment_visibility', async(req, res)=>{
  try {
      const {id_dataset, id_comment, visible} = req.body;

      if (!id_dataset || !id_comment) {
        return res.status(400).json({ 
          error: "Faltan 'id_dataset' o 'id_comment'." 
        });
      }
      
      if (visible === undefined || visible === null) {
        return res.status(400).json({ 
          error: "Falta 'visible' (debe ser true o false)." 
        });
      }

      const rows = await update_comment_visibility(id_dataset, id_comment, visible);
      res.json(rows);

  } catch (error) {
      console.error("update_comment_visibility error:", error);
      res.status(500).json({error : "Error"});
  }
});

/**Reply section -------------------------------------------------------------------------- */
app.post('/api/reply_comment', async(req, res)=>{
  try{
      const {id_comment, username, reply, visible} = req.body || {};  
      if(!id_comment || !username || !reply){
        return res.status(400).json({ error: "Faltan 'id_comment', 'username' o 'reply'." });
      }
      const saved = await reply_comment({id_comment, username, reply, visible});
      res.json(saved)
  }catch(error){
      console.error("reply_comment' error:", error);
      res.status(500).json({error : "Error"});
  }
});

app.get('/api/get_comment_replies', async(req, res) => {
  try {
    const { id_comment, visible } = req.query; 
    if (!id_comment) {
      return res.status(400).json({ error: "Falta 'id_comment'." });
    }

    let visibleFilter = undefined;
    if (visible === 'true') {
      visibleFilter = true;
    } else if (visible === 'false') {
      visibleFilter = false;
    }

    const rows = await get_comment_replies(id_comment, { 
      visible: visibleFilter 
    });

    res.json(rows);
  } catch(error) {
    console.error("'get_comment_replies' error:", error);
    res.status(500).json({error : "Error"});
  }
});

app.put('/api/update_reply_visibility', async(req, res)=>{
  try{
    const {id_comment, reply_id, visible} = req.body;
    if(!id_comment || !reply_id){
      return res.status(400).json({error: "Falta 'id_comment' o 'reply_id'"});
    }
    if (visible === undefined || visible === null) {
      return res.status(400).json({ error: "Falta 'visible' (debe ser true o false)."});
    }

    const rows = await update_reply_visibility(id_comment, reply_id, visible);
    res.json(rows);

  }catch(error){
    console.error("'update_reply_visibility' error:", error);
    res.status(500).json({error : "Error"});
  }
});

/*Calification section------------------------------------------------------------ */
app.post('/api/add_dataset_vote', async (req, res) => {
  try {
    const { dataset_id, user_id, dataset_name, dataset_description, user_name, calification } = req.body;

    if (!dataset_id || !user_id || !dataset_name || !user_name) {
      return res.status(400).json({ 
        error: "Faltan campos requeridos: 'dataset_id', 'user_id', 'dataset_name', 'user_name'" 
      });
    }

    if (calification === undefined || calification === null) {
      return res.status(400).json({ 
        error: "Falta 'calification'" 
      });
    }

    // Aqui podemos cambiar la validación pero siento que la más logica es del uno al cinco xd
    const calificationNum = parseInt(calification);
    if (isNaN(calificationNum) || calificationNum < 1 || calificationNum > 5) {
      return res.status(400).json({ error: "'calification' debe ser un número entre 1 y 5" });
    }

    const result = await add_dataset_vote({dataset_id,user_id,dataset_name, dataset_description, user_name, calification: calificationNum});

    res.json(result);

  } catch (error) {
    console.error("add_dataset_vote error:", error);
    res.status(500).json({ error: "Error al agregar voto" });
  }
});

/**
 * Function which retrieves all the database voters using the database's id as parameter
 */
app.get('/api/get_votes_by_dataset', async (req, res) => {
  try {
    const { dataset_id } = req.query;
    if (!dataset_id) {
      return res.status(400).json({ error: "Falta 'dataset_id'" });
    }
    const rows = await get_votes_by_dataset(dataset_id);
    res.json(rows);
  } catch (error) {
    console.error("get_votes_by_dataset error:", error);
    res.status(500).json({ error: "Error" });
  }
});

/**
 * Function which retrieves all databases voted by a specific user using the user's id as parameter
 */
app.get('/api/get_votes_by_user', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "Falta 'user_id'" });
    }
    const rows = await get_votes_by_user(user_id);
    res.json(rows);
  } catch (error) {
    console.error("get_votes_by_user error:", error);
    res.status(500).json({ error: "Error" });
  }
});


/*Downloads---------------------------------------------------------------*/
app.post('/api/record_new_download', async (req, res)=>{
  try{
    const {dataset_id, user_id, dataset_description, dataset_name, user_name} = req.body;
    if(!dataset_id || !user_id || !dataset_description || !dataset_name || !user_name)
    {
      return res.status(400).json({error: "Falta 'dataset_id' o 'user_id', 'dataset_description' o 'dataset_name' o 'user_name'"});
    }

    const rows = await record_new_download (dataset_id, user_id, dataset_description, dataset_name, user_name);
    res.json(rows);

  }catch(error){
    console.error("/api/record_new_download:", error);
    res.status(500).json({ error: "Error" });
  }
});


app.get('/api/get_downloads_by_dataset', async (req, res) => {
  try {
    const {dataset_id } = req.query;
    if (!dataset_id) {
      return res.status(400).json({ error: "Falta 'dataset_id'" });
    }
    const rows = await get_downloads_by_dataset(dataset_id);
    res.json(rows);
  } catch (error) {
    console.error("get_downloads_by_dataset:", error);
    res.status(500).json({ error: "Error" });
  }
});


/**Conversation ---------------------------------------------------------------------- */
app.post('/api/start_conversation', async (req, res) => {
  try {
    const { id_user_one, id_user_two, user_one_name, user_two_name } = req.body;
    
    if (!id_user_one || !id_user_two || !user_one_name || !user_two_name) {
      return res.status(400).json({ 
        error: "Faltan campos requeridos: 'id_user_one', 'id_user_two', 'user_one_name', 'user_two_name'" 
      });
    }
    
    const existing = await conversation_exists(id_user_one, id_user_two);
    if (existing.exists) {
      return res.status(200).json({ 
        message: "La conversación ya existe",
        id_conversation: existing.id_conversation
      });
    }
    
    const result = await start_conversation({id_user_one, id_user_two,user_one_name, user_two_name
    });
    
    res.json(result);
    
  } catch (error) {
    console.error("start_conversation error:", error);
    res.status(500).json({ error: "Error al iniciar conversación" });
  }
});

app.get('/api/get_user_conversations', async (req, res) => {
  try {
    const { id_user } = req.query;
    
    if (!id_user) {
      return res.status(400).json({ error: "Falta 'id_user'" });
    }
    
    const conversations = await get_user_conversations(id_user);
    res.json(conversations);
    
  } catch (error) {
    console.error("get_user_conversations error:", error);
    res.status(500).json({ error: "Error" });
  }
});

app.post('/api/send_message', async (req, res) => {
  try {
    const { id_conversation, id_user, message } = req.body;
    
    if (!id_conversation || !id_user || !message) {
      return res.status(400).json({ 
        error: "Faltan campos requeridos: 'id_conversation', 'id_user', 'message'" 
      });
    }
    
    const result = await send_message({ id_conversation, id_user, message });
    res.json(result);
    
  } catch (error) {
    console.error("send_message error:", error);
    res.status(500).json({ error: "Error al enviar mensaje" });
  }
});

app.get('/api/get_conversation_messages', async (req, res) => {
  try {
    const { id_conversation } = req.query;
    
    if (!id_conversation) {
      return res.status(400).json({ error: "Falta 'id_conversation'" });
    }
    
    const messages = await get_conversation_messages(id_conversation);
    res.json(messages);
    
  } catch (error) {
    console.error("get_conversation_messages error:", error);
    res.status(500).json({ error: "Error al obtener mensajes" });
  }
});

/**Function which returns latest message registered in the db */
app.get('/api/get_latest_message', async (req, res) => {
  try {
    const { id_conversation } = req.query;
    
    if (!id_conversation) {
      return res.status(400).json({ error: "Falta 'id_conversation'" });
    }
    
    const message = await get_latest_message(id_conversation);
    
    if (!message) {
      return res.status(404).json({ error: "No hay mensajes en esta conversación" });
    }
    
    res.json(message);
    
  } catch (error) {
    console.error("get_latest_message error:", error);
    res.status(500).json({ error: "Error al obtener último mensaje" });
  }
});

/*Cassandra methods end here*/
async function startServer() {
  try {
    await init_cassandra();
    app.listen(port, () => {
      console.log(`App running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();

// Manejo graceful shutdown
process.on('SIGINT', async () => {
  console.log('Cerrando servidor');
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Cerrando servidor');
  await redisClient.disconnect();
  process.exit(0);
});
