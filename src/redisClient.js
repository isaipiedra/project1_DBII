import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

class RedisClient {
  constructor() {
    // Connect to the master node only for simplicity
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379
      },
      password: process.env.REDIS_PASSWORD
    });

    this.setupEventListeners();
    this.connect();
  }

  setupEventListeners() {
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis Master');
    });

    this.client.on('ready', () => {
      console.log('Redis Master ready');
    });

    this.client.on('disconnect', () => {
      console.log('Disconnected from Redis');
    });
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('Redis connection established');
    } catch (error) {
      console.error('Error connecting to Redis:', error);
      // Reintentar conexión después de 5 segundos
      setTimeout(() => this.connect(), 5000);
    }
  }

  async ensureConnection() {
    if (!this.client.isOpen) {
      console.log('Reconnecting to Redis...');
      await this.connect();
    }
  }

  async setUser(username, userData) {
    await this.ensureConnection();
    try {
      const result = await this.client.set(username, JSON.stringify(userData));
      console.log(`Usuario ${username} guardado en Redis`);
      return result;
    } catch (error) {
      console.error('Error guardando usuario:', error);
      throw error;
    }
  }

  async getUser(username) {
    await this.ensureConnection();
    try {
      const userData = await this.client.get(username);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

  async deleteUser(username) {
    await this.ensureConnection();
    try {
      const result = await this.client.del(username);
      return result;
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
    }
  }

  async userExists(username) {
    await this.ensureConnection();
    try {
      const exists = await this.client.exists(username);
      return exists === 1;
    } catch (error) {
      console.error('Error verificando usuario:', error);
      throw error;
    }
  }

  async getAllUsers() {
    await this.ensureConnection();
    try {
      const keys = await this.client.keys('*');
      const users = [];

      for (const key of keys) {
        const userData = await this.client.get(key);
        if (userData) {
          const user = JSON.parse(userData);
          users.push({
            username: key,
            ...user
          });
        }
      }

      return users;
    } catch (error) {
      console.error('Error obteniendo todos los usuarios:', error);
      throw error;
    }
  }

  async getAdmins() {
    await this.ensureConnection();
    try {
      const keys = await this.client.keys('*');
      const admins = [];

      for (const key of keys) {
        const userData = await this.client.get(key);
        if (userData) {
          const user = JSON.parse(userData);
          if (user.admin === true) {
            admins.push({
              username: key,
              ...user
            });
          }
        }
      }

      return admins;
    } catch (error) {
      console.error('Error obteniendo administradores:', error);
      throw error;
    }
  }

  async isAdmin(username) {
    await this.ensureConnection();
    try {
      const userData = await this.client.get(username);
      if (!userData) return false;
      
      const user = JSON.parse(userData);
      return user.admin === true;
    } catch (error) {
      console.error('Error verificando administrador:', error);
      throw error;
    }
  }

  async ping() {
    await this.ensureConnection();
    try {
      return await this.client.ping();
    } catch (error) {
      console.error('Error en ping:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.client.quit();
      console.log('Conexión Redis cerrada');
    } catch (error) {
      console.error('Error cerrando conexión:', error);
    }
  }

  getClient() {
    return this.client;
  }
}

export default new RedisClient();