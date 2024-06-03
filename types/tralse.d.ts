import { Pool, PoolConnection as MySequelizeConnection } from "mysql2/promise";
import { Request, Response, NextFunction } from "express";

export interface MySequelizePool extends Pool {}
export interface Connection extends MySequelizeConnection {}

export interface DatabaseObject {
  connection: Connection;
  referenceNo?: string | null;
}

export interface TransactionMethods {
  init: (
    sql: string | string[],
    params?: any[],
    generateReferenceNo?: (() => string) | null
  ) => Promise<any[]>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  retrieve: (
    req: Request,
    dbName: string
  ) => { connection: string; error?: string };
}

export interface DatabaseInstance {
  initializeConnection: () => Promise<void>;
  query: (sql: string | string[], params?: any[]) => Promise<any[]>;
  transaction?: (isolationLevel?: string) => Promise<TransactionMethods>;
  releaseConnection: () => Promise<void>;
  terminate: () => Promise<void>;
}

/**
 * Middleware to attach TralseMySQL to requests.
 *
 * @param {import('mysql2/promise').Pool} pool - The database connection pool.
 * @param {string} dbName - The name of the database.
 * @param {boolean} [enableTransactions=false] - Whether to enable transaction support.
 * @returns {Function} - The middleware function.
 */
export const TralseMySQL: (
  pool: MySequelizePool,
  dbName: string,
  enableTransactions?: boolean
) => (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const initializeDatabase: (
  req: Request,
  pool: MySequelizePool,
  dbName: string,
  enableTransactions: boolean
) => Promise<DatabaseInstance>;

export function log(dbName: string, message: string): void;

declare module "express-serve-static-core" {
  interface Request {
    tralse_db_mysql?: Record<string, DatabaseInstance>;
  }
}
