import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const listModels = async () => {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // There isn't a direct listModels in the standard GenAI class in some versions, 
        // but we can try to see what's wrong by hitting an endpoint or checking documentation.
        
        // Actually, let's just try 'gemini-1.5-flash' again but maybe with a different version or just 'gemini-pro'
        // Wait, if 404, it might be the API KEY permissions or regional availability?
        
        console.log("Using API Key:", process.env.GEMINI_API_KEY ? "EXISTS" : "MISSING");
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("test");
        const response = await result.response;
        console.log("Success:", response.text());
        
    } catch (error) {
        console.error("Error Details:", error);
    }
};

listModels();
