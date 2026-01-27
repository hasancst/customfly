
import "@shopify/shopify-api/adapters/node";
import { AuthScopes } from "@shopify/shopify-api";

const explicitArray = ['write_orders', 'write_products', 'read_orders', 'read_products'];
const scopesFromArray = new AuthScopes(explicitArray);
console.log("Input Array:", explicitArray);
console.log("Scopes from Array toString():", scopesFromArray.toString());

const explicitString = "write_orders write_products read_orders read_products";
const scopesFromString = new AuthScopes(explicitString);
console.log("Input String:", explicitString);
console.log("Scopes from String toString():", scopesFromString.toString());

console.log("Array has String?", scopesFromArray.has(scopesFromString));
console.log("String has Array?", scopesFromString.has(scopesFromArray));
