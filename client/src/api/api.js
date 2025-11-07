import axios from "axios";

const api = axios.create({
  baseURL: "/api", // <-- NGINX will proxy this to node-server:8081
});

export const postURL = (input) => api.post("/url", { OriginalUrl: input });

export default { postURL };
