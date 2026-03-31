import { EntitySchema } from "typeorm";

export const Fan = new EntitySchema({
  name: "Fan",
  tableName: "fan",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    gate_id : {
        type: Number
    },
    name: {
        type: String
    },
    fan_id: {
        type: String
    },
    model_type: {
        type: Number
    },
    model_type_name: {
        type: String
    },
    firmware: {
        type: String
    },
    motor_state: {
        type: Number
    },
    fan_status: {
        type: String
    },
    speed_level: {
        type: Number
    },
    rpm : {
        type: String
    },
    rotation_direction: {
        type: Number
    },  
    updated_at: {
        type: Date,
        updateDate: true
    },
    created_at: {
        type: Date,
        createDate: true
    },
    deleted_flag: {
        type: Number
    }
  }
});