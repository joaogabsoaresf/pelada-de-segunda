import mongoose, { Schema, Document, Types } from "mongoose";

export type EventType = "goal" | "assist" | "note";
export type GameStatus = "pending" | "live" | "finished";

export interface IGameEvent {
  type: EventType;
  playerId?: Types.ObjectId;
  relatedPlayerId?: Types.ObjectId;
  note?: string;
  createdAt: Date;
}

export interface ITeamRef {
  id: string;
  players: Types.ObjectId[];
}

export interface IGame extends Document {
  matchDayId: Types.ObjectId;
  teamA: ITeamRef;
  teamB: ITeamRef;
  waitingList: Types.ObjectId[];
  status: GameStatus;
  startedAt?: Date;
  endedAt?: Date;
  pausedDuration: number; // total seconds accumulated from all pauses
  pausedAt?: Date;        // when the current pause started (undefined = not paused)
  events: IGameEvent[];
  createdAt: Date;
}

const GameEventSchema = new Schema<IGameEvent>(
  {
    type: { type: String, enum: ["goal", "assist", "note"], required: true },
    playerId: { type: Schema.Types.ObjectId, ref: "User" },
    relatedPlayerId: { type: Schema.Types.ObjectId, ref: "User" },
    note: { type: String },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const TeamRefSchema = new Schema<ITeamRef>(
  {
    id: { type: String, required: true },
    players: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { _id: false }
);

const GameSchema = new Schema<IGame>(
  {
    matchDayId: { type: Schema.Types.ObjectId, ref: "MatchDay", required: true },
    teamA: { type: TeamRefSchema, required: true },
    teamB: { type: TeamRefSchema, required: true },
    waitingList: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: ["pending", "live", "finished"], default: "pending" },
    startedAt: { type: Date },
    endedAt: { type: Date },
    pausedDuration: { type: Number, default: 0 },
    pausedAt: { type: Date },
    events: [GameEventSchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

GameSchema.set("toJSON", {
  transform: (_: any, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Game =
  (mongoose.models.Game as mongoose.Model<IGame>) ??
  mongoose.model<IGame>("Game", GameSchema);
