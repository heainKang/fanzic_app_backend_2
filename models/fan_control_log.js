import { EntitySchema } from "typeorm";

export const fanControlLog = new EntitySchema({
  name: "fanControlLog",
  tableName: "fan_control_log",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    fan_id : {
        type: Number
    },
    command: {
        type: String
    },
    time_stamp: {
        type: Date,
        nullable: true
    },
    status: {
        type: String,
        nullable: true
    },
    fan_update_at: {
        type: Date,
        nullable: true
    }
  }
});