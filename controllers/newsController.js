import News from "../models/News.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";

// Create a new news item
export const createNews = catchAsyncErrors(async (req, res) => {
  const { title, description, image } = req.body;

  if (!title || !description || !image) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const news = await News.create({
    title,
    description,
    image,
  });

  res.status(201).json({
    success: true,
    news,
  });
});

// Get all active news items
export const getAllNews = catchAsyncErrors(async (req, res) => {
  const news = await News.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(10);

  res.status(200).json({
    success: true,
    news,
  });
});

// Get all news items (for admin)
export const getAllNewsAdmin = catchAsyncErrors(async (req, res) => {
  const news = await News.find().sort({ createdAt: -1 });
    console.log("the news are", news);
    
  res.status(200).json({
    success: true,
    news,
  });
});
export const updateNews = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const { title, description, image, isActive } = req.body;

  const news = await News.findById(id);

  if (!news) {
    return res.status(404).json({ message: "News not found" });
  }

  if (title) news.title = title;
  if (description) news.description = description;
  if (image) news.image = image;
  if (isActive !== undefined) news.isActive = isActive;

  await news.save();

  res.status(200).json({
    success: true,
    news,
  });
});

// Delete news
export const deleteNews = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;

  const news = await News.findById(id);

  if (!news) {
    return res.status(404).json({ message: "News not found" });
  }

  await News.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "News deleted successfully",
  });
});
