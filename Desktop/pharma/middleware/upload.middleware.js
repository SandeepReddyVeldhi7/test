



import multer from "multer";
import path from "path";
import fs from "fs";

export const createUploader = (folder = "general") => {
  const uploadPath = `public/uploads/${folder}`;

  // create folder if not exists
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const uniqueName =
        Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueName + path.extname(file.originalname));
    }
  });

  return multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }
  });
};


