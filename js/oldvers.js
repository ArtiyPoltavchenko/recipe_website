let currentCategory = null;

document.addEventListener('DOMContentLoaded', async () => {

    const recipeDirectory = './recipes'; // Directory containing recipes
    try {
        const recipeFiles = await loadRecipes(recipeDirectory);
        displayRecipes(recipeFiles);
    } catch (error) {
        console.error('Error loading recipes:', error);
    }
});

async function loadRecipes(recipeDirectory) {
    try {
        const response = await fetch(`${recipeDirectory}/index.json`);
        if (!response.ok) {
            throw new Error(`Failed to load index.json: ${response.statusText}`);
        }
        const recipeFiles = await response.json();

        const recipes = [];
        for (const file of recipeFiles) {
            const recipeResponse = await fetch(`${recipeDirectory}/${file}`);
            if (!recipeResponse.ok) {
                console.warn(`Failed to load recipe file: ${file}`);
                continue;
            }
            const recipeMarkdown = await recipeResponse.text();
            const recipeData = parseMarkdown(recipeMarkdown);
            if (recipeData) {
                recipes.push(recipeData);
            }
        }
        return recipes;
    } catch (error) {
        console.error('Error loading recipes:', error);
        return [];
    }
}

function parseMarkdown(md) {
    try {
        const metaEndIndex = md.indexOf('---', 3) + 3;
        const metaString = md.slice(0, metaEndIndex).replace(/---/g, '').trim();
        const contentString = md.slice(metaEndIndex).trim();

        const meta = {};
        metaString.split('\n').forEach(line => {
            const [key, ...value] = line.split(':');
            if (key && value) {
                meta[key.trim()] = value.join(':').trim();
            }
        });

        // Validate required metadata
        if (!meta.title || !meta.category || !meta.image || typeof meta.date_created === 'undefined') {
            console.warn(`Recipe file is missing required metadata. 
            \n current data: title: ${meta.title}, category: ${meta.category}, image: ${meta.image}, date_created: ${typeof meta.date_created}`);
            return null;
        }

        // Process content
        const ingredientsStart = contentString.indexOf('### Ingredients');
        const instructionsStart = contentString.indexOf('### Instructions');

        const ingredients = ingredientsStart !== -1
            ? contentString.slice(ingredientsStart, instructionsStart)
                .replace('### Ingredients', '')
                .trim()
                .split('\n')
                .map(line => `<p>${line}</p>`)
                .join('')
            : '';
        const instructions = instructionsStart !== -1
            ? contentString.slice(instructionsStart)
                .replace('### Instructions', '')
                .trim()
                .split('\n')
                .map(line => `<p>${line}</p>`)
                .join('')
            : '';

        return {
            title: meta.title,
            category: meta.category,
            image: meta.image.replace(/"/g, ''),
            //video: meta.video || meta.video.trim().length !== 0 ? meta.video : null,
            video: meta.video.replace(/"/g, ''),
            date_created: meta.date_created,
            ingredients,
            instructions,
        };
    } catch (error) {
        console.error('Error parsing markdown:', error);
        return null;
    }
}

function displayRecipes(recipes) {
    const mainContent = document.querySelector('.main-content');
    const categorySidebar = document.querySelector('.left-sidebar ul');
    const titleSidebar = document.querySelector('.right-sidebar ul');

    // Clear all old data
    mainContent.innerHTML = '';
    categorySidebar.innerHTML = '';
    titleSidebar.innerHTML = '';

    const categories = new Set();

    recipes.sort((a, b) => a.title.localeCompare(b.title)).forEach(recipe => {
        categories.add(recipe.category);

        // Display recipe in the main content
        const recipeArticle = document.createElement('article');
        recipeArticle.classList.add('recipe');
        // Check for media files
        console.log(`Image path: ./recipes/images/${recipe.image}`);
        console.log(`Video path: ./recipes/videos/${recipe.video}`);

        recipeArticle.innerHTML = `
            <h2>${recipe.title}</h2>
            <img src="./recipes/images/${recipe.image}" alt="${recipe.title}">
            ${recipe.ingredients ? `<h3>Ingredients</h3><p>${recipe.ingredients}</p>` : ''}
            ${recipe.instructions ? `<h3>Instructions</h3><p>${recipe.instructions}</p>` : ''}
            ${recipe.video ? `<video src="./recipes/videos/${recipe.video}" controls></video>` : ''}
        `;
        mainContent.appendChild(recipeArticle);

        // Add to titles sidebar
        const titleItem = document.createElement('li');
        titleItem.innerHTML = `<a href="#">${recipe.title}</a>`;
        titleSidebar.appendChild(titleItem);
    });

    // Display categories in the left sidebar
    Array.from(categories).sort().forEach(category => {
        const categoryItem = document.createElement('li');
        categoryItem.innerHTML = `<a href="#">${category}</a>`;
        categorySidebar.appendChild(categoryItem);
    });
}
