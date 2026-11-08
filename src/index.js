import { getNextQueuedRecipe, getRelatedRecipes, markRecipePublished, getStats } from './csvManager.js';
import { generateRecipePost } from './recipeGenerator.js';
import { publishToBlogger } from './emailPublisher.js';
import { config } from './config.js';

async function main() {
  const args = process.argv.slice(2);

  console.log(`\n============================================================`);
  console.log(`      🍳 BLOGGER AUTOMATED FOOD RECIPE PUBLISHER`);
  console.log(`============================================================`);
  console.log(`Blogger Secret Email : ${config.blogger.secretEmail || '(Simulation Mode - will save locally)'}`);
  console.log(`Publish Mode         : Save as DRAFT in Blogger`);
  console.log(`AI Image Generator   : ${config.blog.autoGenerateImage ? 'Active (Auto-embedded)' : 'Disabled'}`);

  const stats = getStats();
  console.log(`Recipe Queue Status  : ${stats.published} published / ${stats.queued} queued (${stats.total} total)`);
  console.log(`============================================================\n`);

  if (args.includes('--status')) {
    return;
  }

  // Determine batch count
  let count = 1;
  const batchIdx = args.indexOf('--batch');
  if (batchIdx !== -1 && args[batchIdx + 1]) {
    count = parseInt(args[batchIdx + 1], 10) || 1;
  }

  for (let i = 0; i < count; i++) {
    const nextRecipe = getNextQueuedRecipe();
    if (!nextRecipe) {
      console.log('🎉 All recipes in data/recipes.csv have been published!');
      break;
    }

    console.log(`\n[${i + 1}/${count}] Processing: ${nextRecipe['Food Name']} (${nextRecipe.Country})...`);

    // 1. Fetch related recipes from same country
    const related = getRelatedRecipes(nextRecipe.Country, nextRecipe['Food Name'], 3);

    // 2. Generate full 9-part blog post
    const post = await generateRecipePost(nextRecipe, related);

    // 3. Publish to Blogger via Email-to-Post
    const pubResult = await publishToBlogger({
      title: post.title,
      htmlContent: post.htmlContent,
      foodName: nextRecipe['Food Name'],
      country: nextRecipe.Country,
    });

    // 4. Update status in CSV only if genuinely sent to Blogger
    if (!pubResult.simulated && pubResult.success) {
      markRecipePublished(nextRecipe['Food Name'], post.title);
      console.log(`✔ Marked "${nextRecipe['Food Name']}" as PUBLISHED_DRAFT in CSV.`);
      console.log(`✔ Destination: ${pubResult.destination}`);
    } else {
      console.log(`ℹ Simulation / preview mode active. Recipe was NOT sent via email and remains QUEUED.`);
    }

    // If batching, wait between posts to avoid Blogger / Google rate limits (default: 30 seconds)
    if (i < count - 1) {
      const delaySeconds = parseInt(process.env.BATCH_DELAY_SECONDS || '30', 10);
      console.log(`Waiting ${delaySeconds} seconds before next recipe to avoid spam filter rate limits...`);
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }
  }

  const updatedStats = getStats();
  console.log(`\n============================================================`);
  console.log(`Batch complete! Remaining queued recipes: ${updatedStats.queued}`);
  console.log(`============================================================\n`);
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
