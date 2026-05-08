/**
 * migrate-db.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Safe, idempotent migration script.
 *
 * What it does:
 *   1. Adds any MISSING permissions (skips ones that already exist)
 *   2. Adds any MISSING roles     (skips ones that already exist)
 *   3. Adds any MISSING role-permission links (skips existing links)
 *   4. Ensures at least one admin user exists (creates one only if NONE exist)
 *   5. Adds any MISSING indexes on collections
 *
 * What it NEVER does:
 *   ✗ Drop the database
 *   ✗ Drop any collection
 *   ✗ Delete any document
 *   ✗ Overwrite any existing document
 *
 * Usage:
 *   node migrate-db.js
 *
 * Safe to run multiple times — fully idempotent.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pmo_db';

// ── Inline schemas (mirrors server/models exactly) ───────────────────────────

const Permission = mongoose.model('Permission', new mongoose.Schema({
  permission_name: { type: String, required: true, unique: true },
  description:     String,
}, { timestamps: true }));

const Role = mongoose.model('Role', new mongoose.Schema({
  role_name:   { type: String, required: true, unique: true },
  description: String,
}, { timestamps: true }));

const rpSchema = new mongoose.Schema({
  role_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Role',       required: true },
  permission_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission', required: true },
}, { timestamps: true });
rpSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });
const RolePermission = mongoose.model('RolePermission', rpSchema);

const User = mongoose.model('User', new mongoose.Schema({
  username:   { type: String, required: true, unique: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  role_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    default: null },
  client_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Client',  default: null },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  is_active:  { type: Boolean, default: true },
  in_org:     { type: Boolean, default: true },
  current_quarters: { type: [String], default: [] },
  current_year:     { type: Number,   default: null },
  quarter_activity: {
    type: [{
      year:    { type: Number, required: true },
      quarter: { type: String, enum: ['Q1','Q2','Q3','Q4'], required: true },
      status:  { type: String, enum: ['active','inactive'], default: 'active' }
    }],
    default: []
  },
  created_at: { type: Date, default: Date.now },
}, { timestamps: true }));

// ── Desired state ─────────────────────────────────────────────────────────────

const DESIRED_PERMISSIONS = [
  { permission_name: 'view_dashboard',             description: 'Can view dashboard' },
  { permission_name: 'add_delete_projects',        description: 'Can add and delete projects' },
  { permission_name: 'edit_projects',              description: 'Can edit projects' },
  { permission_name: 'view_projects',              description: 'Can view projects' },
  { permission_name: 'manage_users',               description: 'Can create, edit, and delete users' },
  { permission_name: 'view_users',                 description: 'Can view users' },
  { permission_name: 'manage_import',              description: 'Can import data from Excel files' },
  { permission_name: 'view_portfolio',             description: 'Can view portfolio dashboard' },
  { permission_name: 'edit_portfolio_health',      description: 'Can edit Portfolio Health' },
  { permission_name: 'manage_clients',             description: 'Can create and delete global clients' },
  { permission_name: 'manage_products',            description: 'Can create and delete global products' },
  { permission_name: 'manage_roles',               description: 'Can create, edit, and delete roles' },
  { permission_name: 'view_roles',                 description: 'Can view roles' },
  { permission_name: 'manage_closure_docs',        description: 'Can upload and delete closure documents' },
  { permission_name: 'view_weekly_updates',        description: 'Can view Weekly Updates page' },
  { permission_name: 'manage_weekly_updates',      description: 'Can create and edit weekly updates' },
  { permission_name: 'view_global_weekly_updates', description: 'Can view all weekly updates globally' },
  { permission_name: 'view_performance',           description: 'Can view Performance page' },
  { permission_name: 'manage_performance',         description: 'Can upload and manage performance reports' },
  { permission_name: 'manage_staff_augmentation',  description: 'Can manage staff augmentation resources' },
];

// role_name → permission_names[]
const DESIRED_ROLE_PERMISSIONS = {
  Admin: [
    // All permissions
    'view_dashboard',
    'add_delete_projects', 'edit_projects', 'view_projects',
    'manage_users', 'view_users',
    'manage_import',
    'view_portfolio', 'edit_portfolio_health',
    'manage_clients', 'manage_products',
    'manage_roles', 'view_roles',
    'manage_closure_docs',
    'view_weekly_updates', 'manage_weekly_updates', 'view_global_weekly_updates',
    'view_performance', 'manage_performance', 'manage_staff_augmentation',
  ],
  CSP: [
    // Dashboard + Projects (read) + Portfolio + Clients/Products + Performance (full) + Weekly Updates (full)
    'view_dashboard',
    'view_projects',
    'view_portfolio',
    'manage_clients', 'manage_products',
    'manage_import',
    'view_performance', 'manage_performance',
    'view_weekly_updates', 'manage_weekly_updates', 'view_global_weekly_updates',
  ],
  PMO: [
    // Dashboard + Projects (full) + Portfolio + Clients/Products + Import
    'view_dashboard',
    'view_projects', 'add_delete_projects', 'edit_projects',
    'view_portfolio', 'edit_portfolio_health',
    'manage_clients', 'manage_products',
    'manage_import', 'manage_closure_docs',
  ],
  PM: [
    // Dashboard + Projects (full) + Import + Closure docs
    'view_dashboard',
    'view_projects', 'add_delete_projects', 'edit_projects',
    'manage_import', 'manage_closure_docs',
  ],
  Managers: [
    // Dashboard + Projects (read) + Portfolio (read)
    'view_dashboard',
    'view_projects',
    'view_portfolio',
  ],
  SLTs: [
    // Dashboard + Projects (read) + Portfolio (read) + Users/Roles (read)
    'view_dashboard',
    'view_projects',
    'view_portfolio',
    'view_users', 'view_roles',
  ],
  Superuser: [
    // Dashboard + Projects (full) + Portfolio + Import + Closure docs (no user/role management)
    'view_dashboard',
    'view_projects', 'add_delete_projects', 'edit_projects',
    'view_portfolio',
    'manage_import', 'manage_closure_docs',
  ],
  Manager: [
    // Weekly Updates + Performance (scoped to own team by server-side RBAC)
    'view_weekly_updates',
    'view_performance',
  ],
  Resource: [
    // Weekly Updates only — performance page is blocked for Resources
    'view_weekly_updates',
  ],
};

const DESIRED_ROLES = Object.keys(DESIRED_ROLE_PERMISSIONS).map(role_name => ({
  role_name,
  description: `${role_name} role (Cannot be deleted)`,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg)  { console.log(`  ✓ ${msg}`); }
function skip(msg) { console.log(`  – ${msg} (already exists, skipped)`); }
function warn(msg) { console.log(`  ⚠ ${msg}`); }

async function upsertPermissions() {
  console.log('\n[1/4] Syncing permissions…');
  let added = 0, skipped = 0;

  for (const p of DESIRED_PERMISSIONS) {
    const exists = await Permission.findOne({ permission_name: p.permission_name });
    if (exists) {
      skipped++;
    } else {
      await Permission.create(p);
      log(`Added permission: ${p.permission_name}`);
      added++;
    }
  }
  console.log(`      ${added} added, ${skipped} already existed.`);
}

async function upsertRoles() {
  console.log('\n[2/4] Syncing roles…');
  let added = 0, skipped = 0;

  for (const r of DESIRED_ROLES) {
    const exists = await Role.findOne({ role_name: r.role_name });
    if (exists) {
      skipped++;
    } else {
      await Role.create(r);
      log(`Added role: ${r.role_name}`);
      added++;
    }
  }
  console.log(`      ${added} added, ${skipped} already existed.`);
}

async function upsertRolePermissions() {
  console.log('\n[3/4] Syncing role-permission links…');
  let added = 0, skipped = 0, missing = 0;

  // Build lookup maps
  const allPerms = await Permission.find({});
  const permMap  = Object.fromEntries(allPerms.map(p => [p.permission_name, p._id]));

  const allRoles = await Role.find({});
  const roleMap  = Object.fromEntries(allRoles.map(r => [r.role_name, r._id]));

  for (const [roleName, permNames] of Object.entries(DESIRED_ROLE_PERMISSIONS)) {
    const roleId = roleMap[roleName];
    if (!roleId) { warn(`Role "${roleName}" not found — skipping its permissions`); continue; }

    for (const permName of permNames) {
      const permId = permMap[permName];
      if (!permId) { warn(`Permission "${permName}" not found — skipping`); missing++; continue; }

      const exists = await RolePermission.findOne({ role_id: roleId, permission_id: permId });
      if (exists) {
        skipped++;
      } else {
        await RolePermission.create({ role_id: roleId, permission_id: permId });
        added++;
      }
    }
  }
  console.log(`      ${added} links added, ${skipped} already existed${missing ? `, ${missing} skipped (missing ref)` : ''}.`);
}

async function ensureAdminUser() {
  console.log('\n[4/4] Checking admin user…');

  const adminRole = await Role.findOne({ role_name: 'Admin' });
  if (!adminRole) { warn('Admin role not found — cannot create admin user'); return; }

  // Check if ANY admin user already exists
  const existingAdmin = await User.findOne({ role_id: adminRole._id });
  if (existingAdmin) {
    skip(`Admin user already exists (${existingAdmin.username})`);
    return;
  }

  // No admin at all — safe to create a default one
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await User.create({
    username: 'admin',
    email:    'admin@example.com',
    password: hashedPassword,
    role_id:  adminRole._id,
  });
  log('Created default admin user (username: admin, password: admin123)');
  warn('IMPORTANT: Change the default admin password after first login!');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  PMO Database Migration — safe, non-destructive');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Target: ${MONGODB_URI.replace(/:\/\/.*@/, '://***@')}`);

  await mongoose.connect(MONGODB_URI);
  console.log('  Connected to MongoDB\n');

  await upsertPermissions();
  await upsertRoles();
  await upsertRolePermissions();
  await ensureAdminUser();

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Migration complete. No existing data was touched.');
  console.log('═══════════════════════════════════════════════════\n');

  await mongoose.connection.close();
  process.exit(0);
}

migrate().catch(err => {
  console.error('\n✗ Migration failed:', err.message);
  console.error(err);
  process.exit(1);
});
