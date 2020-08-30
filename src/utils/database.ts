import { Document, Schema, Model, model } from "mongoose";

export interface Trade extends Document {
  name: string;
  matched: boolean;
}

export const Trade = new Schema({
  name: { type: String, required: true },
  matched: { type: Boolean, required: true },
});

const User = model<Trade>("User", Trade);
export default User;
