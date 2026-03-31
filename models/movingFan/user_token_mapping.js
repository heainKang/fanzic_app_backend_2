import { EntitySchema } from "typeorm";

export const UserTokenMapping = new EntitySchema({
  name: "UserTokenMapping",
  tableName: "UserTokenMapping",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    user_id: {
        type: Number
    },
    token_value: {
        type: String
    },
    device_type: {
        type: String
    },
    alarm_flag: {
        type: Number
    },
    created_at: {
        type: Date,
        createDate: true
    }
  }
});