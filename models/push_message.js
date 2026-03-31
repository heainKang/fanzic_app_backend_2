import { EntitySchema } from "typeorm";

export const PushMessage = new EntitySchema({
  name: "PushMessage",
  tableName: "push_message",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    message_content: {
        type: String
    },
    send_time: {
        type: Date,
        createDate: true
    },
    user_id: {
        type: Number
    }
  }
});