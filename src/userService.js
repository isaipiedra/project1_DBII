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
    const { firstName, lastName, birthDate, password, profilePicture, admin } = userData;
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
      profilePicture: profilePicture || null,
      admin: admin || false,
      repositories: [], // Initialize empty repositories array
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await redisClient.setUser(username, userToSave);

    return {
      username,
      firstName,
      lastName,
      birthDate,
      profilePicture: userToSave.profilePicture,
      admin: userToSave.admin,
      repositories: userToSave.repositories
    };
  }

  async createAdminUser(username, userData) {
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
      profilePicture: profilePicture || null,
      admin: true,
      repositories: [], // Initialize empty repositories array
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await redisClient.setUser(username, userToSave);

    return {
      username,
      firstName,
      lastName,
      birthDate,
      profilePicture: userToSave.profilePicture,
      admin: true,
      repositories: userToSave.repositories
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
      admin: updateData.admin !== undefined ? updateData.admin : existingUser.admin,
      repositories: existingUser.repositories || [], // Preserve repositories
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

  // Repository management methods
  async addRepository(username, repositoryData) {
    const existingUser = await redisClient.getUser(username);
    if (!existingUser) {
      throw new Error('Usuario no encontrado');
    }

    const { id, name, description, language, isPublic = true } = repositoryData;
    
    if (!name) {
      throw new Error('El nombre del repositorio es requerido');
    }

    // Check if repository name already exists for this user
    if (existingUser.repositories && existingUser.repositories.some(repo => repo.name === name)) {
      throw new Error('El usuario ya tiene un repositorio con ese nombre');
    }

    const newRepository = {
      id: id,
      name,
      description: description || '',
      language: language || '',
      isPublic: Boolean(isPublic),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedUser = {
      ...existingUser,
      repositories: [...(existingUser.repositories || []), newRepository],
      updatedAt: new Date().toISOString()
    };

    await redisClient.setUser(username, updatedUser);

    return newRepository;
  }

  async getRepositories(username) {
    const existingUser = await redisClient.getUser(username);
    if (!existingUser) {
      throw new Error('Usuario no encontrado');
    }

    return existingUser.repositories || [];
  }

  async getRepository(username, repoId) {
    const existingUser = await redisClient.getUser(username);
    if (!existingUser) {
      throw new Error('Usuario no encontrado');
    }

    const repository = (existingUser.repositories || []).find(repo => repo.id === repoId);
    if (!repository) {
      throw new Error('Repositorio no encontrado');
    }

    return repository;
  }

  async updateRepository(username, repoId, updateData) {
    const existingUser = await redisClient.getUser(username);
    if (!existingUser) {
      throw new Error('Usuario no encontrado');
    }

    const repositories = existingUser.repositories || [];
    const repoIndex = repositories.findIndex(repo => repo.id === repoId);
    
    if (repoIndex === -1) {
      throw new Error('Repositorio no encontrado');
    }

    // Check if new name conflicts with other repositories
    if (updateData.name && updateData.name !== repositories[repoIndex].name) {
      const nameExists = repositories.some((repo, index) => 
        index !== repoIndex && repo.name === updateData.name
      );
      if (nameExists) {
        throw new Error('El usuario ya tiene un repositorio con ese nombre');
      }
    }

    const updatedRepository = {
      ...repositories[repoIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    repositories[repoIndex] = updatedRepository;

    const updatedUser = {
      ...existingUser,
      repositories,
      updatedAt: new Date().toISOString()
    };

    await redisClient.setUser(username, updatedUser);

    return updatedRepository;
  }

  async deleteRepository(username, repoId) {
    const existingUser = await redisClient.getUser(username);
    if (!existingUser) {
      throw new Error('Usuario no encontrado');
    }

    const repositories = existingUser.repositories || [];
    const repoIndex = repositories.findIndex(repo => repo.id === repoId);
    
    if (repoIndex === -1) {
      throw new Error('Repositorio no encontrado');
    }

    const deletedRepo = repositories[repoIndex];
    const updatedRepositories = repositories.filter(repo => repo.id !== repoId);

    const updatedUser = {
      ...existingUser,
      repositories: updatedRepositories,
      updatedAt: new Date().toISOString()
    };

    await redisClient.setUser(username, updatedUser);

    return { message: 'Repositorio eliminado exitosamente', repository: deletedRepo };
  }

  // Helper method to generate repository ID
  generateRepoId() {
    return `repo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  async promoteToAdmin(username) {
    const existingUser = await redisClient.getUser(username);
    if (!existingUser) {
      throw new Error('Usuario no encontrado');
    }

    const updatedUser = {
      ...existingUser,
      admin: true,
      updatedAt: new Date().toISOString()
    };

    await redisClient.setUser(username, updatedUser);

    const { password, ...userWithoutPassword } = updatedUser;
    return {
      username,
      ...userWithoutPassword
    };
  }

  async demoteFromAdmin(username) {
    const existingUser = await redisClient.getUser(username);
    if (!existingUser) {
      throw new Error('Usuario no encontrado');
    }

    const updatedUser = {
      ...existingUser,
      admin: false,
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

  async getAdmins() {
    const admins = await redisClient.getAdmins();
    
    // Remover contraseñas de todos los administradores
    return admins.map(admin => {
      const { password, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
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

  async isAdmin(username) {
    return await redisClient.isAdmin(username);
  }
}

export default new UserService();