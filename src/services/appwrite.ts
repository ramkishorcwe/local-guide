// import { Client } from "appwrite";

// const client = new Client()
//   .setEndpoint("https://syd.cloud.appwrite.io/v1")
//   .setProject("6abe05cc001d0b14fb6e");

// export { client };

import { Client, Databases, Account, Storage, ID, Query } from "appwrite";

export const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT) // e.g. https://cloud.appwrite.io/v1
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const account = new Account(client);
export const storage = new Storage(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const POIS_COLLECTION_ID = "pois";
export const TRIPS_COLLECTION_ID = "trips";
export const BOOKINGS_COLLECTION_ID = "bookings";

export { ID, Query };