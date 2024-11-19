import mutations from "./mutations/index.js";
import queries from "./queries/index.js";

export default {
  Mutation: {
    ...mutations,
  },
  Query: {
    ...queries,
  },
};
