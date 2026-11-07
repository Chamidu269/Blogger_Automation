import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getStats } from './csvManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.resolve(__dirname, '../logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_FILE = path.join(LOG_DIR, 'daily_scheduler.log');

// Configuration
const BATCH_SIZE = parseInt(process.env.DAILY_BATCH_SIZE || '10', 10);
const SCHEDULE_HOUR = parseInt(process.env.DAILY_RUN_HOUR || '9', 10); // 9:00 AM default
const SCHEDULE_MINUTE = parseInt(process.env.DAILY_RUN_MINUTE || '0', 10);

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
}

/**
 * Calculates milliseconds until the next scheduled time.
 */
function getMsUntilNextRun(targetHour, targetMinute) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(targetHour, targetMinute, 0, 0);

  // If already passed today, schedule for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * Runs the 10-recipe publishing batch as a subprocess.
 */
function runBatch(size) {
  return new Promise((resolve, reject) => {
    log(`Starting daily batch: publishing ${size} recipe drafts to Blogger...`);
    const indexScript = path.resolve(__dirname, 'index.js');

    const child = spawn('node', [indexScript, '--batch', String(size)], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        const stats = getStats();
        log(`✔ Daily batch completed successfully! Published: ${stats.published} / Total: ${stats.total} (Remaining queued: ${stats.queued})`);
        resolve();
      } else {
        log(`⚠ Daily batch exited with error code: ${code}`);
        reject(new Error(`Exit code ${code}`));
      }
    });
  });
}

async function startScheduler() {
  console.log(`\n============================================================`);
  console.log(`    🍳 BLOGGER RECIPE AUTOMATION - DAILY SCHEDULER`);
  console.log(`============================================================`);
  console.log(`Daily Target     : ${BATCH_SIZE} recipe drafts per day`);
  console.log(`Scheduled Time   : Every day at ${String(SCHEDULE_HOUR).padStart(2, '0')}:${String(SCHEDULE_MINUTE).padStart(2, '0')}`);
  
  const stats = getStats();
  console.log(`Current Status   : ${stats.published} published / ${stats.queued} queued`);
  console.log(`Log File         : ${LOG_FILE}`);
  console.log(`============================================================\n`);

  // Check if run immediately flag passed
  if (process.argv.includes('--now')) {
    log('Flag --now detected. Running first 10-recipe batch immediately...');
    await runBatch(BATCH_SIZE).catch(e => console.error(e));
  }

  const scheduleNext = () => {
    const msUntilNext = getMsUntilNextRun(SCHEDULE_HOUR, SCHEDULE_MINUTE);
    const nextDate = new Date(Date.now() + msUntilNext);
    log(`Next automated run scheduled for: ${nextDate.toLocaleString()} (in ${(msUntilNext / (1000 * 60 * 60)).toFixed(1)} hours).`);

    setTimeout(async () => {
      try {
        const currentStats = getStats();
        if (currentStats.queued === 0) {
          log('🎉 All recipes have been published! Scheduler finished.');
          return;
        }

        await runBatch(BATCH_SIZE);
      } catch (err) {
        log(`Scheduler batch error: ${err.message}`);
      } finally {
        // Schedule the next day
        scheduleNext();
      }
    }, msUntilNext);
  };

  scheduleNext();
}

startScheduler();
