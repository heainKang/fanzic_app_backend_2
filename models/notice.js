import { EntitySchema } from "typeorm";

export const Notice = new EntitySchema({
  name: "Notice",
  tableName: "notice",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    title : {
        type: String
    },
    content: {
        type: String
    },
    created_at: {
        type: Date,
        createDate: true
    }
  }
});