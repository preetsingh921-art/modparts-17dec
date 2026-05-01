/**
 * Create Superadmin Script
 * Sets preet.singh921@gmail.com as superadmin
 * Run: node create-superadmin.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const db = require('./lib/db');
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
    const email = 'preet.singh921@gmail.com';
    
    try {
        console.log('🔑 Creating/updating superadmin...');
        
        // Check if user exists
        const { rows } = await db.query('SELECT id, email, role FROM users WHERE email = $1', [email]);
        
        if (rows.length > 0) {
            // User exists - upgrade to superadmin
            const user = rows[0];
            console.log(`Found existing user: ${user.email} (role: ${user.role})`);
            
            if (user.role === 'superadmin') {
                console.log('✅ User is already a superadmin!');
            } else {
                await db.query('UPDATE users SET role = $1 WHERE email = $2', ['superadmin', email]);
                console.log(`✅ Upgraded ${email} from '${user.role}' to 'superadmin'`);
            }
        } else {
            // User doesn't exist - create with temporary password
            const tempPassword = 'SuperAdmin2026!';
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            
            await db.query(`
                INSERT INTO users (email, password, first_name, last_name, role, is_approved, email_verified)
                VALUES ($1, $2, 'Preet', 'Singh', 'superadmin', true, true)
            `, [email, hashedPassword]);
            
            console.log(`✅ Created superadmin: ${email}`);
            console.log(`   Temporary password: ${tempPassword}`);
            console.log('   ⚠️ Please change this password immediately!');
        }
        
        // Verify
        const { rows: verify } = await db.query(
            'SELECT id, email, role, warehouse_id FROM users WHERE email = $1', 
            [email]
        );
        
        if (verify.length > 0) {
            console.log('\n📋 Superadmin details:');
            console.log(`   ID: ${verify[0].id}`);
            console.log(`   Email: ${verify[0].email}`);
            console.log(`   Role: ${verify[0].role}`);
            console.log(`   Warehouse: ${verify[0].warehouse_id || 'None (sees all warehouses)'}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

createSuperAdmin();
