import { createConnection } from 'mysql';
import { database_informations } from './manager';

const database = createConnection(database_informations);
database.connect((error: string) => {
  if (error) throw error;
});

export function query<Req = any>(search: string) {
  return new Promise<Req[]>((resolve, reject) => {
    database.query(search, (error: string, request: any[]) => {
      if (error) reject(error)
      else resolve(request);
    });
  });
};