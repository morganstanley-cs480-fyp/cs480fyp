import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    languageOptions: { 
      globals: {
        ...globals.node, // Tells ESLint "I am running in Node.js" (fixes 'process is not defined')
        ...globals.jest  // Tells ESLint "I am using Jest" (fixes 'describe is not defined')
      } 
    }
  },
  pluginJs.configs.recommended,
];