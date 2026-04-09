import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "urql";
import { Client, fetchExchange } from "urql";
import "./index.css";
import App from "./App.tsx";

const graphqlClient = new Client({
  url: "/graphql",
  exchanges: [fetchExchange]
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider value={graphqlClient}>
      <App />
    </Provider>
  </StrictMode>
);
