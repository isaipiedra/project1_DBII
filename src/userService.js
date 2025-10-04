import bcrypt from 'bcryptjs';
import redisClient from './redisClient.js';

class UserService {
  async createUser(username, userData) {
    // Validar que el usuario no exista
    const existingUser = await redisClient.getUser(username);
    if (existingUser) {
      throw new Error('El usuario ya existe');
    }

    // Validar campos requeridos
    const { firstName, lastName, birthDate, password, profilePicture } = userData;
    if (!firstName || !lastName || !birthDate || !password) {
      throw new Error('Todos los campos son requeridos');
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    const userToSave = {
      firstName,
      lastName,
      birthDate,
      password: hashedPassword,
      profilePicture: profilePicture || null, // Guardar la imagen en base64
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await redisClient.setUser(username, userToSave);

    return {
      username,
      firstName,
      lastName,
      birthDate,
      profilePicture: userToSave.profilePicture
    };
  }

  async getUser(username) {
    const user = await redisClient.getUser(username);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // No retornar la contraseña
    const { password, ...userWithoutPassword } = user;
    return {
      username,
      ...userWithoutPassword
    };
  }

  async updateUser(username, updateData) {
    const existingUser = await redisClient.getUser(username);
    if (!existingUser) {
      throw new Error('Usuario no encontrado');
    }

    const updatedUser = {
      firstName: updateData.firstName || existingUser.firstName,
      lastName: updateData.lastName || existingUser.lastName,
      birthDate: updateData.birthDate || existingUser.birthDate,
      profilePicture: updateData.profilePicture !== undefined ? updateData.profilePicture : existingUser.profilePicture,
      password: existingUser.password,
      createdAt: existingUser.createdAt,
      updatedAt: new Date().toISOString()
    };

    // Si se proporciona nueva contraseña, encriptarla
    if (updateData.password) {
      updatedUser.password = await bcrypt.hash(updateData.password, 12);
    }

    await redisClient.setUser(username, updatedUser);

    const { password, ...userWithoutPassword } = updatedUser;
    return {
      username,
      ...userWithoutPassword
    };
  }

  async updateProfilePicture(username, profilePicture) {
    const existingUser = await redisClient.getUser(username);
    if (!existingUser) {
      throw new Error('Usuario no encontrado');
    }

    const updatedUser = {
      ...existingUser,
      profilePicture,
      updatedAt: new Date().toISOString()
    };

    await redisClient.setUser(username, updatedUser);

    const { password, ...userWithoutPassword } = updatedUser;
    return {
      username,
      ...userWithoutPassword
    };
  }

  async deleteUser(username) {
    const existingUser = await redisClient.getUser(username);
    if (!existingUser) {
      throw new Error('Usuario no encontrado');
    }

    await redisClient.deleteUser(username);
    return { message: 'Usuario eliminado exitosamente' };
  }

  async getAllUsers() {
    const users = await redisClient.getAllUsers();
    
    // Remover contraseñas de todos los usuarios
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  async authenticateUser(username, password) {
    const user = await redisClient.getUser(username);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    const { password: _, ...userWithoutPassword } = user;
    return {
      username,
      ...userWithoutPassword
    };
  }

  async userExists(username) {
    return await redisClient.userExists(username);
  }
}

export default new UserService();