import { EntitySchema } from "typeorm";

export const Gate = new EntitySchema({
  name: "Gate",
  tableName: "gate",
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
    SSID: {
        type: String
    },
    wifi_name: {
        type: String
    },
    ip_adr: {
        type: String
    },
    serial_number: {
        type: String
    },
    mac_adr: {
        type: String
    },
    firmware: {
        type: String
    },
    model: {
        type: String
    },
    fan_count: {
        type: Number
    },
    created_at: {
        type: Date,
        createDate: true
    },
    deleted_flag : {
        type: Number
    }
  }
});