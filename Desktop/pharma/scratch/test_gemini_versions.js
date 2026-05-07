import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const testModels = async () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-2.0-flash"];
    
    for (const m of models) {
        try {
            console.log(`Testing model: ${m}...`);
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("test");
            const response = await result.response;
            console.log(`✅ ${m} works:`, response.text());
            return; // Stop if one works
        } catch (error) {
            console.log(`❌ ${m} failed: ${error.message}`);
        }
    }
};

testModels();
