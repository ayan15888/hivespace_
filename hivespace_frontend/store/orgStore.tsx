"use client";

import { useState, createContext, useContext } from "react";
import { OrgResponse } from "@/lib/api/orgs";

interface OrgContextType {
  activeOrg: OrgResponse | null;
  setActiveOrg: (org: OrgResponse) => void;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [activeOrg, setActiveOrgState] = useState<OrgResponse | null>(() => {
    if (typeof window !== "undefined") {
      const savedOrg = localStorage.getItem("activeOrg");
      if (savedOrg) {
        try {
          return JSON.parse(savedOrg);
        } catch {
          console.error("Failed to parse saved organization");
        }
      }
    }
    return null;
  });

  const setActiveOrg = (org: OrgResponse) => {
    setActiveOrgState(org);
    localStorage.setItem("activeOrg", JSON.stringify(org));
  };

  return (
    <OrgContext.Provider value={{ activeOrg, setActiveOrg }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
}
  