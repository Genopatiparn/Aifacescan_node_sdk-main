import mongoose from 'mongoose';

let isConnected = false;

export async function connectDatabase() {
    if (isConnected) {
        console.log('[DB] Already connected');
        return;
    }

    try {
        mongoose.set('strictQuery', true);
        await mongoose.connect(process.env.MONGO_DATABASE, {
            dbName: process.env.DATABASE_NAME
        });
        isConnected = true;
        console.log('[DB] Connected successfully');

        mongoose.connection.on('disconnected', () => {
            console.log('[DB] Disconnected');
            isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('[DB] Reconnected');
            isConnected = true;
        });

        mongoose.connection.on('error', (err) => {
            console.error('[DB] Error:', err.message);
        });

    } catch (error) {
        console.error('[DB] Connection error:', error.message);
        throw error;
    }
}

export function isDatabaseConnected() {
    return isConnected && mongoose.connection.readyState === 1;
}
