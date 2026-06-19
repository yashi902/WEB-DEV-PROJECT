const themeToggle = document.querySelector(".theme-toggle");
const promptForm = document.querySelector(".prompt-form");
const promptBtn = document.querySelector(".prompt-btn");
const promptInput = document.querySelector(".prompt-input");
const modelSelect = document.getElementById("model-select");
const countSelect = document.getElementById("count-select");
const ratioSelect = document.getElementById("ratio-select");
const gridGallery = document.querySelector(".gallery-grid");

const API_KEY = "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";

const examplePrompts = [ /* ... your array ... */ ];

(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDarkTheme = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
    
    if (isDarkTheme) {
        document.body.classList.add("dark-theme");
        themeToggle.querySelector("i").classList.add("fa-sun");
    } else {
        themeToggle.querySelector("i").classList.add("fa-moon");
    }
})();

const toggleTheme = () => {
    const isDarkTheme = document.body.classList.toggle("dark-theme");
    localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
    const icon = themeToggle.querySelector("i");
    icon.classList.toggle("fa-sun", isDarkTheme);
    icon.classList.toggle("fa-moon", !isDarkTheme);
};

const getImageDimensions = (aspectRatio) => {
    const [widthRatio, heightRatio] = aspectRatio.split("/").map(Number);
    const baseSize = 512;
    const width = Math.round((widthRatio / (widthRatio + heightRatio)) * baseSize * 2) * 4; // better sizes
    const height = Math.round((heightRatio / (widthRatio + heightRatio)) * baseSize * 2) * 4;
    return { width, height };
};

const updateImageCard = (imgIndex, imgUrl) => {
    const imgCard = document.getElementById(`img-card-${imgIndex}`);
    if (!imgCard) return;

    imgCard.classList.remove("loading", "error");
    imgCard.innerHTML = `
        <img src="${imgUrl}" class="result-img" alt="Generated image">
        <div class="img-overlayer">
            <a href="${imgUrl}" download="${Date.now()}.png" class="img-download">
                <i class="fa-solid fa-download"></i>
            </a>
        </div>
    `;
};

const setErrorCard = (imgIndex, message = "Generation failed") => {
    const imgCard = document.getElementById(`img-card-${imgIndex}`);
    if (!imgCard) return;
    imgCard.classList.remove("loading");
    imgCard.classList.add("error");
    imgCard.innerHTML = `
        <div class="status-container">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 28px; color: #ef4444;"></i>
            <p class="status-text">${message}</p>
        </div>
    `;
};

// Updated to work with actual HF Inference API
const generateSingleImage = async (model, prompt, width, height, index) => {
    const API_URL = `https://api-inference.huggingface.co/models/${model}`;

    try {
        const response = await fetch(API_URL, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    width: width,
                    height: height,
                    // num_inference_steps: model.includes("schnell") ? 4 : 28, // optional tuning
                }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const blob = await response.blob();
        if (blob.type.startsWith("image/")) {
            const imgUrl = URL.createObjectURL(blob);
            updateImageCard(index, imgUrl);
            return imgUrl;
        } else {
            throw new Error("Invalid image response");
        }
    } catch (error) {
        console.error(`Error generating image ${index}:`, error);
        setErrorCard(index, error.message);
        return null;
    }
};

const generateImages = async (selectedModel, imageCount, aspectRatio, promptText) => {
    if (!selectedModel || !promptText) {
        alert("Please select a model and enter a prompt");
        return;
    }

    const { width, height } = getImageDimensions(aspectRatio);

    // Create loading cards
    gridGallery.innerHTML = "";
    for (let i = 0; i < imageCount; i++) {
        gridGallery.innerHTML += `
            <div class="img-card loading" id="img-card-${i}" style="aspect-ratio: ${aspectRatio.replace('/', ':')}">
                <div class="status-container">
                    <div class="spinner"></div>
                    <p class="status-text">Generating image ${i + 1}...</p>
                </div>
            </div>`;
    }

    // Generate all images (in parallel)
    const promises = [];
    for (let i = 0; i < imageCount; i++) {
        promises.push(generateSingleImage(selectedModel, promptText, width, height, i));
    }

    await Promise.all(promises);
};

const createImageCards = (selectedModel, imageCount, aspectRatio, promptText) => {
    generateImages(selectedModel, imageCount, aspectRatio, promptText);
};

const handleFormSubmit = (e) => {
    e.preventDefault();

    const selectedModel = modelSelect.value;
    const imageCount = parseInt(countSelect.value) || 1;
    const aspectRatio = ratioSelect.value || "1/1";
    const prompt = promptInput.value.trim();

    if (!prompt) {
        alert("Please enter a prompt");
        return;
    }

    createImageCards(selectedModel, imageCount, aspectRatio, prompt);
};

// Event listeners
promptBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const randomPrompt = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
    promptInput.value = randomPrompt;
    promptInput.focus();
});

promptForm.addEventListener("submit", handleFormSubmit);
themeToggle.addEventListener("click", toggleTheme);