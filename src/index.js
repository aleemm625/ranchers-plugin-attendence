import { createRequire } from "module";
import importAsString from "@reactioncommerce/api-utils/importAsString.js";
import resolvers from "./resolvers/index.js";
const mySchema = importAsString("./schema/schema.graphql");
const require = createRequire(import.meta.url);
const pkg = require("../package.json");

async function register(app) {
  console.log("app ", app);
  await app.registerPlugin({
    label: pkg.label,
    name: pkg.name,
    version: pkg.version,
    collections: {
      RiderActivityData: {
        name: "RiderActivityData",
        schema: {
          updatedAt: {
            type: Date,
            default: Date.now,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      },
    },
    graphQL: {
      schemas: [mySchema],
      resolvers: resolvers,
    },
  });
}
export default register;
