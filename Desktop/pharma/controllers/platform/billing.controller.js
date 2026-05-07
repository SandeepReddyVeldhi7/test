import { BillingEntity } from "../../models/index.js";

// Create a new Billing Entity
export const createBillingEntity = async (req, res) => {
  try {
    const entity = new BillingEntity(req.body);
    await entity.save();
    res.status(201).json({ success: true, data: entity });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all Billing Entities
export const getBillingEntities = async (req, res) => {
  try {
    const entities = await BillingEntity.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: entities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a Billing Entity
export const updateBillingEntity = async (req, res) => {
  try {
    const { id } = req.params;
    const entity = await BillingEntity.findByIdAndUpdate(id, req.body, { new: true });
    if (!entity) {
      return res.status(404).json({ success: false, message: "Billing Entity not found" });
    }
    res.status(200).json({ success: true, data: entity });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete a Billing Entity (Soft Delete)
export const deleteBillingEntity = async (req, res) => {
  try {
    const { id } = req.params;
    const entity = await BillingEntity.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!entity) {
      return res.status(404).json({ success: false, message: "Billing Entity not found" });
    }
    res.status(200).json({ success: true, message: "Billing Entity deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
