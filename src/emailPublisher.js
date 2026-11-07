import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '../output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (config.email.user && config.email.pass) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
    return transporter;
  }
  return null;
}

/**
 * Publishes a recipe article to Blogger by sending an email to Blogger's secret email address.
 * 
 * @param {Object} postData - { title, htmlContent, foodName, country }
 * @returns {Promise<{ success: boolean, destination: string, previewPath?: string }>}
 */
export async function publishToBlogger(postData) {
  const { title, htmlContent, foodName, country } = postData;
  const sanitizedName = foodName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const previewPath = path.join(OUTPUT_DIR, `${sanitizedName}.html`);

  // Always save a local HTML copy for developer review/backup
  fs.writeFileSync(previewPath, htmlContent, 'utf8');

  const mailTransporter = getTransporter();

  // If live credentials and secret Blogger email are present
  if (mailTransporter && config.blogger.secretEmail && !config.isSimulation) {
    try {
      console.log(`[Blogger Publisher] Sending "${title}" to Blogger (${config.blogger.secretEmail})...`);

      const mailOptions = {
        from: `"${config.blog.author}" <${config.email.user}>`,
        to: config.blogger.secretEmail,
        subject: title, // Blogger sets the post title from the email subject line!
        html: htmlContent,
      };

      const info = await mailTransporter.sendMail(mailOptions);
      console.log(`[Blogger Publisher] Successfully dispatched to Blogger! Message-ID: ${info.messageId}`);

      return {
        success: true,
        destination: `Blogger Drafts (via ${config.blogger.secretEmail})`,
        messageId: info.messageId,
        previewPath,
      };
    } catch (err) {
      console.error(`[Blogger Publisher] Email dispatch failed: ${err.message}`);
      console.log(`[Blogger Publisher] Saved locally at: ${previewPath}`);
    }
  }

  // Simulation / Local Preview Mode
  console.log(`\n============================================================`);
  console.log(`  [SIMULATION / LOCAL PREVIEW MODE]`);
  console.log(`  Blogger Email Target : ${config.blogger.secretEmail || 'Not configured in .env'}`);
  console.log(`  Post Title           : ${title}`);
  console.log(`  Local File Saved     : ${previewPath}`);
  console.log(`============================================================\n`);

  return {
    success: true,
    destination: `Local Preview (${previewPath})`,
    previewPath,
  };
}
