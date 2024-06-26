import {
  getDbObject,
  serializeConnection,
  dispatchDbObject,
} from "./lib/object.mjs";
import { executeDbQuery } from "./lib/query.mjs";
import { log } from "./util/console.mjs";
import { DatabaseError } from "./errors/error.mjs";
import { initializeDbTransaction } from "./lib/transactions.mjs";

/**
 * @typedef {import("./types/tralse").Connection} Connection
 * @typedef {import("./types/tralse").DatabaseObject} DatabaseObject
 * @typedef {import("./types/tralse").TransactionMethods} TransactionMethods
 * @typedef {import("./types/tralse").DatabaseInstance} DatabaseInstance
 */

/**
 * Initializes the database and provides query and transaction methods.
 *
 * @param {Object} req - The request object.
 * @param {import('mysql2/promise').Pool} pool - The database connection pool.
 * @param {string} dbName - The name of the database.
 * @param {boolean} enableTransactions - Whether to enable transaction support.
 * @returns {Promise<DatabaseInstance>} - The initialized database object.
 * @throws {DatabaseError} - If there is an error initializing the database.
 */
const initializeDatabase = async (req, pool, dbName, enableTransactions) => {
  /**
   * Initializes a database connection and attaches it to the request object.
   *
   * @returns {Promise<void>}
   * @throws {DatabaseError} - If there is an error initializing the connection.
   */
  const initializeConnection = async () => {
    try {
      console.log("hi im from initialize");
      const connection = await pool.getConnection();
      serializeConnection(req, connection);
      console.log("hi");
      log(dbName, "Connection initialized.");
    } catch (error) {
      console.log(error);
      throw new DatabaseError(`Error initializing database.${error}`);
    }
  };

  /**
   * Executes a database query.
   *
   * @param {string} sql - The SQL query to execute.
   * @param {Array<any>} [params=[]] - The parameters for the SQL query.
   * @returns {Promise<any>} - The result of the query.
   */
  const query = async (sql, params = []) => {
    return await executeDbQuery(req, dbName, sql, params);
  };

  /**
   * Initializes a database transaction.
   *
   * @param {string} [isolationLevel="READ COMMITTED"] - The isolation level for the transaction.
   * @returns {Promise<TransactionMethods>} - The transaction methods.
   */
  const transaction = async (isolationLevel = "READ COMMITTED") => {
    return await initializeDbTransaction(req, dbName, isolationLevel);
  };

  /**
   * Releases the current database connection.
   *
   * @returns {Promise<void>}
   */
  const releaseConnection = async () => {
    const { connection } = getDbObject(req, dbName);
    dispatchDbObject(req, dbName);
    await connection.release();
  };

  /**
   * Terminates the database connection pool.
   *
   * @returns {Promise<void>}
   * @throws {DatabaseError} - If there is an error terminating the connection pool.
   */
  const terminate = async () => {
    if (pool) {
      try {
        await pool.end();
        log(dbName, "Database connection pool terminated.");
      } catch (error) {
        log(
          dbName,
          `Failed to terminate database connection pool: ${error.message}`
        );
        throw new DatabaseError(
          `Failed to terminate database connection pool: ${error.message}`
        );
      }
    }
  };

  return enableTransactions
    ? { initializeConnection, query, transaction, releaseConnection, terminate }
    : { initializeConnection, query, releaseConnection, terminate };
};

/**
 * Middleware to attach TralseMySQL to requests.
 *
 * @param {import('mysql2/promise').Pool} pool - The database connection pool.
 * @param {string} dbName - The name of the database.
 * @param {boolean} [enableTransactions=false] - Whether to enable transaction support.
 * @returns {Function} - The middleware function.
 */
export const TralseMySQL =
  (pool, dbName, enableTransactions = false) =>
  async (req, res, next) => {
    try {
      req.tralse_db_mysql = req.tralse_db_mysql || {};
      const dbInstance = await initializeDatabase(
        req,
        pool,
        dbName,
        enableTransactions
      );
      req.tralse_db_mysql[dbName] = dbInstance;

      next();
    } catch (error) {
      log(dbName, error.message);
      return res.status(500).json({
        status: 500,
        code: "DATABASE_INIT_ERROR",
        error: "Error initializing database.",
      });
    }
  };
