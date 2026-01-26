/**
 * Production fix: Add password + username columns to aponnt_staff
 * and seed initial admin credentials
 */
const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/config/database');

async function fixStaffAuth() {
  try {
    console.log('=== FIXING STAFF AUTH FOR PRODUCTION ===\n');

    // 1. Add password column if not exists
    console.log('1. Adding password column...');
    await sequelize.query(`
      ALTER TABLE aponnt_staff
      ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT NULL
    `);
    console.log('   OK - password column ready');

    // 2. Add username column if not exists
    console.log('2. Adding username column...');
    await sequelize.query(`
      ALTER TABLE aponnt_staff
      ADD COLUMN IF NOT EXISTS username VARCHAR(100) DEFAULT NULL
    `);
    // Add unique index on username (only for non-null values)
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_aponnt_staff_username
      ON aponnt_staff(username) WHERE username IS NOT NULL
    `);
    console.log('   OK - username column ready');

    // 3. Add last_login_at column if not exists
    console.log('3. Adding last_login_at column...');
    await sequelize.query(`
      ALTER TABLE aponnt_staff
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP DEFAULT NULL
    `);
    console.log('   OK - last_login_at column ready');

    // 4. Add first_login column if not exists
    console.log('4. Adding first_login column...');
    await sequelize.query(`
      ALTER TABLE aponnt_staff
      ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true
    `);
    console.log('   OK - first_login column ready');

    // 5. Add biometric_enabled column if not exists
    console.log('5. Adding biometric_enabled column...');
    await sequelize.query(`
      ALTER TABLE aponnt_staff
      ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT false
    `);
    console.log('   OK - biometric_enabled column ready');

    // 6. Add dni column alias for document_number
    console.log('6. Adding dni column...');
    await sequelize.query(`
      ALTER TABLE aponnt_staff
      ADD COLUMN IF NOT EXISTS dni VARCHAR(50) DEFAULT NULL
    `);
    console.log('   OK - dni column ready');

    // 7. Check if there's a staff with admin@aponnt.com
    const [adminStaff] = await sequelize.query(
      "SELECT staff_id, email, first_name, last_name, user_id, password FROM aponnt_staff WHERE email = 'admin@aponnt.com' LIMIT 1"
    );

    if (adminStaff.length > 0) {
      console.log('\n7. Found existing admin@aponnt.com staff:', adminStaff[0].first_name, adminStaff[0].last_name);

      // Hash password
      const hashedPassword = await bcrypt.hash('admin123', 10);

      // Update password and username
      await sequelize.query(
        "UPDATE aponnt_staff SET password = $1, username = 'admin' WHERE email = 'admin@aponnt.com'",
        { bind: [hashedPassword] }
      );
      console.log('   OK - Password set for admin@aponnt.com');
    } else {
      console.log('\n7. No admin@aponnt.com found. Checking for DIR role staff...');

      // Find the first staff with DIR role or level 0
      const [dirStaff] = await sequelize.query(`
        SELECT s.staff_id, s.email, s.first_name, s.last_name, s.user_id, r.role_code
        FROM aponnt_staff s
        JOIN aponnt_staff_roles r ON s.role_id = r.role_id
        WHERE r.role_code = 'DIR' OR s.level = 0
        LIMIT 1
      `);

      if (dirStaff.length > 0) {
        console.log('   Found DIR staff:', dirStaff[0].email, '-', dirStaff[0].first_name, dirStaff[0].last_name);

        const hashedPassword = await bcrypt.hash('admin123', 10);
        await sequelize.query(
          "UPDATE aponnt_staff SET password = $1, username = 'admin' WHERE staff_id = $2",
          { bind: [hashedPassword, dirStaff[0].staff_id] }
        );
        console.log('   OK - Password set for', dirStaff[0].email);
      } else {
        // Create admin staff
        console.log('   No DIR staff found. Creating admin staff...');

        // Get a role for admin
        const [roles] = await sequelize.query(
          "SELECT role_id FROM aponnt_staff_roles WHERE role_code = 'DIR' LIMIT 1"
        );

        if (roles.length === 0) {
          console.error('   ERROR: No DIR role found. Cannot create admin staff.');
          process.exit(1);
        }

        const hashedPassword = await bcrypt.hash('admin123', 10);
        await sequelize.query(`
          INSERT INTO aponnt_staff (staff_id, first_name, last_name, email, username, password,
            role_id, country, level, area, is_active, created_at, updated_at)
          VALUES (gen_random_uuid(), 'Admin', 'Aponnt', 'admin@aponnt.com', 'admin', $1,
            $2, 'AR', 0, 'admin', true, NOW(), NOW())
        `, { bind: [hashedPassword, roles[0].role_id] });
        console.log('   OK - Created admin@aponnt.com with password admin123');
      }
    }

    // 8. Verify final state
    const [verifyStaff] = await sequelize.query(
      "SELECT staff_id, email, username, user_id, password IS NOT NULL as has_password FROM aponnt_staff WHERE username = 'admin' OR email = 'admin@aponnt.com' LIMIT 1"
    );
    console.log('\n8. Verification:', verifyStaff[0] || 'NOT FOUND');

    // 9. Also set password for any staff that has user_id but no password (they need auth)
    const [staffWithoutPassword] = await sequelize.query(
      "SELECT COUNT(*) as cnt FROM aponnt_staff WHERE user_id IS NOT NULL AND password IS NULL"
    );
    console.log('\n9. Staff with user_id but no password:', staffWithoutPassword[0].cnt);

    console.log('\n=== DONE ===');
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

fixStaffAuth();
