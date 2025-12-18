import axios from "axios";

const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";

const api = axios.create({
	baseURL: isDev ? "http://localhost:3001" : window.location.origin,
	withCredentials: false,
});

export default api;
