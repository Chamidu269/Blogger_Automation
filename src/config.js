import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  // Gemini AI configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    fallbackModels: ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-flash-latest'],
  },

  // Blogger "Post using email" configuration
  blogger: {
    // Your secret Blogger email (e.g. yourblog.secretcode@blogger.com)
    secretEmail: process.env.BLOGGER_SECRET_EMAIL || '',
  },

  // SMTP Sender Email (e.g. your Gmail with App Password)
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },

  // Blog defaults
  blog: {
    blogName: process.env.BLOG_NAME || 'Authentic World Recipes',
    author: process.env.BLOG_AUTHOR || 'Chef & Food Enthusiast',
    autoGenerateImage: process.env.AUTO_GENERATE_IMAGE !== 'false', // Defaults to true
  },

  // Simulation mode (if true, outputs HTML locally to output/ instead of sending email)
  isSimulation: process.env.SIMULATION_MODE === 'true' || !process.env.BLOGGER_SECRET_EMAIL || !process.env.EMAIL_USER,
};
