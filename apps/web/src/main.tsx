import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Client, fetchExchange, Provider } from "urql";
import "./index.css";
import App from "./App.tsx";
import { ShellErrorsProvider } from "./shell/ShellErrorsContext";

const graphqlClient = new Client({
  url: "/graphql",
  exchanges: [fetchExchange]
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Provider value={graphqlClient}>
        <ShellErrorsProvider>
          <App />
        </ShellErrorsProvider>
      </Provider>
    </BrowserRouter>
  </StrictMode>
);
