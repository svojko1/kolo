// pages/api/analyze-image.js
import formidable from "formidable";
import { promises as fs } from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      keepExtensions: true,
      multiples: false,
    });

    const [_, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Get the first file
    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!file) {
      throw new Error("No image file provided");
    }

    // Read the file
    const imageBuffer = await fs.readFile(file.filepath);
    const base64Image = imageBuffer.toString("base64");

    // Clean up: remove the temporary file
    await fs.unlink(file.filepath);

    // Call Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: "LABEL_DETECTION",
                  maxResults: 10,
                },
                {
                  type: "TEXT_DETECTION",
                  maxResults: 10,
                },
                {
                  type: "OBJECT_LOCALIZATION",
                  maxResults: 10,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorData = await visionResponse.json();
      console.error("Vision API Error:", errorData);
      throw new Error(errorData.error?.message || "Failed to analyze image");
    }

    const data = await visionResponse.json();
    return res.status(200).json(data.responses[0]);
  } catch (error) {
    console.error("API Error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to process image" });
  }
}
