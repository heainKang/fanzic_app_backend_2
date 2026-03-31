import { EntitySchema } from "typeorm";

export const Group = new EntitySchema({
  name: "Group",
  tableName: "group",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    house_id : {
        type: Number
    },
    name: {
        type: String
    },
    motor_state: {
        type: Number
    },
    speed_level: {
        type: Number
    },
    ordering: {
        type: Number
    }
  }
});