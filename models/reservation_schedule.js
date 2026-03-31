import { EntitySchema } from "typeorm";

export const reservationSchedule = new EntitySchema({
  name: "reservationSchedule",
  tableName: "reservation_schedule",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    house_id: {
        type: Number
    },
    gate_id: {
        type: Number
    },
    group_id: {
        type: Number
    },
    fan_id: {
        type: Number
    },
    days : {
        type: "json",       // ← MySQL의 JSON 타입
        nullable: false
    },
    one_day: {
        type: "date",
    },
    time: {
        type: "time"
    },
    repeat: {
        type: String
    },
    isPlaying: {
        type: String
    },
    speed_level: {
        type: Number
    },
    dir: {
        type: String
    },
    active_flag: {
        type: String
    },
    created_at: {
        type: Date,
        createDate: true
    }
  }
});