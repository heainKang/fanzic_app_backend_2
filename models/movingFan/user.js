// src/entity/User.js
import { EntitySchema } from "typeorm";

export const User = new EntitySchema({
  name: "User",
  tableName: "User",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    token_value: {
        type: String
    },
    userID: {
        type: String
    },
    password: {
        type: String
    },
    name: {
        type: String
    },
    email: {
        type: String
    },
    address: {
        type: String
    },
    detailAddress: {
        type: String
    },
    contact: {
        type: String
    },
    creationDate: {
        type: Date,
        createDate: true
    },
    birthday: {
        type: Date
    },
    phoneNumber: {
        type: String
    },
    company: {
        type: String
    },
    companyAddress: {
        type: String
    },
    companyDetailAddress: {
        type: String
    },
    companyContact: {
        type: String
    },
    buyer: {
        type: String
    },
    buyDate: {
        type: Date
    },
    marketing_consent: {
        type: Number
    },
    device_type: {
        type: String
    },
    standard_rate: {
        type: Number
    },
    alarm_flag: {
        type: Number
    }
  }
});