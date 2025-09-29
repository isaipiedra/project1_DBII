import redis from 'redis';
import dotenv from 'dotenv';

dotenv.config();

class RedisClient {
  constructor() {
    this.client = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
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
      console.log('Conectado a Redis');
    });

    this.client.on('disconnect', () => {
      console.log('Desconectado de Redis');
    });
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('Conexión a Redis establecida');
    } catch (error) {
      console.error('Error conectando a Redis:', error);
      // Reintentar conexión después de 5 segundos
      setTimeout(() => this.connect(), 5000);
    }
  }

  async setUser(username, userData) {
    try {
      const result = await this.client.set(username, JSON.stringify(userData));
      return result;
    } catch (error) {
      console.error('Error guardando usuario:', error);
      throw error;
    }
  }

  async getUser(username) {
    try {
      const userData = await this.client.get(username);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

  async deleteUser(username) {
    try {
      const result = await this.client.del(username);
      return result;
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
    }
  }

  async userExists(username) {
    try {
      const exists = await this.client.exists(username);
      return exists === 1;
    } catch (error) {
      console.error('Error verificando usuario:', error);
      throw error;
    }
  }

  async getAllUsers() {
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

  async ping() {
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

// Patrón Singleton para una única instancia
export default new RedisClient();