import express from "express";
import {
  getMyTodos,
  addTodo,
  updateTodo,
  deleteTodo,
} from "../controllers/todo.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getMyTodos);
router.post("/", addTodo);
router.put("/:id", updateTodo);
router.delete("/:id", deleteTodo);

export default router;
