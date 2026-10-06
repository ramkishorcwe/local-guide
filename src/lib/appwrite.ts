import { Client, Databases, Account, Storage, ID, Query } from 'appwrite';
export const appwriteConfigured = Boolean(import.meta.env.VITE_APPWRITE_PROJECT_ID);
export const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || 'not-configured');
export const databases = new Databases(client);
export const account = new Account(client);
export const storage = new Storage(client);
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'local-guide';
export const POIS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID || 'pois';
export const TRIPS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_TRIPS_COLLECTION_ID || 'trips';
export const BOOKINGS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_BOOKING_COLLECTION_ID || 'bookings';
export { ID, Query };
