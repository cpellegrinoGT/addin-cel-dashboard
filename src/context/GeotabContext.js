import { createContext, useContext } from "react";

const GeotabContext = createContext(null);

export function useGeotab() {
  return useContext(GeotabContext);
}

export default GeotabContext;
