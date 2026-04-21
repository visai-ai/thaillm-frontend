import appConfig from "@/config/appConfig";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: appConfig.apiBaseUrl,
});

export default axiosInstance;
