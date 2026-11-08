import { User } from '../../models/index.js';
import { hashPassword } from '../../shared/utils/security.js';
import { env } from '../../config/env.js';

export async function seedInitialAdmin(): Promise<void> {
  const adminEmail = env.ADMIN_EMAIL.toLowerCase().trim();
  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);

  const existingAdmin = await User.findOne({
    email: adminEmail,
  });

  if (!existingAdmin) {
    await User.create({
      email: adminEmail,
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      mustChangePassword: false,
      isActive: true,
    });
    console.log(`[Seed] Super Admin initialized in MongoDB Atlas: ${adminEmail}`);
  } else {
    existingAdmin.role = 'SUPER_ADMIN';
    existingAdmin.passwordHash = passwordHash;
    existingAdmin.isActive = true;
    await existingAdmin.save();
    console.log(`[Seed] Super Admin synchronized in MongoDB Atlas: ${adminEmail}`);
  }
}

