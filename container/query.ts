import { createConnection } from 'mysql';
import { db }  from './manager';

export function query<Req = any>(search: string) {
  return new Promise<Req[]>((resolve, reject) => {
    db.query(search, (error: string, request: any[]) => {
      if (error) reject(error)
      else resolve(request);
    });
  });
};