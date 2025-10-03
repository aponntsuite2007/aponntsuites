const jwt = require('jsonwebtoken');
const { sequelize } = require('./src/config/database');

async function createISIToken() {
  try {
    // Find ISI admin user
    const isiUser = await sequelize.query(`
      SELECT u.id, u.email, u.company_id, u.role
      FROM users u
      INNER JOIN companies c ON u.company_id = c.id
      WHERE LOWER(c.name) LIKE '%isi%' AND u.role = 'admin' AND u.is_active = true
      LIMIT 1
    `, { type: sequelize.QueryTypes.SELECT });

    if (isiUser.length === 0) {
      console.log('❌ No ISI admin user found');
      process.exit(1);
    }

    const user = isiUser[0];
    console.log('👤 ISI User found:', user);

    // Create JWT token
    const token = jwt.sign({
      id: user.user_id,
      email: user.email,
      company_id: user.company_id,
      role: user.role
    }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '24h' });

    console.log('🎫 JWT Token for ISI:');
    console.log(token);

  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

createISIToken();