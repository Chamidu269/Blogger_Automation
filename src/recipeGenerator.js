import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';

let genAI = null;
if (config.gemini.apiKey) {
  genAI = new GoogleGenerativeAI(config.gemini.apiKey);
}

/**
 * Generates a complete, publication-ready food recipe article adhering to the user's 9-part template.
 * 
 * @param {Object} recipe - { Country, 'Food Name', 'Recipe Idea' }
 * @param {Array} relatedRecipes - Array of related recipe objects
 * @returns {Promise<{ title: string, htmlContent: string, markdownContent: string, imagePrompt: string }>}
 */
export async function generateRecipePost(recipe, relatedRecipes = []) {
  const foodName = recipe['Food Name'];
  const country = recipe.Country;
  const idea = recipe['Recipe Idea'];

  console.log(`[Recipe Generator] Crafting article for: "${foodName}" (${country})...`);

  if (genAI && config.gemini.apiKey) {
    try {
      return await generateWithGemini(recipe, relatedRecipes);
    } catch (err) {
      console.warn(`[Recipe Generator] Gemini generation failed (${err.message}). Using fallback generator.`);
    }
  }

  return generateWithFallback(recipe, relatedRecipes);
}

/**
 * Gemini LLM Generator following the exact 9-part structure with automatic model fallback.
 */
