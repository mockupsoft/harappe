import { localDb } from './localDb';
import { Table } from '../types';

const CITY_TABLES = [
  "Berlin", "Tokyo", "Brooklyn", "İstanbul", "Havana", "Tiflis", "Paris", "Roma", 
  "Bangkok", "Amsterdam", "Seul", "Barselona", "Londra", "New York", "Prag", "Atina", 
  "Rio", "Napoli", "Marakeş", "Los Angeles", "Lisbon", "Kyoto", "Tulum", "Medellin", 
  "Mumbai", "Dubai", "Venice", "Belgrad", "Budapeşte", "Sidney", "Toronto", "Miami", 
  "Manchester", "Osaka", "Cape Town", "Buenos Aires", "Stockholm", "Copenhagen", 
  "Mexico City", "Dublin", "Milan", "Vienna", "Brussels", "Warsaw", "Sofia", 
  "Sarajevo", "Zagreb", "Beirut", "Doha", "Abu Dhabi", "Honolulu", "Ibiza", 
  "Monaco", "Santorini", "Odessa", "Nice", "Cannes"
];

export const seedTables = async () => {
  const existing = await localDb.getTables();
  if (existing.length === 0) {
    const tables: Table[] = CITY_TABLES.map((name, index) => ({
      id: `table_${index + 1}`,
      name: name,
      active: true,
      image: ''
    }));
    await localDb.saveTables(tables);
  }
};
