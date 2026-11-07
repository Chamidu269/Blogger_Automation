import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_FILE = path.resolve(__dirname, '../data/recipes.csv');

/**
 * Parses the CSV file into an array of objects.
 */
export function loadRecipes() {
  if (!fs.existsSync(CSV_FILE)) {
    throw new Error(`Recipes CSV not found at: ${CSV_FILE}`);
  }

  const raw = fs.readFileSync(CSV_FILE, 'utf8');
  const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const recipes = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length >= 3) {
      const obj = {};
      headers.forEach((h, index) => {
        obj[h.trim()] = values[index] ? values[index].trim() : '';
      });
      obj._lineIndex = i;
      recipes.push(obj);
    }
  }

  return recipes;
}

/**
 * Returns the next recipe with status 'QUEUED'.
 */
export function getNextQueuedRecipe() {
  const recipes = loadRecipes();
  return recipes.find(r => (r.Status || '').toUpperCase() === 'QUEUED') || null;
}

/**
 * Finds related recipes from the same country or region.
 */
export function getRelatedRecipes(country, currentFoodName, count = 3) {
  const recipes = loadRecipes();
  
  // First look for dishes from the same country
  let matches = recipes.filter(r => 
    r.Country.toLowerCase() === country.toLowerCase() && 
    r['Food Name'].toLowerCase() !== currentFoodName.toLowerCase()
  );

  // If fewer than needed, grab others
  if (matches.length < count) {
    const others = recipes.filter(r => 
      r['Food Name'].toLowerCase() !== currentFoodName.toLowerCase() &&
      !matches.includes(r)
    );
    matches = matches.concat(others);
  }

  return matches.slice(0, count).map(r => ({
    name: r['Food Name'],
    country: r.Country,
    idea: r['Recipe Idea']
  }));
}

/**
 * Updates a recipe's status to 'PUBLISHED_DRAFT' with timestamp.
 */
export function markRecipePublished(foodName, postTitle) {
  const recipes = loadRecipes();
  const target = recipes.find(r => r['Food Name'].toLowerCase() === foodName.toLowerCase());
  if (!target) return false;

  target.Status = 'PUBLISHED_DRAFT';
  target.PublishedAt = new Date().toISOString();
  target.PostTitle = postTitle;

  // Re-write CSV
  const headers = ['Country', 'Food Name', 'Recipe Idea', 'Status', 'PublishedAt', 'PostTitle'];
  const lines = [headers.join(',')];

  for (const r of recipes) {
    const row = [
      escapeCsv(r.Country),
      escapeCsv(r['Food Name']),
      escapeCsv(r['Recipe Idea']),
      escapeCsv(r.Status || 'QUEUED'),
      escapeCsv(r.PublishedAt || ''),
      escapeCsv(r.PostTitle || '')
    ];
    lines.push(row.join(','));
  }

  fs.writeFileSync(CSV_FILE, lines.join('\n'), 'utf8');
  return true;
}

/**
 * Returns statistics about the recipes list.
 */
export function getStats() {
  const recipes = loadRecipes();
  const queued = recipes.filter(r => (r.Status || '').toUpperCase() === 'QUEUED').length;
  const published = recipes.filter(r => (r.Status || '').toUpperCase().startsWith('PUBLISHED')).length;
  return {
    total: recipes.length,
    queued,
    published
  };
}

// Helpers
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function escapeCsv(val) {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}
