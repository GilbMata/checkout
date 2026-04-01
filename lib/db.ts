// import { drizzle } from "drizzle-orm/libsql";
// import { createClient } from "@libsql/client";

// const client = createClient({
//   url: "file:./sqlite.db", 
// });

// export const db = drizzle(client);

// import Database from 'better-sqlite3'
// import { v4 as uuidv4 } from 'uuid'

// const db = new Database('station.db')

// db.exec(`
//   CREATE TABLE IF NOT EXISTS prospects (
//     id TEXT PRIMARY KEY,
//     curp TEXT UNIQUE NOT NULL,
//     first_name TEXT NOT NULL,
//     last_name TEXT NOT NULL,
//     birth_date TEXT NOT NULL,
//     email TEXT UNIQUE NOT NULL,
//     package_id TEXT,
//     branch_id TEXT,
//     created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//     verified INTEGER DEFAULT 0
//   );

//   CREATE TABLE IF NOT EXISTS otp_codes (
//     id TEXT PRIMARY KEY,
//     email TEXT NOT NULL,
//     code TEXT NOT NULL,
//     expires_at TEXT NOT NULL,
//     used INTEGER DEFAULT 0,
//     created_at TEXT DEFAULT CURRENT_TIMESTAMP
//   );
// `)

// export interface Prospect {
//   id: string
//   curp: string
//   firstName: string
//   lastName: string
//   birthDate: string
//   email: string
//   packageId?: string
//   branchId?: string
//   createdAt?: string
//   verified: boolean
// }

// export function createProspect(data: Omit<Prospect, 'id' | 'createdAt' | 'verified'>): Prospect {
//   const id = uuidv4()
//   const stmt = db.prepare(`
//     INSERT INTO prospects (id, curp, first_name, last_name, birth_date, email, package_id, branch_id)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//   `)
//   stmt.run(id, data.curp, data.firstName, data.lastName, data.birthDate, data.email, data.packageId || null, data.branchId || null)
//   return { ...data, id, verified: false }
// }

// export function getProspectByEmail(email: string): Prospect | null {
//   const stmt = db.prepare('SELECT * FROM prospects WHERE email = ?')
//   const row = stmt.get(email) as any
//   if (!row) return null
//   return {
//     id: row.id,
//     curp: row.curp,
//     firstName: row.first_name,
//     lastName: row.last_name,
//     birthDate: row.birth_date,
//     email: row.email,
//     packageId: row.package_id,
//     branchId: row.branch_id,
//     createdAt: row.created_at,
//     verified: row.verified === 1,
//   }
// }

// export function getProspectByCurp(curp: string): Prospect | null {
//   const stmt = db.prepare('SELECT * FROM prospects WHERE curp = ?')
//   const row = stmt.get(curp) as any
//   if (!row) return null
//   return {
//     id: row.id,
//     curp: row.curp,
//     firstName: row.first_name,
//     lastName: row.last_name,
//     birthDate: row.birth_date,
//     email: row.email,
//     packageId: row.package_id,
//     branchId: row.branch_id,
//     createdAt: row.created_at,
//     verified: row.verified === 1,
//   }
// }

// export function saveOTPCode(email: string, code: string): void {
//   const id = uuidv4()
//   const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
//   const stmt = db.prepare(`
//     INSERT INTO otp_codes (id, email, code, expires_at)
//     VALUES (?, ?, ?, ?)
//   `)
//   stmt.run(id, email, code, expiresAt)
// }

// export function verifyOTPCode(email: string, code: string): boolean {
//   const stmt = db.prepare(`
//     SELECT * FROM otp_codes 
//     WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime('now')
//     ORDER BY created_at DESC LIMIT 1
//   `)
//   const row = stmt.get(email, code) as any
//   if (!row) return false
  
//   const updateStmt = db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?')
//   updateStmt.run(row.id)
  
//   const updateProspect = db.prepare('UPDATE prospects SET verified = 1 WHERE email = ?')
//   updateProspect.run(email)
  
//   return true
// }
