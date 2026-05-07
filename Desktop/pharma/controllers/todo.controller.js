import { ToDo } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * @desc    Get all todos for the logged-in user
 * @route   GET /api/todos
 * @access  Private
 */
export const getMyTodos = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  
  const query = {
    userId: req.user._id,
  };

  if (month && year) {
    // Basic filtering by month/year in the date string (YYYY-MM-DD)
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    query.date = { $regex: new RegExp(`^${prefix}`) };
  }

  const todos = await ToDo.find(query).sort({ date: 1, time: 1 });

  res.status(200).json({
    message: "Todos fetched successfully",
    data: todos,
  });
});

/**
 * @desc    Add a new todo
 * @route   POST /api/todos
 * @access  Private
 */
export const addTodo = asyncHandler(async (req, res) => {
  const { title, date, time, type } = req.body;

  if (!title || !date || !time) {
    throw new ApiError(400, "Title, date, and time are required");
  }

  const todo = await ToDo.create({
    userId: req.user._id,
    companyId: req.user.companyId,
    title,
    date,
    time,
    type,
  });

  res.status(201).json({
    message: "Todo created successfully",
    data: todo,
  });
});

/**
 * @desc    Update a todo
 * @route   PUT /api/todos/:id
 * @access  Private
 */
export const updateTodo = asyncHandler(async (req, res) => {
  const { title, date, time, type } = req.body;
  const { id } = req.params;

  const todo = await ToDo.findOne({ _id: id, userId: req.user._id });

  if (!todo) {
    throw new ApiError(404, "Todo not found");
  }

  todo.title = title || todo.title;
  todo.date = date || todo.date;
  todo.time = time || todo.time;
  todo.type = type || todo.type;

  await todo.save();

  res.status(200).json({
    message: "Todo updated successfully",
    data: todo,
  });
});

/**
 * @desc    Delete a todo
 * @route   DELETE /api/todos/:id
 * @access  Private
 */
export const deleteTodo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const todo = await ToDo.findOne({ _id: id, userId: req.user._id });

  if (!todo) {
    throw new ApiError(404, "Todo not found");
  }

  await todo.deleteOne();

  res.status(200).json({
    message: "Todo deleted successfully",
  });
});
