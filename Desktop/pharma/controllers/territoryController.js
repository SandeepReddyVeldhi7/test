import { Territory } from "../models/index.js";


// ✅ GET Territories
export const getTerritories = async (req, res) => {
  try {
    const { companyId, employeeId } = req.query;
    console.log("companyId", companyId)
    console.log("employeeId", employeeId)
    const filter = {};
    if (companyId) filter.companyId = companyId;
    if (employeeId) filter.employeeId = employeeId;
    console.log("filter", filter)

    const territories = await Territory.find(filter)
      .select("_id area subArea")
      .lean();

    res.status(200).json({ data: territories });
  } catch (error) {
    console.error("Territory Fetch Error:", error);
    res.status(500).json({ message: "Failed to fetch territories" });
  }
};