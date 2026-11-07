import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getNextQueuedRecipe, getRelatedRecipes, getStats } from './src/csvManager.js';
import { generateRecipePost } from './src/recipeGenerator.js';
import { publishToBlogger } from './src/emailPublisher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPreview() {
  console.log(`\n============================================================`);
  console.log(`    BLOGGER RECIPE AUTOMATION - PREVIEW GENERATOR`);
  console.log(`============================================================`);

  const stats = getStats();
  console.log(`Total Recipes in Sheet : ${stats.total}`);
  console.log(`Queued to Publish      : ${stats.queued}`);
  console.log(`Already Published      : ${stats.published}`);
  console.log(`============================================================\n`);

  const nextRecipe = getNextQueuedRecipe();
  if (!nextRecipe) {
    console.log('No recipes currently queued in data/recipes.csv!');
    return;
  }

  console.log(`Selected Next Recipe:`);
  console.log(`  Food Name   : ${nextRecipe['Food Name']}`);
  console.log(`  Country     : ${nextRecipe.Country}`);
  console.log(`  Recipe Idea : ${nextRecipe['Recipe Idea']}`);
  console.log(`------------------------------------------------------------\n`);

  const related = getRelatedRecipes(nextRecipe.Country, nextRecipe['Food Name'], 3);
  const post = await generateRecipePost(nextRecipe, related);

  const result = await publishToBlogger({
    title: post.title,
    htmlContent: post.htmlContent,
    foodName: nextRecipe['Food Name'],
    country: nextRecipe.Country
  });

  console.log(`\n✔ Article Title: "${post.title}"`);
  console.log(`✔ Blogger Labels: "${post.labels}"`);
  console.log(`✔ Search Description: "${post.searchDesc}"`);
  console.log(`✔ AI Image Prompt Generated:`);
  console.log(`   "${post.imagePrompt}"`);
  console.log(`✔ Output File Saved: ${result.previewPath}`);
  console.log(`\nYou can open this file in any web browser to see the formatted post!`);
  console.log(`============================================================\n`);
}

runPreview().catch(err => {
  console.error('Preview error:', err);
});
