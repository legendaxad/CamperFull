import express from "express";
import { uploadmiddleWare } from "../utils/multer.js";

// Initialize Express app
const app = express();

app.post("/upload", uploadmiddleWare.single("file"), (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Convert buffer to base64
    const base64Image = file.buffer.toString("base64");

    res.status(200).json({
      message: "File uploaded successfully",
      base64Image: `data:${file.mimetype};base64,${base64Image}`,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "An error occurred while processing the file" });
  }
});
