import dotenv from "dotenv";
dotenv.config();

const listModels = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Full Data:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Fetch Error:", error.message);
    }
};

listModels();
