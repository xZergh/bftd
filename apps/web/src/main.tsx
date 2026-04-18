import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { TamaguiProvider } from "tamagui";
import { Client, fetchExchange, Provider } from "urql";
import "./index.css";
import App from "./App.tsx";
import { ShellErrorsProvider } from "./shell/ShellErrorsContext";
import tamaguiConfig from "./tamagui.config";

const graphqlClient = new Client({
  url: "/graphql",
  exchanges: [fetchExchange]
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <BrowserRouter>
        <Provider value={graphqlClient}>
          <ShellErrorsProvider>
            <App />
          </ShellErrorsProvider>
        </Provider>
      </BrowserRouter>
    </TamaguiProvider>
  </StrictMode>
);
