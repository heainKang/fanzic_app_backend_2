import { EntitySchema } from "typeorm";

export const PushMessage = new EntitySchema({
  name: "PushMessage",
  tableName: "PushMessage",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    messageContent: {
        type: String
    },
    sendTime: {
        type: Date,
        createDate: true
    },
    userId: {
        type: Number
    }
  }
});