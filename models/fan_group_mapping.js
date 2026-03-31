import { EntitySchema } from "typeorm";

export const fanGroupMapping = new EntitySchema({
  name: "fanGroupMapping",
  tableName: "fan_group_mapping",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    fan_id : {
        type: Number
    },
    group_id: {
        type: Number
    },
    house_id: {
        type: Number
    },
    fan_deleted: {
        type: Number
    },
    house_deleted: {
        type: Number
    }
  }
});