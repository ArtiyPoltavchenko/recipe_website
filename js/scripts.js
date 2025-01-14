let currentCategory = null;
const recipeDirectory = './recipes'; // main directory containing recipes

document.addEventListener('DOMContentLoaded', async () => {

    try {
        const recipeFiles = await loadRecipes(recipeDirectory);
    } catch (error) {
        console.error('Error loading recipes:', error);
    }
});


window.addEventListener('resize', changeCategoriesVisibility); // mobile version categories adjustment
window.addEventListener('load', changeCategoriesVisibility);

function changeCategoriesVisibility() { 
    const leftSidebar = document.getElementById('left-sidebar');
    const navbarCategories = document.getElementById('categories-button')
    if (window.matchMedia('(max-width: 640px)').matches) {
        leftSidebar.classList.add('hidden');
        navbarCategories.classList.remove('hidden');
    } else {
        leftSidebar.classList.remove('hidden');
        navbarCategories.classList.add('hidden');
    }
}


// changing categories bar visibility on click
document.addEventListener('click', function(event) {
    if (window.matchMedia('(max-width: 640px)').matches) {

        const leftSidebar = document.getElementById('left-sidebar');
    if (event.target.closest('#categories-button')) {
        leftSidebar.classList.remove('hidden');
        leftSidebar.classList.add('left-sidebar-mobile');
    } else {
        leftSidebar.classList.remove('left-sidebar-mobile');
        leftSidebar.classList.add('hidden');
    }

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

        // display categories
        const categories = Array.from(new Set(recipes.map(recipe => recipe.category))).sort();
        const categorySidebar = document.querySelector('.left-sidebar ul');
        categorySidebar.innerHTML = '<li><a href="#">Any Category</a></li>'; // cteate button to display All categories
        categories.forEach(category => {
            const categoryItem = document.createElement('li');
            categoryItem.innerHTML = `<a href="#">${category}</a>`;
            categorySidebar.appendChild(categoryItem);
        });

        changeCategoryFilters(recipes);
        displayRecipes(recipes);
    } catch (error) {
        console.error('Error loading recipes:', error);
        return [];
    }
}


function parseMarkdown(md) {
    try {
        //split meta data and content
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

        // metadata validation
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


        // let imageLink = meta.image.replace(/"/g, '');
        // let videoLink = meta.video.replace(/"/g, '');
        // if (!imageLink.startsWith("http")){
        //     imageLink = (recipeDirectory + "/images/" + imageLink);
        // }
        // if (!videoLink.startsWith("http")){
        //     videoLink = (recipeDirectory + "/videos/" + imageLink);
        // }

        const imageCleared = meta.image.replace(/"/g, '');
        const videoCleared = meta.video.replace(/"/g, '');
        imageLink = imageCleared.indexOf("http") === 0 ? imageCleared : (recipeDirectory + "/images/" + imageCleared);
        videoLink = videoCleared.indexOf("http") === 0 ? videoCleared : (recipeDirectory + "/videos/" + videoCleared);
        console.warn("sourse: " + videoCleared + " , result: " + videoLink);

        return {
            title: meta.title.replace(/"/g, ''),
            category: meta.category.replace(/"/g, ''),
            image: imageLink,
            //video: meta.video || meta.video.trim().length !== 0 ? meta.video : null,
            video: videoLink,
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
    const titleSidebar = document.querySelector('.right-sidebar ul');

    // cleaning before render
    mainContent.innerHTML = '';
    titleSidebar.innerHTML = '';

    recipes
        .filter(recipe => !currentCategory || recipe.category === currentCategory)
        .sort((a, b) => a.title.localeCompare(b.title))
        .forEach(recipe => {
            // create id
            const recipeId = recipe.title.replace(/\s+/g, '-').toLowerCase();

            const recipeArticle = document.createElement('article');
            recipeArticle.classList.add('recipe');
            recipeArticle.id = recipeId; // add id

            // If video from YouTube
            if (recipe.video.includes("youtube.com")) {
                recipeArticle.innerHTML = `
                <h2>${recipe.title}</h2>
                <img src="${recipe.image}" alt="${recipe.title}">
                ${recipe.ingredients ? `<h3>Ingredients</h3><p>${recipe.ingredients}</p>` : ''}
                ${recipe.instructions ? `<h3>Instructions</h3><p>${recipe.instructions}</p>` : ''}
                ${recipe.video ? `<iframe src="${recipe.video.replace("watch?v=", "embed/")}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : ''} 
            `;
            } else { // If locale video
                recipeArticle.innerHTML = `
                <h2>${recipe.title}</h2>
                <img src="${recipe.image}" alt="${recipe.title}">
                ${recipe.ingredients ? `<h3>Ingredients</h3><p>${recipe.ingredients}</p>` : ''}
                ${recipe.instructions ? `<h3>Instructions</h3><p>${recipe.instructions}</p>` : ''}
                ${recipe.video ? `<video src="${recipe.video}" controls></video>` : ''} 
            `;
            }

            mainContent.appendChild(recipeArticle);

            const titleItem = document.createElement('li');
            titleItem.innerHTML = `<a href="#${recipeId}" data-recipe-id="${recipeId}">${recipe.title}</a>`;
            titleSidebar.appendChild(titleItem);
            console.log("id : " + recipeId);
        });

    scrollToRecipe();
}



function changeCategoryFilters(recipes) {
    const categorySidebar = document.querySelector('.left-sidebar ul');

    categorySidebar.addEventListener('click', event => {
        if (event.target.tagName === 'A') {
            const selectedCategory = event.target.textContent;
            currentCategory = selectedCategory === 'Any Category' ? null : selectedCategory; // null - All
            console.log("Category changed to: " + currentCategory);
            displayRecipes(recipes); // dispay filtrated
        }
    });
}





function scrollToRecipe() {
    const titleSidebar = document.querySelector('.right-sidebar ul');

    titleSidebar.addEventListener('click', event => {
        if (event.target.tagName === 'A') {
            event.preventDefault();
            const recipeId = event.target.getAttribute('data-recipe-id');
            const recipeElement = document.getElementById(recipeId);

            console.log("scrolling to : " + recipeId);

            if (recipeElement) {
                recipeElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }
        }
    });
}


