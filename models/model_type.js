import { EntitySchema } from "typeorm";

export const ModelType = new EntitySchema({
  name: "ModelType",
  tableName: "model_type",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    name : {
        type: String
    },
    SPDHi: {
        type: String
    },
    SPDLo: {
        type: String
    },
    low_speed: {
        type: Number
    },
    middle_speed: {
        type: Number
    },
    high_speed: {
        type: Number
    },
    turbo_speed: {
        type: Number
    }
  }
});