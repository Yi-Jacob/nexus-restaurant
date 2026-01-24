import React, { useState } from "react";
import InternalInterface from "./components/InternalInterface.jsx";
import ExternalInterface from "./components/ExternalInterface.jsx";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function App() {
  const [activeTab, setActiveTab] = useState("internal");

  return (
    <div className="app">
      <header className="hero">
        <div>
          <h1>Restaurant Insights App</h1>
          <p>Internal data management + external matching with shared data.</p>
        </div>
        <div className="tab-row">
          <button
            type="button"
            className={activeTab === "internal" ? "tab active" : "tab"}
            onClick={() => setActiveTab("internal")}
          >
            Internal
          </button>
          <button
            type="button"
            className={activeTab === "external" ? "tab active" : "tab"}
            onClick={() => setActiveTab("external")}
          >
            External
          </button>
        </div>
      </header>

      <main>{activeTab === "internal" ? <InternalInterface apiBaseUrl={apiBaseUrl} /> : null}</main>
      <main>{activeTab === "external" ? <ExternalInterface apiBaseUrl={apiBaseUrl} /> : null}</main>
    </div>
  );
}
