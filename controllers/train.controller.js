import { pool } from "../database/pool.js";

// Helper function to get station ID from station name
const getStationId = async (station_name) => {
  const query = `SELECT station_id FROM stations WHERE station_name = $1;`;
  const result = await pool.query(query, [station_name]);
  if (result.rows.length === 0) throw new Error(`${station_name} not found`);
  return result.rows[0].station_id;
};

// Fetch train information based on from and to station names and date
const fetchTrainInfo = async (req, res) => {
  const { from_station_name, to_station_name, date } = req.body;

  try {
    if (!from_station_name || !to_station_name || !date) {
      return res.status(400).send({ error: "from_station_name, to_station_name, and date are required" });
    }

    // Get station IDs from names
    const [from_station_id, to_station_id] = await Promise.all([
      getStationId(from_station_name),
      getStationId(to_station_name),
    ]);

    // Fetch train_id and time from schedules table
    const scheduleQuery = `
      SELECT train_id, time 
      FROM schedules 
      WHERE from_station_id = $1 AND to_station_id = $2 AND date = $3;
    `;
    const scheduleResult = await pool.query(scheduleQuery, [from_station_id, to_station_id, date]);
    
    if (scheduleResult.rows.length === 0) {
      throw new Error("No trains found for the selected route and date");
    }

    const trainData = await Promise.all(scheduleResult.rows.map(async (row) => {
      const train_id = row.train_id;

      // Fetch train name by train_id from trains table
      const trainQuery = `SELECT train_name FROM trains WHERE train_id = $1;`;
      const trainResult = await pool.query(trainQuery, [train_id]);

      if (trainResult.rows.length === 0) {
        throw new Error(`Train not found for train_id: ${train_id}`);
      }

      return {
        train_id,
        train_name: trainResult.rows[0].train_name,
        time: row.time,
      };
    }));

    // Return the train information
    return res.status(200).send({
      message: "Train information retrieved successfully",
      trains: trainData,
    });

  } catch (e) {
    console.error(e.message);
    const status = e.message.includes("not found") ? 404 : 500;
    return res.status(status).send({ error: e.message || "Failed to fetch train information" });
  }
};

export { fetchTrainInfo };