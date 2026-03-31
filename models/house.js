import { EntitySchema } from "typeorm";

export const House = new EntitySchema({
  name: "House",
  tableName: "house",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    user_id : {
        type: Number
    },
    name: {
        type: String
    },
    ordering: {
        type: Number
    },
    deleted_flag: {
        type: Number
    }
  }
});