async function generateWithGemini(recipe, relatedRecipes) {
  const foodName = recipe['Food Name'];
  const country = recipe.Country;
  const idea = recipe['Recipe Idea'];
  const relatedNames = relatedRecipes.map(r => `${r.name} (${r.country})`).join(', ');

  const modelsToTry = [config.gemini.model, ...(config.gemini.fallbackModels || [])];
  // Remove duplicates
  const uniqueModels = [...new Set(modelsToTry)];

  const prompt = `
You are a master culinary chef and expert food blogger. Write a comprehensive, mouth-watering, authentic, and SEO-optimized food blog post for:
Dish: "${foodName}"
Origin: "${country}"
Core Recipe Concept: "${idea}"

You MUST strictly follow this EXACT 9-part template and structure:

1. Title Line:
# ${foodName} - Authentic ${country} Recipe
**Category:** ${country} | **Cuisine:** Traditional ${country} | **Difficulty:** [Easy/Medium/Intermediate]
**Prep Time:** [e.g. 20 mins] | **Cook Time:** [e.g. 40 mins] | **Serves:** [e.g. 4-6 servings]

2. Image Prompt Section:
Provide a vivid, professional photorealistic AI photography prompt for Midjourney / DALL-E / Imagen / ChatGPT. Include lighting, background, garnishes, rustic tableware, 8k resolution.
IMPORTANT: Do NOT output any <img> HTML tags or image URLs. Output ONLY the descriptive text prompt inside a blockquote so the user can easily copy and paste it into their image generator.

3. Recipe Section:
- Equipment Needed: (e.g. clay pot, blender, wok, cast iron)
- Ingredients: Exact measurements with both Metric and Imperial units.
- Step-by-Step Instructions: Numbered, detailed steps explaining visual and aromatic cues.

4. Health Benefits:
- 3 to 5 key health benefits of the core ingredients.
- Estimated Nutritional Information table: Calories, Protein, Total Fat, Carbohydrates, Dietary Fiber.

5. History Section:
- Origin story, cultural heritage, and traditional occasions (festivals, breakfast, weddings) when this dish is served in ${country}.

6. Pro Tips:
- 5 to 8 expert chef tips (secret techniques, ingredient substitutions, common mistakes to avoid).

7. Variations:
- 2 to 3 exciting alternatives (e.g., vegetarian/vegan twist, spicy version, or modern shortcut).

8. Storage/Serving:
- Storage instructions (refrigerator and freezer shelf-life).
- Best reheating methods to maintain texture.
- Best serving accompaniments, side sambols, chutneys, breads, or drinks.

9. Related Recipes:
Mention and briefly recommend these related dishes: ${relatedNames || 'traditional regional specialties'}.

10. Blogger SEO Metadata:
- Blogger Labels: 4 to 6 comma-separated tags (e.g. ${country} Recipes, Traditional ${country} Food, [Dish Type], Authentic Recipes)
- Search Description: A concise, highly engaging 140-155 character SEO meta description summarizing the recipe for Google Search.

Write in an engaging, warm, mouth-watering tone. Do not use placeholder brackets like [insert time here]; provide realistic culinary values.
`;

  let lastError = null;
  for (const modelName of uniqueModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const markdownContent = result.response.text().trim();

      // Extract the title from the first line
      const titleMatch = markdownContent.match(/^#\s+(.+)$/m);
      const postTitle = titleMatch ? titleMatch[1].trim() : `${foodName} - Traditional ${country} Recipe`;

      // Extract Image Prompt cleanly
      const promptMatch = markdownContent.match(/(?:AI Image Prompt:|Midjourney \/ DALL-E Prompt:?|Prompt:)\s*[\r\n]*>*\s*[*_`]*([^\n\r`*]+(?:\n[^\n\r#`*]+)?)/i);
      const imagePrompt = promptMatch ? promptMatch[1].replace(/[`*]/g, '').trim() : `Close up professional food photography of ${foodName} from ${country}, authentic traditional presentation, warm natural morning light, rustic tableware, 8k, award winning`;

      // Extract Labels and Search Description
      const labelsMatch = markdownContent.match(/(?:Blogger Labels|Labels|Tags):\s*([^\n\r]+)/i);
      const searchDescMatch = markdownContent.match(/(?:Search Description|Meta Description):\s*([^\n\r]+)/i);

      const labels = labelsMatch ? labelsMatch[1].replace(/[`*]/g, '').trim() : `${country} Recipes, Traditional Food, ${foodName}, Authentic Recipes`;
      const searchDesc = searchDescMatch ? searchDescMatch[1].replace(/[`*]/g, '').trim() : `Learn how to make authentic ${foodName} from ${country}. Complete recipe with step-by-step instructions, ingredients, and pro chef tips.`;

      const htmlContent = convertMarkdownToBloggerHtml(markdownContent, foodName, country, imagePrompt, labels, searchDesc);

      console.log(`[Recipe Generator] Generated successfully with model: ${modelName}`);

      return {
        title: postTitle,
        htmlContent,
        markdownContent,
        imagePrompt,
        labels,
        searchDesc,
      };
    } catch (err) {
      lastError = err;
      console.warn(`[Recipe Generator] Model ${modelName} failed (${err.message.split('\n')[0]}). Trying next model...`);
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

/**
 * Fallback generator when API key is missing or offline.
 */
function generateWithFallback(recipe, relatedRecipes) {
  const foodName = recipe['Food Name'];
  const country = recipe.Country;
  const idea = recipe['Recipe Idea'];
  const postTitle = `${foodName} - Authentic ${country} Recipe`;

  const imagePrompt = `Award-winning food photography of ${foodName} (${country}), served in authentic rustic tableware with traditional garnishes, soft cinematic lighting, 8k resolution, food magazine cover style`;

  const markdownContent = `# ${postTitle}
**Category:** ${country} | **Cuisine:** Traditional ${country} | **Difficulty:** Medium
**Prep Time:** 20 mins | **Cook Time:** 35 mins | **Serves:** 4-6 servings

---

## 📸 AI Food Photography Prompt
> **Midjourney / DALL-E Prompt:**  
> \`${imagePrompt}\`

---

## 🍽 The Recipe: ${foodName}

### Kitchen Equipment Needed:
- Heavy-bottomed cooking pan or traditional clay pot
- Wooden stirring spoon
- Measuring cups and spoons
- Serving platter

### Ingredients:
- 2 cups primary ingredient base (authentic to ${foodName})
- 1 cup rich coconut milk (or regional broth)
- 1 medium red onion, finely sliced
- 2 cloves garlic, minced
- 1 inch fresh ginger, grated
- 1 sprig fresh curry leaves or regional herbs
- 1 tsp ground turmeric
- 1 tsp roasted chili powder
- 1 tsp sea salt (adjust to taste)
- 2 tbsp cooking oil or ghee

### Step-by-Step Cooking Instructions:
1. **Preparation:** Wash and measure all fresh ingredients. Slice aromatics evenly for uniform cooking.
2. **Tempering the Aromatics:** Heat oil or ghee over medium heat. Sauté the sliced onions, garlic, ginger, and herbs until golden and fragrant (about 3 minutes).
3. **Blooming the Spices:** Add the ground turmeric and roasted spices. Cook gently for 30 seconds until the aromatic oils release into the pan.
4. **Main Cooking:** Incorporate the main ingredients and stir thoroughly to coat every piece with the spice blend.
5. **Simmering:** Pour in the coconut milk or stock. Bring to a gentle simmer, reduce heat to low, cover, and let slow-cook for 20–25 minutes until tender and rich.
6. **Finishing:** Taste and adjust seasoning with sea salt. Rest for 5 minutes before serving to allow the flavors to harmonize.

---

## 🌿 Health Benefits & Nutrition

### Key Health Benefits:
1. **Rich in Natural Antioxidants:** Traditional herbs and spices promote cellular defense and reduce inflammation.
2. **Digestive Support:** Fresh ginger, garlic, and turmeric stimulate digestion and gut wellness.
3. **Wholesome Energy:** Balanced complex carbohydrates and healthy fats provide sustained vitality without sugar crashes.

### Estimated Nutritional Information (Per Serving):
| Metric | Amount |
| :--- | :--- |
| **Calories** | 340 kcal |
| **Protein** | 12g |
| **Total Fat** | 14g |
| **Carbohydrates** | 42g |
| **Dietary Fiber** | 6g |

---

## 📜 Origin Story & Cultural Significance
${foodName} is an iconic cornerstone of ${country}'s rich gastronomic heritage. Passed down through generations, this dish is traditionally prepared during family gatherings, festive ceremonies, and harvest celebrations. The harmony of spices reflects centuries of regional trade routes and indigenous culinary mastery.

---

## 👨‍🍳 Chef's Pro Tips
1. **Fresh Spices Matter:** For unmatched depth of flavor, use freshly ground whole spices rather than pre-packaged powders.
2. **Control the Heat:** Keep the simmering temperature low to prevent coconut milk or delicate broths from separating.
3. **Rest Before Serving:** Allowing the dish to sit for 10 minutes off the heat allows the sauce to thicken and the flavors to mature.
4. **Balance the Acidity:** A touch of fresh lime juice or tamarind right at the end brightens the entire flavor profile.
5. **Adjust Consistency:** If you prefer a thicker sauce, simmer uncovered for the final 5 minutes.

---

## 🔄 Delicious Variations
- **Vegetarian / Vegan Twist:** Substitute any meat with young jackfruit, firm tofu, or hearty chickpeas.
- **Extra Spicy Version:** Add crushed bird's eye chilies or extra toasted black peppercorns during the tempering stage.
- **Quick Weeknight Shortcut:** Use pre-cooked pulses or a pressure cooker to cut the cooking time in half.

---

## 🧊 Storage & Reheating Instructions
- **Refrigeration:** Store cooled leftovers in an airtight glass container for up to 4 days.
- **Freezing:** Freeze in portioned containers for up to 2 months. Thaw overnight in the refrigerator.
- **Reheating:** Reheat gently on the stovetop over low heat with a splash of water or coconut milk to restore creaminess.
- **Best Served With:** Steamed basmati rice, warm flatbread, spicy sambol, or crisp pickles.

---

## 🔗 Related Traditional Recipes
${relatedRecipes.length > 0 ? relatedRecipes.map(r => `- **${r.name}** (${r.country}): _${r.idea}_`).join('\n') : `- Traditional ${country} regional favorites`}
`;

  const labels = `${country} Recipes, Traditional ${country} Food, ${foodName}, Easy Cooking, Authentic Recipes`;
  const searchDesc = `Learn how to make authentic ${foodName} from ${country}. Complete traditional recipe with step-by-step instructions, ingredients, and pro chef tips.`;

  const htmlContent = convertMarkdownToBloggerHtml(markdownContent, foodName, country, imagePrompt, labels, searchDesc);

  return {
    title: postTitle,
    htmlContent,
    markdownContent,
    imagePrompt,
    labels,
    searchDesc,
  };
}

/**
 * Converts structured markdown into polished, mobile-responsive HTML suitable for Blogger.
 */
function convertMarkdownToBloggerHtml(markdown, foodName, country, imagePrompt, labels = '', searchDesc = '') {
  const lines = markdown.split(/\r?\n/);
  const htmlParts = [];
  let inUl = false;
  let inOl = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      if (inTable) { htmlParts.push('</tbody></table>'); inTable = false; }
      continue;
    }

    // Markdown table row
    if (line.startsWith('|') && line.endsWith('|')) {
      if (line.includes('---')) continue; // Table separator
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (!inTable) {
        inTable = true;
        htmlParts.push('<table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">');
        htmlParts.push('<thead><tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">');
        cells.forEach(c => htmlParts.push(`<th style="padding: 10px 12px; text-align: left; color: #1e293b;">${formatInlineMarkdown(c)}</th>`));
        htmlParts.push('</tr></thead><tbody>');
      } else {
        htmlParts.push('<tr style="border-bottom: 1px solid #e2e8f0;">');
        cells.forEach(c => htmlParts.push(`<td style="padding: 8px 12px; color: #334155;">${formatInlineMarkdown(c)}</td>`));
        htmlParts.push('</tr>');
      }
      continue;
    } else if (inTable) {
      htmlParts.push('</tbody></table>');
      inTable = false;
    }

    // Headers
    if (line.startsWith('# ')) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      htmlParts.push(`<h1 style="color: #1e3a8a; font-size: 26px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 10px;">${formatInlineMarkdown(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      htmlParts.push(`<h2 style="color: #0f172a; font-size: 20px; margin-top: 28px; border-left: 4px solid #f97316; padding-left: 10px;">${formatInlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      htmlParts.push(`<h3 style="color: #334155; font-size: 16px; margin-top: 18px; margin-bottom: 8px;">${formatInlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }

    // Horizontal Rule
    if (line === '---') {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      htmlParts.push('<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">');
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      htmlParts.push(`<blockquote style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 10px 15px; margin: 15px 0; color: #475569; border-radius: 0 4px 4px 0;">${formatInlineMarkdown(line.slice(2))}</blockquote>`);
      continue;
    }

    // Unordered List
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      if (!inUl) { htmlParts.push('<ul style="padding-left: 20px; line-height: 1.6; margin: 8px 0 16px 0;">'); inUl = true; }
      htmlParts.push(`<li style="margin-bottom: 6px; color: #334155;">${formatInlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    // Ordered List
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (!inOl) { htmlParts.push('<ol style="padding-left: 20px; line-height: 1.6; margin: 8px 0 16px 0;">'); inOl = true; }
      htmlParts.push(`<li style="margin-bottom: 8px; color: #334155;">${formatInlineMarkdown(numMatch[2])}</li>`);
      continue;
    }

    // Standard Paragraph
    if (inUl) { htmlParts.push('</ul>'); inUl = false; }
    if (inOl) { htmlParts.push('</ol>'); inOl = false; }
    htmlParts.push(`<p style="color: #334155; line-height: 1.7; font-size: 15px; margin-bottom: 14px;">${formatInlineMarkdown(line)}</p>`);
  }

  if (inUl) htmlParts.push('</ul>');
  if (inOl) htmlParts.push('</ol>');
  if (inTable) htmlParts.push('</tbody></table>');

  const seoBox = (labels || searchDesc) ? `
<div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 5px solid #2563eb; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
  <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>🏷️ Blogger Labels (Tags):</strong> <code style="background: #e2e8f0; padding: 3px 6px; border-radius: 4px; color: #0f172a; font-size: 13px;">${labels}</code></p>
  <p style="margin: 0; font-size: 14px; color: #334155;"><strong>🔍 Search Description (SEO):</strong> <code style="background: #e2e8f0; padding: 3px 6px; border-radius: 4px; color: #0f172a; font-size: 13px;">${searchDesc}</code></p>
</div>
` : '';

  // Return clean, unconstrained semantic HTML without heavy outer container wrappers
  // This allows Blogger's visual editor (Compose view) to be 100% editable without locking the cursor!
  return seoBox + '\n' + htmlParts.join('\n');
}

function formatInlineMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #0284c7;">$1</code>');
}
