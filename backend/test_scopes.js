
import "@shopify/shopify-api/adapters/node";
import { AuthScopes } from "@shopify/shopify-api";

const sessionScopeStr = "write_orders write_products read_orders read_products";
const sessionScopes = new AuthScopes(sessionScopeStr);

const configScopeStr = "write_orders,write_products"; // As in .env
const configScopes = new AuthScopes(configScopeStr.split(","));

console.log("Session Scopes (raw):", sessionScopeStr);
console.log("Session Scopes (AuthScopes):", sessionScopes.toString());
console.log("Config Scopes (raw):", configScopeStr);
console.log("Config Scopes (AuthScopes):", configScopes.toString());

console.log("sessionScopes.has(configScopes):", sessionScopes.has(configScopes));
console.log("configScopes.has(sessionScopes):", configScopes.has(sessionScopes));
