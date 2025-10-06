import { createClient } from 'redis';
import bcrypt from 'bcryptjs';

async function createAdminUser() {
    const client = createClient({
        socket: {
            host: 'localhost',
            port: 6379
        }
    });

    try {
        await client.connect();
        console.log('Creating admin user...');

        const username = 'Admin';
        const password = 'Admin12345';
        const firstName = 'Admin';
        const lastName = 'istrator';
        const currentDate = new Date().toISOString();

        // Check if admin user already exists
        const existingUser = await client.get(username);
        if (existingUser) {
            console.log('Admin user already exists');
            await client.disconnect();
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create admin user object
        const adminUser = {
            firstName,
            lastName,
            birthDate: currentDate.split('T')[0],
            password: hashedPassword,
            profilePicture: null,
            admin: true,
            createdAt: currentDate,
            updatedAt: currentDate
        };

        // Save to Redis
        await client.set(username, JSON.stringify(adminUser));
        console.log('Admin user created successfully!');
        console.log('Username: Admin');
        console.log('Password: Admin12345');

        await client.disconnect();
        
    } catch (error) {
        console.error('Error creating admin user:', error.message);
        // Don't exit, just log the error
    }
}

createAdminUser();
