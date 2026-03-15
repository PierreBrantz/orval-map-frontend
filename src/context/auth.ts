import axios from "axios";
import { LOCAL_DEV_IP, DEV_PORT } from "../config";

export const loginUser = async (username: string, password: string) => {
  console.log("🔹 Sending login request:", { username, password });

  const response = await axios.post(
    `http://${LOCAL_DEV_IP}:${DEV_PORT}/api/auth/login`,
    { username, password },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  console.log("✅ Backend response:", response.data);
  return response.data;
};
