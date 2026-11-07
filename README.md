# 🍳 Automated Food Recipe Blogger Publisher (Email-to-Post)

An automated AI publishing pipeline that reads recipes from your spreadsheet, writes full, SEO-optimized food blog articles following your exact 9-part template, generates AI food photography, and dispatches them directly into **Blogger Drafts** using Blogger's built-in **Email-to-Post** feature.

---

## 🎯 How It Works

```
data/recipes.csv (93 Global Recipes)
       │
       ▼
[Recipe Orchestrator] (csvManager.js)
       ├── Picks the next QUEUED dish (e.g. Kiribath, Rogan Josh, Peking Duck)
       └── Finds related recipes for cross-linking
       │
       ▼
[AI Recipe Writer] (Gemini AI + Template Engine)
       ├── Generates the complete 9-part blog article
       ├── Generates Midjourney/DALL-E prompt
       └── Generates & embeds a live AI food photograph via URL
       │
       ▼
[Blogger Email Dispatcher] (Nodemailer)
       ├── Sends email to: username.secretword@blogger.com
       └── Blogger automatically saves it as a DRAFT in your dashboard!
       │
       ▼
CSV updated: Status = PUBLISHED_DRAFT (with date & post title)
```

---

## 📋 The 9-Part Article Structure Generated

Every article generated follows your exact template:
1. **Title Line**: `# [Dish Name] - Authentic [Country] Recipe` with Category, Cuisine, Difficulty, Prep Time, Cook Time, Servings.
2. **Image Prompt Section**: Professional photography prompt + **automatically embedded AI food hero image**.
3. **Recipe Section**: Kitchen equipment, detailed ingredient list (metric & imperial), and numbered step-by-step instructions.
4. **Health Benefits**: 3–5 key wellness benefits + Nutritional Facts Table (Calories, Protein, Fat, Carbs, Fiber).
5. **History Section**: Origin story, heritage, and traditional festivals/occasions in the native country.
6. **Pro Tips**: 5–8 expert culinary secrets, temperature guides, and mistakes to avoid.
7. **Variations**: 2–3 alternatives (e.g., Vegetarian/Vegan twist, Spicy version, Quick weeknight hack).
8. **Storage/Serving**: Fridge & freezer duration, best reheating methods, and traditional side dishes/accompaniments.
9. **Related Recipes**: Cross-links to other recipes from your spreadsheet!

---

## ⚙️ 2-Minute Blogger Setup (Post using email)

### Step 1: Enable "Post using email" in Blogger
1. Go to your [Blogger Dashboard](https://www.blogger.com).
2. Click **Settings** in the left sidebar.
3. Scroll down to the **Email** section.
4. Click **Post using email**:
   - Choose: **Save emails as draft post** (so you can review before publishing live!).
   - Set a secret word (e.g. `secret123`).
   - Your secret email will look like: `myfoodblog.secret123@blogger.com`.
   - Click **Save**.

### Step 2: Get a Gmail App Password
Because the automation sends the email on your behalf:
1. Go to your [Google Account Security](https://myaccount.google.com/security).
2. Ensure **2-Step Verification** is ON.
3. Open [App Passwords](https://myaccount.google.com/apppasswords).
4. Create an App Password named `Blogger Publisher`.
5. Copy the 16-character code (e.g., `abcd efgh ijkl mnop`).

---

## 🚀 Configuration & Usage

### 1. Set up `.env`
```powershell
cd "d:\my projects\AI mobile app\blogger-recipe-automation"
cp .env.example .env
```

Open `.env` and fill in:
```env
GEMINI_API_KEY=your_gemini_api_key_here
BLOGGER_SECRET_EMAIL=myfoodblog.secret123@blogger.com

EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_character_app_password

# Set to false to publish live drafts to Blogger!
SIMULATION_MODE=false
```

---

### 2. Available Commands

| Command | Action |
| :--- | :--- |
| `npm run preview` | Generates a sample recipe and opens the HTML in `output/` without publishing or updating CSV. |
| `npm start` | Publishes the **next single recipe** from `recipes.csv` to Blogger Drafts. |
| `npm run batch` | Publishes a batch of **5 recipes** consecutively with safety delays. |
| `node src/index.js --status` | Shows how many recipes are queued vs published. |

---

## 🖼 Automated Food Image Generation
The automation includes automated food image generation using dynamic culinary prompts.
Each generated post embeds a photo:
```html
<img src="https://image.pollinations.ai/prompt/appetizing%20food%20photography%20of%20Kiribath..."/>
```
This means when the post lands in your Blogger Drafts, it already has an eye-catching food image at the top!
