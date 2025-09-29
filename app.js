import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userService from './src/userService.js';
import redisClient from './src/redisClient.js';

dotenv.config();

const app = express();
const port = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(json({ limit: '10mb' })); // Aumentar de 100kb a 10mb
app.use(express.static('public'));

// Routes

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

async function startServer() {
  try {
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