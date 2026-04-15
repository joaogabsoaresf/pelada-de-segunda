import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPlayerEntry {
  userId: Types.ObjectId;
  pot: number;
}

export interface ITeam {
  id: string;
  name: string;
  players: Types.ObjectId[];
}

export interface IMatchDay extends Document {
  date: Date;
  players: IPlayerEntry[];
  teams: ITeam[];
  status: "active" | "finished";
  createdAt: Date;
}

const PlayerEntrySchema = new Schema<IPlayerEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pot: { type: Number, default: 0 },
  },
  { _id: false }
);

const TeamSchema = new Schema<ITeam>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    players: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { _id: false }
);

const MatchDaySchema = new Schema<IMatchDay>(
  {
    date: { type: Date, required: true },
    players: [PlayerEntrySchema],
    teams: [TeamSchema],
    status: { type: String, enum: ["active", "finished"], default: "active" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MatchDaySchema.set("toJSON", {
  transform: (_: any, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const MatchDay =
  (mongoose.models.MatchDay as mongoose.Model<IMatchDay>) ??
  mongoose.model<IMatchDay>("MatchDay", MatchDaySchema);
