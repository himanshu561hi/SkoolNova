import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5001),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().default("mongodb+srv://himanshu561hi_db_user:nj7kJYaKgOqHwqgJ@backend.xfmhuwk.mongodb.net/digischool?retryWrites=true&w=majority"),
  DATABASE_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().default("digischool_jwt_access_secret_key_production_grade_32_characters_minimum"),
  JWT_REFRESH_SECRET: z.string().default("digischool_jwt_refresh_secret_key_production_grade_32_characters_minimum"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  UPLOAD_DIR: z.string().default("./uploads"),
  STORAGE_PROVIDER: z.enum(["cloudinary", "imagekit", "local"]).default("cloudinary"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),
  IMAGEKIT_PUBLIC_KEY: z.string().optional(),
  IMAGEKIT_PRIVATE_KEY: z.string().optional(),
  IMAGEKIT_URL_ENDPOINT: z.string().optional(),
  ADMIN_EMAIL: z.string().email().default("himanshu561hi@gmail.com"),
  ADMIN_PASSWORD: z.string().min(6).default("Himanshubham@80"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
